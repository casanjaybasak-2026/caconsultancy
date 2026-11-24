import type { Env } from './env';
import type { BookingRow, EnquiryRow } from './db';

export const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export const bookingRef = (id: string) => 'SKB-' + id.replace(/-/g, '').slice(0, 8).toUpperCase();

const table = (rows: [string, unknown][]) =>
  `<table cellpadding="6" style="border-collapse:collapse;font:14px/1.5 Arial,sans-serif;color:#3a4453">${rows
    .map(([k, v]) => `<tr><td style="color:#6b7280;border-bottom:1px solid #e2ded2">${esc(k)}</td><td style="border-bottom:1px solid #e2ded2"><strong>${esc(v)}</strong></td></tr>`)
    .join('')}</table>`;

const wrap = (inner: string) => `<div style="max-width:560px;margin:auto;font:15px/1.6 Arial,sans-serif;color:#0f2545">${inner}</div>`;

function bookingDetails(b: BookingRow, paymentId: string) {
  return table([
    ['Booking reference', bookingRef(b.id)],
    ['Amount paid', '₹1,000 (incl. GST)'],
    ['Razorpay payment ID', paymentId],
    ['Name', b.name], ['Email', b.email], ['Phone', b.phone],
    ['Client type', b.client_type], ['Service', b.service ?? '—'],
    ['Preferred date', b.preferred_date ?? '—'], ['Preferred time', b.preferred_time ?? '—'],
    ['Mode', b.communication_method], ['Requirement', b.description ?? '—'],
  ]);
}

/** Sends through Resend. Replies go to BOOKING_FROM_EMAIL, which Cloudflare Email Routing forwards to the owner. */
async function send(env: Env, to: string, subject: string, html: string, replyTo = env.BOOKING_FROM_EMAIL) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `CA S K Basak <${env.BOOKING_FROM_EMAIL}>`, to: [to], subject, html, reply_to: replyTo }),
  });
  if (!res.ok) console.error('resend failed', res.status, await res.text());
}

/** Client receipt + owner notification. Never throws. */
export async function sendBookingEmails(env: Env, b: BookingRow, paymentId: string): Promise<void> {
  const ref = bookingRef(b.id);
  const details = bookingDetails(b, paymentId);
  try {
    await send(env, b.email, `Booking received – ${ref}`, wrap(
      `<h2 style="font-family:Georgia,serif">Thank you, ${esc(b.name)}</h2>
       <p>Your consultation fee has been received. We'll confirm your slot and send a Google Meet link within 1 working day.</p>
       ${details}
       <p>Need to change something? Just reply to this email and quote <strong>${ref}</strong>.</p>
       <p style="margin-top:24px">Regards,<br>CA S K Basak<br><a href="${esc(env.SITE_URL)}">${esc(env.SITE_URL)}</a></p>`));
    if (env.OWNER_EMAIL) {
      await send(env, env.OWNER_EMAIL, `New paid booking ${ref} – ${b.name}`, wrap(
        `<h2>New paid consultation booking</h2>${details}
         <p><a href="${esc(env.SITE_URL)}/manage">Open all bookings</a></p>`), b.email);
    }
  } catch (err) {
    console.error('email error', err);
  }
}

/** Owner notification for a contact-form enquiry (reply goes straight to the client). Never throws. */
export async function sendEnquiryEmail(env: Env, e: EnquiryRow): Promise<void> {
  if (!env.OWNER_EMAIL) return;
  try {
    await send(env, env.OWNER_EMAIL, `New enquiry – ${e.name}`, wrap(
      `<h2>New website enquiry</h2>${table([['Name', e.name], ['Email', e.email], ['Phone', e.phone], ['Service', e.service ?? '—'], ['Message', e.message]])}
       <p><a href="${esc(env.SITE_URL)}/manage">Open all enquiries</a></p>`), e.email);
  } catch (err) {
    console.error('email error', err);
  }
}
