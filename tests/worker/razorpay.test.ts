import { describe, it, expect, afterEach, vi } from 'vitest';
import { verifyCheckoutSignature, verifyWebhookSignature, createOrder } from '../../worker/razorpay';
import { insertPendingBooking, markPaid, markFailed, getByOrder, insertEnquiry, listBookings } from '../../worker/db';
import { env, freshEnv, hmac, mockFetch } from './helpers';

afterEach(() => vi.unstubAllGlobals());

const input = { name: 'Asha Roy', email: 'asha@example.com', phone: '+919830012345', client_type: 'Individual', service: null, preferred_date: null, preferred_time: null, communication_method: 'Video Call', description: null };

describe('signatures', () => {
  it('accepts a correct checkout signature', async () => {
    expect(await verifyCheckoutSignature('order_A', 'pay_B', hmac('test_secret', 'order_A|pay_B'), 'test_secret')).toBe(true);
  });
  it('rejects a wrong or short signature', async () => {
    expect(await verifyCheckoutSignature('order_A', 'pay_B', hmac('other', 'order_A|pay_B'), 'test_secret')).toBe(false);
    expect(await verifyCheckoutSignature('order_A', 'pay_B', 'abc', 'test_secret')).toBe(false);
    expect(await verifyCheckoutSignature('order_A', 'pay_B', '', 'test_secret')).toBe(false);
  });
  it('checks webhook signature over exact raw bytes', async () => {
    const raw = '{"event":"payment.captured",  "x":1}';
    expect(await verifyWebhookSignature(raw, hmac('wh', raw), 'wh')).toBe(true);
    expect(await verifyWebhookSignature(JSON.stringify(JSON.parse(raw)), hmac('wh', raw), 'wh')).toBe(false);
  });
});

describe('createOrder', () => {
  it('posts fee 100000 INR with basic auth', async () => {
    const calls = mockFetch({ 'POST api.razorpay.com/v1/orders': () => ({ id: 'order_1', amount: 100000 }) });
    const o = await createOrder(env, { receipt: 'r1', notes: {} });
    expect(o.id).toBe('order_1');
    expect(calls[0].body).toMatchObject({ amount: 100000, currency: 'INR', receipt: 'r1' });
    expect(calls[0].headers.Authorization).toBe('Basic ' + btoa('rzp_test_abc:key_secret'));
  });
});

describe('D1 bookings (real SQLite, real migration)', () => {
  it('markPaid changes the row exactly once', async () => {
    const e = freshEnv();
    await insertPendingBooking(e, input, 'order_1', 100000);
    const first = await markPaid(e, 'order_1', 'pay_1');
    expect(first.changed).toBe(true);
    expect(first.changed && first.booking.payment_status).toBe('paid');
    expect((await markPaid(e, 'order_1', 'pay_1')).changed).toBe(false);
    expect((await getByOrder(e, 'order_1'))!.razorpay_payment_id).toBe('pay_1');
  });
  it('markFailed never downgrades a paid booking', async () => {
    const e = freshEnv();
    await insertPendingBooking(e, input, 'order_2', 100000);
    await markPaid(e, 'order_2', 'pay_2');
    await markFailed(e, 'order_2');
    expect((await getByOrder(e, 'order_2'))!.payment_status).toBe('paid');
    await insertPendingBooking(e, input, 'order_3', 100000);
    await markFailed(e, 'order_3');
    expect((await getByOrder(e, 'order_3'))!.payment_status).toBe('failed');
  });
  it('rejects a duplicate order id and filters lists by status', async () => {
    const e = freshEnv();
    await insertPendingBooking(e, input, 'order_4', 100000);
    await expect(insertPendingBooking(e, input, 'order_4', 100000)).rejects.toThrow();
    await insertPendingBooking(e, input, 'order_5', 100000);
    await markPaid(e, 'order_5', 'p');
    expect((await listBookings(e, 'paid')).map((b) => b.razorpay_order_id)).toEqual(['order_5']);
    expect((await listBookings(e, null)).length).toBe(2);
  });
  it('stores enquiries', async () => {
    const e = freshEnv();
    const row = await insertEnquiry(e, { name: 'B', email: 'b@x.in', phone: '9830012345', service: null, message: 'Hello there' });
    expect(row.id).toBeTruthy();
    expect(row.created_at).toMatch(/^\d{4}-/);
  });
});
