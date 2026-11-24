// Post-build checks over dist/. Run `npm run build` first.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

const ORIGIN = 'https://ca-sk-basak-consultancy.in';
const built = existsSync('dist/index.html');
const fileFor = (path: string) => (path === '/' ? 'dist/index.html' : `dist${path}.html`);
const html = (path: string) => readFileSync(fileFor(path), 'utf8');
const oldLocs = [...readFileSync('tests/fixtures/old-sitemap.xml', 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(ORIGIN, '') || '/');
const attr = (h: string, re: RegExp) => h.match(re)?.[1] ?? '';

describe.skipIf(!built)('built site', () => {
  it('has every URL from the old sitemap', () => {
    expect(oldLocs.length).toBeGreaterThan(30);
    for (const p of oldLocs) expect(existsSync(fileFor(p)), p).toBe(true);
  });

  it('each old URL has h1, unique title, description and matching canonical', () => {
    const titles = new Set<string>();
    for (const p of oldLocs) {
      const h = html(p);
      const title = attr(h, /<title>([^<]+)<\/title>/);
      expect(title, p).not.toBe('');
      expect(titles.has(title), `duplicate title ${title}`).toBe(false);
      titles.add(title);
      expect(attr(h, /<meta name="description" content="([^"]+)"/).length, p).toBeGreaterThan(50);
      expect(attr(h, /<link rel="canonical" href="([^"]+)"/), p).toBe(ORIGIN + (p === '/' ? '/' : p));
      expect(h, p).toMatch(/<h1[^>]*>[\s\S]*?\S[\s\S]*?<\/h1>/);
    }
  });

  it('has the refund policy page', () => expect(existsSync('dist/refund-policy.html')).toBe(true));

  it('ships the legacy app alongside', () => {
    expect(existsSync('dist/app.html')).toBe(true);
    expect(existsSync('dist/assets/index-uS2jb-ZE.js')).toBe(true);
    expect(existsSync('dist/404.html')).toBe(true);
  });

  it('booking page shows the fee, loads Razorpay and has the form fields', () => {
    const h = html('/appointment');
    expect(h).toContain('Consultation fee ₹1,000 (incl. GST)');
    expect(h).toContain('checkout.razorpay.com/v1/checkout.js');
    for (const n of ['name', 'email', 'phone', 'website']) expect(h).toContain(`name="${n}"`);
  });

  it('success/failed pages are noindex; success has the WhatsApp hook', () => {
    for (const p of ['/booking/success', '/booking/failed']) expect(html(p)).toContain('noindex');
    expect(html('/booking/success')).toContain('data-ref');
  });

  it('no secret names or keys leak into built files', () => {
    for (const p of ['/', '/appointment', '/contact']) {
      const h = html(p);
      expect(h).not.toMatch(/RAZORPAY_KEY_SECRET|service_role|re_[A-Za-z0-9]{20}/);
    }
  });
});
