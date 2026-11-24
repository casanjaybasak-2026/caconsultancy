import type { Env } from './env';
import type { AppointmentRow } from './supabase';

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export const bookingRef = (id: string) => 'SKB-' + id.replace(/-/g, '').slice(0, 8).toUpperCase();

function detailsTable(a: AppointmentRow, paymentId: string) {
  const rows: [string, unknown][] = [
    ['Booking reference', bookingRef(a.id)],
    ['Amount paid', '₹1,000 (incl. GST)'],
    ['Razorpay payment ID', paymentId],
    ['Name', a.name], ['Email', a.email], ['Phone', a.phone],
    ['Client type', a.client_type], ['Service', a.service ?? '—'],
    ['Preferred date', a.preferred_date ?? '—'], ['Preferred time', a.preferred_time ?? '—'],
    ['Mode', a.communication_method], ['Requirement', a.description ?? '—'],
  ];
  return `<table cellpadding="6" style="border-collapse:collapse;font:14px/1.5 Arial,sans-serif;color:#3a4453">${rows
    .map(([k, v]) => `<tr><td style="color:#6b7280;border-bottom:1px solid #e2ded2">${esc(k)}</td><td style="border-bottom:1px solid #e2ded2"><strong>${esc(v)}</strong></td></tr>`)
    .join('')}</table>`;
}

async function send(env: Env, to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `CA S K Basak <${env.BOOKING_FROM_EMAIL}>`, to: [to], subject, html, reply_to: env.OWNER_EMAIL }),
  });
  if (!res.ok) console.error('resend failed', res.status, await res.text());
}

/** Sends the client receipt and the owner notification. Never throws. */
export async function sendBookingEmails(env: Env, a: AppointmentRow, paymentId: string): Promise<void> {
  const ref = bookingRef(a.id);
  const table = detailsTable(a, paymentId);
  const wrap = (inner: string) => `<div style="max-width:560px;margin:auto;font:15px/1.6 Arial,sans-serif;color:#0f2545">${inner}</div>`;
  try {
    await send(env, a.email, `Booking received – ${ref}`, wrap(
      `<h2 style="font-family:Georgia,serif">Thank you, ${esc(a.name)}</h2>
       <p>Your consultation fee has been received. We'll confirm your slot and send a Google Meet link within 1 working day.</p>
       ${table}
       <p style="margin-top:24px">Regards,<br>CA S K Basak<br><a href="${esc(env.SITE_URL)}">${esc(env.SITE_URL)}</a></p>`));
    if (env.OWNER_EMAIL) {
      await send(env, env.OWNER_EMAIL, `New paid booking ${ref} – ${a.name}`, wrap(
        `<h2>New paid consultation booking</h2>${table}
         <p><a href="${esc(env.SITE_URL)}/admin/appointments">Open appointments in admin</a></p>`));
    }
  } catch (err) {
    console.error('email error', err);
  }
}
