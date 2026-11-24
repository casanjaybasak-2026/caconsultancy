import type { APIRoute } from 'astro';
import { getArticles } from '../lib/content';
import { MONITORS } from '../data/monitors';
import { SITE } from '../config/site';

const BUILD_DATE = new Date().toISOString().slice(0, 10);

export const GET: APIRoute = async () => {
  const articles = await getArticles();
  const latest = articles[0]?.updated_at?.slice(0, 10) ?? BUILD_DATE;
  const urls: [string, string, string][] = [
    ['/', BUILD_DATE, '1.0'],
    ['/services', BUILD_DATE, '0.9'],
    ['/appointment', BUILD_DATE, '0.9'],
    ['/about', BUILD_DATE, '0.8'],
    ['/individuals', BUILD_DATE, '0.8'],
    ['/business', BUILD_DATE, '0.8'],
    ['/contact', BUILD_DATE, '0.7'],
    ['/resources', latest, '0.8'],
    ...MONITORS.map((m) => [`/${m.slug}`, BUILD_DATE, '0.8'] as [string, string, string]),
    ...articles.map((a) => [`/resources/${a.slug}`, (a.updated_at ?? a.published_at).slice(0, 10), '0.7'] as [string, string, string]),
    ...['/privacy-policy', '/terms', '/refund-policy', '/disclaimer', '/cookie-policy'].map((p) => [p, BUILD_DATE, '0.3'] as [string, string, string]),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([p, d, pr]) => `  <url><loc>${SITE.url}${p === '/' ? '/' : p}</loc><lastmod>${d}</lastmod><priority>${pr}</priority></url>`).join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
