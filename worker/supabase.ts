import type { Env } from './env';
import type { BookingInput } from './booking';

export interface AppointmentRow extends BookingInput {
  id: string;
  payment_status: string;
  amount_paise: number | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  paid_at: string | null;
}

async function sb<T>(env: Env, path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Supabase ${path} ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

export async function insertPendingAppointment(env: Env, input: BookingInput, orderId: string, amountPaise: number) {
  const rows = await sb<AppointmentRow[]>(env, 'appointments', {
    method: 'POST',
    body: JSON.stringify({ ...input, payment_status: 'pending', amount_paise: amountPaise, razorpay_order_id: orderId }),
  });
  return { id: rows[0].id };
}

const byOrder = (orderId: string) => `razorpay_order_id=eq.${encodeURIComponent(orderId)}`;

/** Marks the booking paid exactly once. `changed` is false if it was already paid. */
export async function markPaid(env: Env, orderId: string, paymentId: string) {
  const rows = await sb<AppointmentRow[]>(env, `appointments?${byOrder(orderId)}&payment_status=neq.paid`, {
    method: 'PATCH',
    body: JSON.stringify({ payment_status: 'paid', razorpay_payment_id: paymentId, paid_at: new Date().toISOString() }),
  });
  return rows.length > 0 ? { changed: true as const, appointment: rows[0] } : { changed: false as const };
}

export async function getByOrder(env: Env, orderId: string): Promise<AppointmentRow | null> {
  const rows = await sb<AppointmentRow[]>(env, `appointments?${byOrder(orderId)}&select=*`, { method: 'GET' });
  return rows[0] ?? null;
}

/** Never downgrades a paid booking. */
export async function markFailed(env: Env, orderId: string): Promise<void> {
  await sb(env, `appointments?${byOrder(orderId)}&payment_status=neq.paid`, {
    method: 'PATCH',
    body: JSON.stringify({ payment_status: 'failed' }),
  });
}
