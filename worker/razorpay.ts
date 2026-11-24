import type { Env } from './env';

const API = 'https://api.razorpay.com/v1';

const auth = (env: Env) => 'Basic ' + btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);

async function rzp<T>(env: Env, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(API + path, {
    ...init,
    headers: { Authorization: auth(env), 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  const body = (await res.json()) as any;
  if (!res.ok) throw new Error(`Razorpay ${path} ${res.status}: ${body?.error?.description ?? 'error'}`);
  return body as T;
}

export const feePaise = (env: Env) => Number(env.CONSULTATION_FEE_PAISE || 100000);

export function createOrder(env: Env, o: { receipt: string; notes: Record<string, string> }) {
  return rzp<{ id: string; amount: number }>(env, '/orders', {
    method: 'POST',
    body: JSON.stringify({ amount: feePaise(env), currency: 'INR', receipt: o.receipt, notes: o.notes }),
  });
}

export interface RzpPayment { id: string; order_id: string; amount: number; currency: string; status: string; email?: string; contact?: string }

export const fetchPayment = (env: Env, paymentId: string) =>
  rzp<RzpPayment>(env, `/payments/${encodeURIComponent(paymentId)}`);

export async function capturePayment(env: Env, paymentId: string, amount: number): Promise<void> {
  await rzp(env, `/payments/${encodeURIComponent(paymentId)}/capture`, {
    method: 'POST',
    body: JSON.stringify({ amount, currency: 'INR' }),
  });
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string, secret: string) {
  if (!orderId || !paymentId || !signature || !secret) return false;
  return safeEqual(await hmacHex(secret, `${orderId}|${paymentId}`), signature);
}

export async function verifyWebhookSignature(rawBody: string, signature: string, secret: string) {
  if (!signature || !secret) return false;
  return safeEqual(await hmacHex(secret, rawBody), signature);
}
