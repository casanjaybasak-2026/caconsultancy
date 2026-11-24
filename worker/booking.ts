import type { Env } from './env';
import { json } from './http';
import { createOrder, fetchPayment, capturePayment, feePaise, verifyCheckoutSignature, verifyWebhookSignature } from './razorpay';
import { insertPendingBooking, markPaid, markFailed, getByOrder, insertEnquiry } from './db';
import { sendBookingEmails, sendEnquiryEmail, bookingRef } from './email';
import { notifyOwner, waLink } from './notify';

export const CLIENT_TYPES = ['Individual', 'Professional', 'MSME / Startup', 'Business / Company'] as const;
export const COMM_METHODS = ['Phone Call', 'Video Call', 'WhatsApp', 'In-person', 'Email'] as const;

export interface BookingInput {
  name: string;
  email: string;
  phone: string;
  client_type: string;
  service: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  communication_method: string;
  description: string | null;
}

type Validation = { ok: true; value: BookingInput } | { ok: false; errors: Record<string, string> };

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const todayIST = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);

export function validateBookingInput(body: unknown): Validation {
  const b = (body ?? {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};
  if (str(b.website)) return { ok: false, errors: { form: 'Unable to submit this form.' } };

  const name = str(b.name, 100);
  const email = str(b.email, 200);
  const phoneDigits = str(b.phone, 20).replace(/[\s\-()]/g, '').replace(/^(\+91|91|0)(?=\d{10}$)/, '');
  const preferred_date = str(b.preferred_date, 10) || null;
  const description = str(b.description, 2000) || null;

  if (name.length < 2) errors.name = 'Please enter your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Please enter a valid email address.';
  if (!/^[6-9]\d{9}$/.test(phoneDigits)) errors.phone = 'Please enter a valid 10-digit mobile number.';
  if (preferred_date && (!/^\d{4}-\d{2}-\d{2}$/.test(preferred_date) || preferred_date < todayIST()))
    errors.preferred_date = 'Please choose today or a future date.';
  if (typeof b.description === 'string' && b.description.trim().length > 2000) errors.description = 'Please keep this under 2000 characters.';

  const client_type = (CLIENT_TYPES as readonly string[]).includes(str(b.client_type)) ? str(b.client_type) : CLIENT_TYPES[0];
  const communication_method = (COMM_METHODS as readonly string[]).includes(str(b.communication_method)) ? str(b.communication_method) : COMM_METHODS[0];

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name, email, phone: '+91' + phoneDigits, client_type,
      service: str(b.service, 100) || null,
      preferred_date,
      preferred_time: str(b.preferred_time, 20) || null,
      communication_method, description,
    },
  };
}

async function readJson(req: Request): Promise<unknown> {
  try { return await req.json(); } catch { return null; }
}

export async function handleOrder(req: Request, env: Env): Promise<Response> {
  const v = validateBookingInput(await readJson(req));
  if (!v.ok) return json({ errors: v.errors }, 400);

  const receipt = 'appt_' + crypto.randomUUID().slice(0, 12);
  const order = await createOrder(env, { receipt, notes: { purpose: 'Consultation booking', name: v.value.name, email: v.value.email } });
  const booking = await insertPendingBooking(env, v.value, order.id, order.amount);
  return json({
    order_id: order.id,
    key_id: env.RAZORPAY_KEY_ID,
    amount: order.amount,
    currency: 'INR',
    booking_id: booking.id,
    prefill: { name: v.value.name, email: v.value.email, contact: v.value.phone },
  });
}

