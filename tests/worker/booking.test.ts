import { describe, it, expect, afterEach, vi } from 'vitest';
import worker from '../../worker/index';
import { validateBookingInput } from '../../worker/booking';
import { insertPendingBooking, getByOrder } from '../../worker/db';
import { freshEnv, hmac, mockFetch } from './helpers';

afterEach(() => vi.unstubAllGlobals());

const post = (e: any, path: string, body: unknown, headers: Record<string, string> = {}) =>
  worker.fetch(new Request('https://site.test' + path, { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers }), e);

const validBody = { name: 'Asha Roy', email: 'asha@example.com', phone: '+91 98300 12345', client_type: 'Individual', communication_method: 'Video Call', service: 'Tax Advisory & Compliance' };
const stored = { name: 'Asha Roy', email: 'asha@example.com', phone: '+919830012345', client_type: 'Individual', service: 'Tax Advisory & Compliance', preferred_date: null, preferred_time: null, communication_method: 'Video Call', description: null };

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
    const res = await post(freshEnv(), '/api/booking/order', { ...validBody, phone: '1' });
    expect(res.status).toBe(400);
    expect(((await res.json()) as any).errors.phone).toBeTruthy();
  });
  it('ignores a client-sent amount, creates a 100000 order and a pending D1 row', async () => {
    const e = freshEnv();
    const calls = mockFetch({ 'POST razorpay.com/v1/orders': (c) => ({ id: 'order_9', amount: c.body.amount }) });
    const res = await post(e, '/api/booking/order', { ...validBody, amount: 1 });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ order_id: 'order_9', amount: 100000, key_id: 'rzp_test_abc', currency: 'INR' });
    expect(calls[0].body.amount).toBe(100000);
    expect(await getByOrder(e, 'order_9')).toMatchObject({ payment_status: 'pending', amount_paise: 100000, phone: '+919830012345' });
  });
});

describe('POST /api/booking/verify', () => {
  const sig = (o: string, p: string) => hmac('key_secret', `${o}|${p}`);
  const body = { razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: sig('order_1', 'pay_1') };
  const setup = async (payment: object = {}) => {
    const e = freshEnv();
    const { id } = await insertPendingBooking(e, stored, 'order_1', 100000);
    const calls = mockFetch({
      'GET razorpay.com/v1/payments/': () => ({ id: 'pay_1', order_id: 'order_1', amount: 100000, currency: 'INR', status: 'captured', ...payment }),
      'POST /capture': () => ({}),
      'api.resend.com': () => ({ id: 'e1' }),
      'api.callmebot.com': () => new Response('ok'),
    });
    return { e, calls, ref: 'SKB-' + id.replace(/-/g, '').slice(0, 8).toUpperCase() };
  };

  it('rejects a bad signature without touching anything', async () => {
    const { e, calls } = await setup();
    const res = await post(e, '/api/booking/verify', { ...body, razorpay_signature: 'f'.repeat(64) });
    expect(res.status).toBe(400);
    expect(calls.length).toBe(0);
    expect((await getByOrder(e, 'order_1'))!.payment_status).toBe('pending');
  });
  it('rejects a wrong amount', async () => {
    const { e } = await setup({ amount: 50000 });
    expect((await post(e, '/api/booking/verify', body)).status).toBe(400);
    expect((await getByOrder(e, 'order_1'))!.payment_status).toBe('pending');
  });
  it('rejects a payment from a different order', async () => {
    const { e } = await setup({ order_id: 'order_other' });
    expect((await post(e, '/api/booking/verify', body)).status).toBe(400);
  });
  it('captures an authorized payment then marks paid', async () => {
    const { e, calls } = await setup({ status: 'authorized' });
    expect((await post(e, '/api/booking/verify', body)).status).toBe(200);
    expect(calls.some((c) => c.url.includes('/capture'))).toBe(true);
    expect((await getByOrder(e, 'order_1'))!.payment_status).toBe('paid');
  });
  it('marks paid, emails client + owner and WhatsApps owner once; a repeat call sends nothing more', async () => {
    const { e, calls, ref } = await setup();
    const res = await post(e, '/api/booking/verify', body);
    expect(await res.json()).toEqual({ ref });
    const emails = () => calls.filter((c) => c.url.includes('resend'));
    const wa = () => calls.filter((c) => c.url.includes('callmebot'));
    expect(emails().map((c) => c.body.to[0])).toEqual(['asha@example.com', 'owner@test.in']);
    expect(emails()[0].body.reply_to).toBe('bookings@test.in');
    expect(wa().length).toBe(1);
    expect(decodeURIComponent(wa()[0].url)).toContain(ref);
    expect(wa()[0].url).toContain('phone=919830000000');
    const again = await post(e, '/api/booking/verify', body);
    expect(await again.json()).toEqual({ ref });
    expect(emails().length).toBe(2);
    expect(wa().length).toBe(1);
  });
});

