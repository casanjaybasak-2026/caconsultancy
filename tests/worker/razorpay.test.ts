import { describe, it, expect, afterEach, vi } from 'vitest';
import { verifyCheckoutSignature, verifyWebhookSignature, createOrder } from '../../worker/razorpay';
import { markPaid, markFailed } from '../../worker/supabase';
import { env, hmac, mockFetch } from './helpers';

afterEach(() => vi.unstubAllGlobals());

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

describe('supabase updates', () => {
  it('markPaid reports changed only when a row was updated', async () => {
    let rows: any[] = [{ id: 'a1' }];
    const calls = mockFetch({ 'PATCH sb.test/rest/v1/appointments': () => rows });
    expect((await markPaid(env, 'order_1', 'pay_1')).changed).toBe(true);
    rows = [];
    expect((await markPaid(env, 'order_1', 'pay_1')).changed).toBe(false);
    expect(calls[0].url).toContain('payment_status=neq.paid');
  });
  it('markFailed never touches paid rows', async () => {
    const calls = mockFetch({ 'PATCH sb.test': () => [] });
    await markFailed(env, 'order_1');
    expect(calls[0].url).toContain('payment_status=neq.paid');
    expect(calls[0].body).toEqual({ payment_status: 'failed' });
  });
});