/** Confirms a payment with Razorpay, captures if needed, marks paid once and emails once. */
async function settle(env: Env, orderId: string, paymentId: string): Promise<{ ok: true; ref: string } | { ok: false; error: string }> {
  const payment = await fetchPayment(env, paymentId);
  if (payment.order_id !== orderId) return { ok: false, error: 'Payment does not match this booking.' };
  if (payment.amount !== feePaise(env) || payment.currency !== 'INR') return { ok: false, error: 'Payment amount mismatch.' };
  if (payment.status === 'authorized') await capturePayment(env, paymentId, payment.amount);
  else if (payment.status !== 'captured') return { ok: false, error: `Payment not completed (${payment.status}).` };

  const result = await markPaid(env, orderId, paymentId);
  if (result.changed) {
    const b = result.booking;
    const ref = bookingRef(b.id);
    await Promise.all([
      sendBookingEmails(env, b, paymentId),
      notifyOwner(env, `✅ New paid booking ${ref}\n${b.name} · ${b.phone}\n${b.service ?? 'Service not specified'}\nPreferred: ${b.preferred_date ?? '-'} ${b.preferred_time ?? ''} (${b.communication_method})\nWhatsApp client: ${waLink(b.phone)}\nAll bookings: ${env.SITE_URL}/manage`),
    ]);
    return { ok: true, ref };
  }
  const existing = await getByOrder(env, orderId);
  if (!existing) return { ok: false, error: 'Booking not found.' };
  return { ok: true, ref: bookingRef(existing.id) };
}

export async function handleVerify(req: Request, env: Env): Promise<Response> {
  const b = ((await readJson(req)) ?? {}) as Record<string, unknown>;
  const orderId = str(b.razorpay_order_id, 64);
  const paymentId = str(b.razorpay_payment_id, 64);
  const signature = str(b.razorpay_signature, 128);
  if (!(await verifyCheckoutSignature(orderId, paymentId, signature, env.RAZORPAY_KEY_SECRET)))
    return json({ error: 'Payment verification failed.' }, 400);
  const r = await settle(env, orderId, paymentId);
  return r.ok ? json({ ref: r.ref }) : json({ error: r.error }, 400);
}

export async function handleWebhook(req: Request, env: Env): Promise<Response> {
  const raw = await req.text();
  const sig = req.headers.get('x-razorpay-signature') ?? '';
  if (!(await verifyWebhookSignature(raw, sig, env.RAZORPAY_WEBHOOK_SECRET))) return json({ error: 'Invalid signature' }, 401);

  const evt = JSON.parse(raw) as { event: string; payload: any };
  const payment = evt.payload?.payment?.entity;
  const orderId: string | undefined = payment?.order_id ?? evt.payload?.order?.entity?.id;
  if (!orderId) return json({ ok: true });

  if (evt.event === 'payment.captured' || evt.event === 'order.paid') {
    if (payment?.id) await settle(env, orderId, payment.id);
  } else if (evt.event === 'payment.failed') {
    await markFailed(env, orderId);
  }
  return json({ ok: true });
}

export function validateEnquiry(body: unknown): { ok: true; value: { name: string; email: string; phone: string; service: string | null; message: string } } | { ok: false; errors: Record<string, string> } {
  const b = (body ?? {}) as Record<string, unknown>;
  if (str(b.website)) return { ok: false, errors: { form: 'Unable to submit this form.' } };
  const errors: Record<string, string> = {};
  const name = str(b.name, 100), email = str(b.email, 200), phone = str(b.phone, 20), message = str(b.message, 1000);
  if (name.length < 2) errors.name = 'Please enter your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Please enter a valid email address.';
  if (!/^[0-9+\-\s()]{7,15}$/.test(phone)) errors.phone = 'Please enter a valid mobile number.';
  if (message.length < 5) errors.message = 'Please enter a message.';
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name, email, phone, service: str(b.service, 100) || null, message } };
}

export async function handleEnquiry(req: Request, env: Env): Promise<Response> {
  const v = validateEnquiry(await readJson(req));
  if (!v.ok) return json({ errors: v.errors }, 400);
  const e = await insertEnquiry(env, v.value);
  await Promise.all([
    sendEnquiryEmail(env, e),
    notifyOwner(env, `📩 New enquiry from ${e.name} · ${e.phone}\nWhatsApp: ${waLink(e.phone.startsWith('+') ? e.phone : '+91' + e.phone.replace(/\D/g, '').slice(-10))}\n${e.service ?? ''}\n${e.message.slice(0, 300)}\nAll enquiries: ${env.SITE_URL}/manage`),
  ]);
  return json({ ok: true });
}
