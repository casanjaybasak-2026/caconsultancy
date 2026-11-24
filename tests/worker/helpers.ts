import { vi } from 'vitest';
import { createHmac } from 'node:crypto';

export const env = {
  RAZORPAY_KEY_ID: 'rzp_test_abc',
  RAZORPAY_KEY_SECRET: 'key_secret',
  RAZORPAY_WEBHOOK_SECRET: 'wh_secret',
  SUPABASE_URL: 'https://sb.test',
  SUPABASE_SERVICE_ROLE_KEY: 'service',
  RESEND_API_KEY: 're_test',
  OWNER_EMAIL: 'owner@test.in',
  BOOKING_FROM_EMAIL: 'bookings@test.in',
  CONSULTATION_FEE_PAISE: '100000',
  SITE_URL: 'https://site.test',
  WHATSAPP_NUMBER: '919999999999',
  ASSETS: { fetch: vi.fn() },
} as any;

export const hmac = (secret: string, msg: string) => createHmac('sha256', secret).update(msg).digest('hex');

export type Call = { url: string; method: string; body: any; headers: Record<string, string> };

/** Installs a fetch mock routed by URL substring; records calls. */
export function mockFetch(routes: Record<string, (c: Call) => unknown | Response>) {
  const calls: Call[] = [];
  const fn = vi.fn(async (input: any, init: any = {}) => {
    const url = String(input);
    const c: Call = { url, method: init.method ?? 'GET', body: init.body ? JSON.parse(init.body) : undefined, headers: init.headers ?? {} };
    calls.push(c);
    const key = Object.keys(routes).find((k) => {
      const [m, frag] = k.includes(' ') ? k.split(' ') : ['*', k];
      return (m === '*' || m === c.method) && url.includes(frag);
    });
    if (!key) throw new Error('unmocked fetch ' + c.method + ' ' + url);
    const out = routes[key](c);
    return out instanceof Response ? out : new Response(JSON.stringify(out), { status: 200 });
  });
  vi.stubGlobal('fetch', fn);
  return calls;
}
