import type { Env } from './env';
import type { BookingInput } from './booking';

export interface BookingRow extends BookingInput {
  id: string;
  created_at: string;
  payment_status: 'pending' | 'paid' | 'failed';
  amount_paise: number;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  paid_at: string | null;
}

export interface EnquiryInput { name: string; email: string; phone: string; service: string | null; message: string }
export interface EnquiryRow extends EnquiryInput { id: string; created_at: string }

export async function insertPendingBooking(env: Env, input: BookingInput, orderId: string, amountPaise: number): Promise<{ id: string }> {
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO bookings (id, name, email, phone, client_type, service, preferred_date, preferred_time, communication_method, description, payment_status, amount_paise, razorpay_order_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
  )
    .bind(id, input.name, input.email, input.phone, input.client_type, input.service, input.preferred_date, input.preferred_time, input.communication_method, input.description, amountPaise, orderId)
    .run();
  return { id };
}

/** Marks the booking paid exactly once (atomic conditional update). `changed` is false if it was already paid. */
export async function markPaid(env: Env, orderId: string, paymentId: string) {
  const row = await env.DB.prepare(
    `UPDATE bookings SET payment_status = 'paid', razorpay_payment_id = ?, paid_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE razorpay_order_id = ? AND payment_status <> 'paid' RETURNING *`,
  )
    .bind(paymentId, orderId)
    .first<BookingRow>();
  return row ? { changed: true as const, booking: row } : { changed: false as const };
}

export const getByOrder = (env: Env, orderId: string) =>
  env.DB.prepare('SELECT * FROM bookings WHERE razorpay_order_id = ?').bind(orderId).first<BookingRow>();

/** Never downgrades a paid booking. */
export async function markFailed(env: Env, orderId: string): Promise<void> {
  await env.DB.prepare(`UPDATE bookings SET payment_status = 'failed' WHERE razorpay_order_id = ? AND payment_status <> 'paid'`).bind(orderId).run();
}

export async function insertEnquiry(env: Env, e: EnquiryInput): Promise<EnquiryRow> {
  const id = crypto.randomUUID();
  const row = await env.DB.prepare('INSERT INTO enquiries (id, name, email, phone, service, message) VALUES (?, ?, ?, ?, ?, ?) RETURNING *')
    .bind(id, e.name, e.email, e.phone, e.service, e.message)
    .first<EnquiryRow>();
  return row!;
}

export async function listBookings(env: Env, status: string | null, limit = 200): Promise<BookingRow[]> {
  const q = status
    ? env.DB.prepare('SELECT * FROM bookings WHERE payment_status = ? ORDER BY created_at DESC LIMIT ?').bind(status, limit)
    : env.DB.prepare('SELECT * FROM bookings ORDER BY created_at DESC LIMIT ?').bind(limit);
  return (await q.all<BookingRow>()).results;
}

export async function listEnquiries(env: Env, limit = 200): Promise<EnquiryRow[]> {
  return (await env.DB.prepare('SELECT * FROM enquiries ORDER BY created_at DESC LIMIT ?').bind(limit).all<EnquiryRow>()).results;
}
