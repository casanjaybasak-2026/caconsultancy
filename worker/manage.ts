import type { Env } from './env';
import { verifyAccess } from './access';
import { listBookings, listEnquiries, type BookingRow, type EnquiryRow } from './db';
import { esc, bookingRef } from './email';
import { waLink } from './whatsapp';

const HEADERS = { 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow', 'x-frame-options': 'DENY', 'referrer-policy': 'no-referrer' };
const STATUSES = ['paid', 'pending', 'failed'] as const;

const ist = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) : '—');

function csv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const cell = (v: unknown) => {
    let s = String(v ?? '');
    if (/^[=+\-@]/.test(s)) s = "'" + s; // avoid spreadsheet formula injection
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n');
}

const bookingRow = (b: BookingRow) => `<tr>
  <td><strong>${esc(bookingRef(b.id))}</strong><br><span class="muted">${esc(ist(b.created_at))}</span></td>
  <td><span class="pill ${esc(b.payment_status)}">${esc(b.payment_status)}</span>${b.paid_at ? `<br><span class="muted">${esc(ist(b.paid_at))}</span>` : ''}</td>
  <td>${esc(b.name)}<br><a href="mailto:${esc(b.email)}">${esc(b.email)}</a><br><a href="tel:${esc(b.phone)}">${esc(b.phone)}</a> · <a href="${esc(waLink(b.phone))}" target="_blank" rel="noopener">WhatsApp</a></td>
  <td>${esc(b.service ?? '—')}<br><span class="muted">${esc(b.client_type)}</span></td>
  <td>${esc(b.preferred_date ?? '—')} ${esc(b.preferred_time ?? '')}<br><span class="muted">${esc(b.communication_method)}</span></td>
  <td class="desc">${esc(b.description ?? '')}</td>
  <td class="muted mono">${esc(b.razorpay_payment_id ?? '')}</td>
</tr>`;

const enquiryRow = (e: EnquiryRow) => `<tr>
  <td>${esc(ist(e.created_at))}</td>
  <td>${esc(e.name)}<br><a href="mailto:${esc(e.email)}">${esc(e.email)}</a><br><a href="tel:${esc(e.phone)}">${esc(e.phone)}</a></td>
  <td>${esc(e.service ?? '—')}</td>
  <td class="desc">${esc(e.message)}</td>
</tr>`;

function page(user: string, view: string, status: string | null, body: string, counts: string) {
  const tab = (href: string, label: string, active: boolean) => `<a href="${href}" class="${active ? 'on' : ''}">${label}</a>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Bookings · CA S K Basak</title>
<style>
body{margin:0;font:14px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;background:#fcfbf8;color:#1f2937}
header{background:#0f2545;color:#fcfbf8;padding:16px 24px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}
header h1{font:600 18px Georgia,serif;margin:0} header span{opacity:.75;font-size:13px}
nav{display:flex;gap:6px;flex-wrap:wrap;padding:16px 24px 0} nav a{padding:8px 14px;border-radius:999px;border:1px solid #e2ded2;color:#0f2545;text-decoration:none;background:#fff}
nav a.on{background:#0f2545;color:#fff;border-color:#0f2545} .tools{margin-left:auto}
main{padding:16px 24px 48px;overflow-x:auto} table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e2ded2;border-radius:12px;min-width:900px}
th,td{padding:10px 12px;border-bottom:1px solid #ece9df;text-align:left;vertical-align:top} th{background:#f4f2ec;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#3a4453}
a{color:#1d4e7a} .muted{color:#5b6474;font-size:12px} .mono{font-family:ui-monospace,monospace} .desc{max-width:320px;white-space:pre-wrap}
.pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600;text-transform:capitalize} .paid{background:#e6f2ec;color:#2f6b4f} .pending{background:#fbf3e0;color:#7d5f1f} .failed{background:#f8e6e6;color:#a4373a}
.empty{padding:40px;text-align:center;color:#5b6474;background:#fff;border:1px dashed #e2ded2;border-radius:12px}
</style></head><body>
<header><h1>CA S K Basak · Bookings &amp; enquiries</h1><span>Signed in as ${esc(user)} · ${counts}</span></header>
<nav>
${tab('/manage', 'All bookings', view === 'bookings' && !status)}
${STATUSES.map((s) => tab(`/manage?status=${s}`, s[0].toUpperCase() + s.slice(1), status === s)).join('')}
${tab('/manage?view=enquiries', 'Enquiries', view === 'enquiries')}
<a class="tools" href="/manage?${view === 'enquiries' ? 'view=enquiries&' : status ? `status=${status}&` : ''}format=csv">Download CSV</a>
</nav><main>${body}</main></body></html>`;
}

export async function handleManage(req: Request, env: Env): Promise<Response> {
  const auth = await verifyAccess(req, env);
  if (!auth.ok) return new Response(`Forbidden: ${auth.reason}`, { status: 403, headers: { ...HEADERS, 'content-type': 'text/plain' } });

  const url = new URL(req.url);
  const view = url.searchParams.get('view') === 'enquiries' ? 'enquiries' : 'bookings';
  const s = url.searchParams.get('status');
  const status = (STATUSES as readonly string[]).includes(s ?? '') ? s : null;

  if (view === 'enquiries') {
    const rows = await listEnquiries(env);
    if (url.searchParams.get('format') === 'csv')
      return new Response(csv(rows as any), { headers: { ...HEADERS, 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="enquiries.csv"' } });
    const body = rows.length ? `<table><thead><tr><th>Received</th><th>Contact</th><th>Service</th><th>Message</th></tr></thead><tbody>${rows.map(enquiryRow).join('')}</tbody></table>` : '<p class="empty">No enquiries yet.</p>';
    return new Response(page(auth.email, view, null, body, `${rows.length} enquiries`), { headers: { ...HEADERS, 'content-type': 'text/html; charset=utf-8' } });
  }

  const rows = await listBookings(env, status);
  if (url.searchParams.get('format') === 'csv')
    return new Response(csv(rows as any), { headers: { ...HEADERS, 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="bookings.csv"' } });
  const paid = rows.filter((r) => r.payment_status === 'paid').length;
  const body = rows.length
    ? `<table><thead><tr><th>Ref / created</th><th>Payment</th><th>Client</th><th>Service</th><th>Preferred slot</th><th>Requirement</th><th>Payment ID</th></tr></thead><tbody>${rows.map(bookingRow).join('')}</tbody></table>`
    : '<p class="empty">No bookings yet.</p>';
  return new Response(page(auth.email, view, status, body, `${rows.length} shown · ${paid} paid`), { headers: { ...HEADERS, 'content-type': 'text/html; charset=utf-8' } });
}
