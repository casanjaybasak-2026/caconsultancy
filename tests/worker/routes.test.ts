import { describe, it, expect, vi } from 'vitest';
import { isLegacyRoute } from '../../worker/routes';
import worker from '../../worker/index';

describe('isLegacyRoute', () => {
  it.each(['/admin', '/admin/appointments', '/loan-dscr-monitor/dashboard', '/cash-flow-monitor/receivables', '/business-financial-health-monitor/payment-status/'])(
    '%s is legacy', (p) => expect(isLegacyRoute(p)).toBe(true));
  it.each(['/', '/loan-dscr-monitor', '/about', '/resources/x', '/api/booking/order', '/loan-dscr-monitor/unknown', '/administrator'])(
    '%s is not legacy', (p) => expect(isLegacyRoute(p)).toBe(false));
});

describe('worker fetch', () => {
  const env = () => ({ ASSETS: { fetch: vi.fn(async (r: Request) => new Response('ok:' + new URL(r.url).pathname)) } }) as any;

  it('serves app.html for legacy deep links', async () => {
    const e = env();
    const res = await worker.fetch(new Request('https://x.in/cash-flow-monitor/receivables'), e);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('ok:/app');
  });
  it('passes Astro pages straight to assets', async () => {
    const res = await worker.fetch(new Request('https://x.in/loan-dscr-monitor'), env());
    expect(await res.text()).toBe('ok:/loan-dscr-monitor');
  });
  it('returns 404 JSON for unknown API', async () => {
    const res = await worker.fetch(new Request('https://x.in/api/unknown', { method: 'POST' }), env());
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not found' });
  });
});