describe('POST /api/booking/webhook', () => {
  const evt = (event: string) => `{"event":"${event}","payload":{"payment":{"entity":{"id":"pay_1","order_id":"order_1"}}}}`;
  it('401 on bad signature', async () => {
    mockFetch({});
    const res = await post(freshEnv(), '/api/booking/webhook', evt('payment.captured'), { 'x-razorpay-signature': 'bad' });
    expect(res.status).toBe(401);
  });
  it('payment.captured marks paid; payment.failed on another order marks failed', async () => {
    const e = freshEnv();
    await insertPendingBooking(e, stored, 'order_1', 100000);
    mockFetch({
      'GET razorpay.com/v1/payments/': () => ({ id: 'pay_1', order_id: 'order_1', amount: 100000, currency: 'INR', status: 'captured' }),
      'api.resend.com': () => ({}),
      'api.callmebot.com': () => new Response('ok'),
    });
    const raw = evt('payment.captured');
    expect((await post(e, '/api/booking/webhook', raw, { 'x-razorpay-signature': hmac('wh_secret', raw) })).status).toBe(200);
    expect((await getByOrder(e, 'order_1'))!.payment_status).toBe('paid');

    await insertPendingBooking(e, stored, 'order_2', 100000);
    const raw2 = evt('payment.failed').replace('order_1', 'order_2');
    await post(e, '/api/booking/webhook', raw2, { 'x-razorpay-signature': hmac('wh_secret', raw2) });
    expect((await getByOrder(e, 'order_2'))!.payment_status).toBe('failed');
  });
});

describe('POST /api/enquiry', () => {
  it('validates, stores, emails owner and WhatsApps owner', async () => {
    const e = freshEnv();
    const calls = mockFetch({ 'api.resend.com': () => ({}), 'api.callmebot.com': () => new Response('ok') });
    const bad = await post(e, '/api/enquiry', { name: 'A', email: 'x', phone: '1', message: '' });
    expect(bad.status).toBe(400);
    const res = await post(e, '/api/enquiry', { name: 'Bina Das', email: 'bina@example.com', phone: '9830012345', message: 'Need GST registration help' });
    expect(res.status).toBe(200);
    const row = await e.DB.prepare('SELECT * FROM enquiries').first();
    expect(row).toMatchObject({ name: 'Bina Das', message: 'Need GST registration help' });
    const mail = calls.find((c) => c.url.includes('resend'))!;
    expect(mail.body.to).toEqual(['owner@test.in']);
    expect(mail.body.reply_to).toBe('bina@example.com');
    expect(calls.some((c) => c.url.includes('callmebot'))).toBe(true);
  });
  it('honeypot submissions are rejected', async () => {
    mockFetch({});
    expect((await post(freshEnv(), '/api/enquiry', { name: 'Bot', email: 'b@b.co', phone: '9830012345', message: 'spam spam', website: 'x' })).status).toBe(400);
  });
});
