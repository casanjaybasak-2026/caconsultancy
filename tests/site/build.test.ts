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

describe.skipIf(!built)('SEO / GEO files', () => {
  const ldBlocks = (h: string) => [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  const types = (h: string) => ldBlocks(h).flatMap((b) => (b['@graph'] ?? [b]).flatMap((n: any) => [n['@type']].flat()));

  it('every JSON-LD block parses and uses one @graph per page', () => {
    for (const p of oldLocs) {
      const blocks = ldBlocks(html(p));
      expect(blocks.length, p).toBeLessThanOrEqual(1);
      for (const b of blocks) expect(b['@context']).toBe('https://schema.org');
    }
  });

  it('home has AccountingService, WebSite, Person, FAQPage', () => {
    const t = types(html('/'));
    for (const x of ['AccountingService', 'WebSite', 'Person', 'FAQPage']) expect(t).toContain(x);
  });

  it('articles have Article (with speakable) and BreadcrumbList', () => {
    const p = oldLocs.find((l) => l.startsWith('/resources/'))!;
    const t = types(html(p));
    expect(t).toContain('Article');
    expect(t).toContain('BreadcrumbList');
    expect(html(p)).toContain('article-summary');
  });

  it('sitemap lists every old URL plus refund policy, but no booking or legacy routes', () => {
    const sm = readFileSync('dist/sitemap.xml', 'utf8');
    for (const p of oldLocs) expect(sm, p).toContain(`<loc>${ORIGIN}${p === '/' ? '/' : p}</loc>`);
    expect(sm).toContain('/refund-policy');
    expect(sm).not.toMatch(/\/booking\/|\/admin|\/signup|\/dashboard/);
  });

  it('robots keeps old disallows and blocks booking/api; llms.txt exists', () => {
    const r = readFileSync('dist/robots.txt', 'utf8');
    for (const d of ['Disallow: /admin', 'Disallow: /*/signup', 'Disallow: /booking/', 'Disallow: /api/', 'Sitemap: https://ca-sk-basak-consultancy.in/sitemap.xml']) expect(r).toContain(d);
    // No Disallow rule may prefix-match a public page such as /appointment
    const rules = [...r.matchAll(/^Disallow: (\S+)$/gm)].map((m) => m[1]).filter((d) => !d.includes('*') && !d.endsWith('$'));
    for (const p of oldLocs) for (const d of rules) expect(p.startsWith(d), `${d} blocks ${p}`).toBe(false);
    const l = readFileSync('dist/llms.txt', 'utf8');
    expect(l).toMatch(/^# CA S K Basak/);
    expect(l).toContain('/appointment');
  });
});
