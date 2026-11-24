import { describe, it, expect, afterEach, vi } from 'vitest';
import worker from '../../worker/index';
import { validateBookingInput } from '../../worker/booking';
import { env, hmac, mockFetch } from './helpers';

afterEach(() => vi.unstubAllGlobals());

const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  worker.fetch(new Request('https://site.test' + path, { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers }), env);

const validBody = { name: 'Asha Roy', email: 'asha@example.com', phone: '+91 98300 12345', client_type: 'Individual', communication_method: 'Video Call', service: 'Tax Advisory & Compliance' };
const appt = { id: 'abcd1234-0000-0000-0000-000000000000', ...validBody, payment_status: 'paid' };

describe('validateBookingInput', () => {
  it('normalises phone and rejects bad input', () => {
    const ok = validateBookingInput(validBody);
    expect(ok.ok && ok.value.phone).toBe('+919830012345');
    const bad = validateBookingInput({ ...validBody, phone: '12345', email: 'x' });
    expect(!bad.ok && Object.keys(bad.errors).sort()).toEqual(['email', 'phone']);
    expect(validateBookingInput({ ...validBody, preferred_date: '2000-01-01' }).ok).toBe(false);
    expect(validateBookingInput({ ...validBody, website: 'spam' }).ok).toBe(false);
  });
});

describe('POST /api/booking/order', () => {
  it('400 on invalid phone', async () => {
    const res = await post('/api/booking/order', { ...validBody, phone: '1' });
    expect(res.status).toBe(400);
    expect((await res.json()).errors.phone).toBeTruthy();
  });
  it('ignores a client-sent amount and creates a 100000 order', async () => {
    const calls = mockFetch({
      'POST razorpay.com/v1/orders': (c) => ({ id: 'order_9', amount: c.body.amount }),
      'POST sb.test/rest/v1/appointments': () => [{ id: 'appt-1' }],
    });
    const res = await post('/api/booking/order', { ...validBody, amount: 1 });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ order_id: 'order_9', amount: 100000, key_id: 'rzp_test_abc', currency: 'INR' });
    expect(calls[0].body.amount).toBe(100000);
    expect(calls[1].body).toMatchObject({ payment_status: 'pending', razorpay_order_id: 'order_9', amount_paise: 100000, phone: '+919830012345' });
  });
});

describe('POST /api/booking/verify', () => {
  const sig = (o: string, p: string) => hmac('key_secret', `${o}|${p}`);
  const setup = (payment: object, rows: any[][] = [[appt]]) => {
    let n = 0;
    return mockFetch({
      'GET razorpay.com/v1/payments/': () => ({ id: 'pay_1', order_id: 'order_1', amount: 100000, currency: 'INR', status: 'captured', ...payment }),
      'POST /capture': () => ({}),
      'PATCH sb.test': () => rows[Math.min(n++, rows.length - 1)],
      'GET sb.test': () => [appt],
      'api.resend.com': () => ({ id: 'e1' }),
    });
  };
  const body = { razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: sig('order_1', 'pay_1') };

  it('rejects a bad signature without touching the database', async () => {
    const calls = setup({});
    const res = await post('/api/booking/verify', { ...body, razorpay_signature: 'f'.repeat(64) });
    expect(res.status).toBe(400);
    expect(calls.length).toBe(0);
  });
  it('rejects a wrong amount', async () => {
    const calls = setup({ amount: 50000 });
    expect((await post('/api/booking/verify', body)).status).toBe(400);
    expect(calls.some((c) => c.method === 'PATCH')).toBe(false);
  });
  it('rejects a payment from a different order', async () => {
    setup({ order_id: 'order_other' });
    expect((await post('/api/booking/verify', body)).status).toBe(400);
  });
  it('captures an authorized payment then marks paid', async () => {
    const calls = setup({ status: 'authorized' });
    expect((await post('/api/booking/verify', body)).status).toBe(200);
    const i = calls.findIndex((c) => c.url.includes('/capture'));
    expect(i).toBeGreaterThan(-1);
    expect(calls.findIndex((c) => c.method === 'PATCH')).toBeGreaterThan(i);
  });
  it('marks paid, emails client and owner once, returns ref; repeat call sends no more email', async () => {
    const calls = setup({}, [[appt], []]);
    const res = await post('/api/booking/verify', body);
    expect(await res.json()).toEqual({ ref: 'SKB-ABCD1234' });
    const emails = () => calls.filter((c) => c.url.includes('resend'));
    expect(emails().map((c) => c.body.to[0])).toEqual(['asha@example.com', 'owner@test.in']);
    const again = await post('/api/booking/verify', body);
    expect(await again.json()).toEqual({ ref: 'SKB-ABCD1234' });
    expect(emails().length).toBe(2);
  });
});

describe('POST /api/booking/webhook', () => {
  const evt = (event: string) => `{"event":"${event}","payload":{"payment":{"entity":{"id":"pay_1","order_id":"order_1"}}}}`;
  it('401 on bad signature', async () => {
    mockFetch({});
    const res = await post('/api/booking/webhook', evt('payment.captured'), { 'x-razorpay-signature': 'bad' });
    expect(res.status).toBe(401);
  });
  it('payment.captured marks paid', async () => {
    const calls = mockFetch({
      'GET razorpay.com/v1/payments/': () => ({ id: 'pay_1', order_id: 'order_1', amount: 100000, currency: 'INR', status: 'captured' }),
      'PATCH sb.test': () => [appt],
      'api.resend.com': () => ({}),
    });
    const raw = evt('payment.captured');
    const res = await post('/api/booking/webhook', raw, { 'x-razorpay-signature': hmac('wh_secret', raw) });
    expect(res.status).toBe(200);
    expect(calls.find((c) => c.method === 'PATCH')!.body.payment_status).toBe('paid');
  });
  it('payment.failed marks failed', async () => {
    const calls = mockFetch({ 'PATCH sb.test': () => [] });
    const raw = evt('payment.failed');
    await post('/api/booking/webhook', raw, { 'x-razorpay-signature': hmac('wh_secret', raw) });
    expect(calls[0].body).toEqual({ payment_status: 'failed' });
  });
});
