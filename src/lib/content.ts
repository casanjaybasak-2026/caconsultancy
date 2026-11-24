import { CONTACT_FALLBACK, type SiteConfig } from '../config/site';

// The anon key is public by design (it already ships in the browser bundle); RLS protects data.
const URL_ = import.meta.env?.PUBLIC_SUPABASE_URL ?? process.env.PUBLIC_SUPABASE_URL ?? 'https://htfluyhsaondqacgeyou.supabase.co';
const ANON =
  import.meta.env?.PUBLIC_SUPABASE_ANON_KEY ?? process.env.PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0Zmx1eWhzYW9uZHFhY2dleW91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1MzI1MzIsImV4cCI6MjEwMzEwODUzMn0.xaBMSyLf8P4o-y83t6GyFrN3eaACq3BgGPLMZoHTIC4';

export interface Service { id: string; title: string; slug: string; short_description: string; description: string; icon: string; category: string; display_order: number }
export interface Faq { id: string; question: string; answer: string; display_order: number }
export interface Article { id: string; title: string; slug: string; excerpt: string; content: string; category: string; author: string; published_at: string; updated_at: string; featured_image: string | null }
export interface Plan { product: string; code: string; name: string; price_inr: number; billing_period: string; features: string[]; display_order: number }

const cache = new Map<string, Promise<unknown>>();

/** Fetches rows from Supabase REST. Throws so a broken fetch fails the build instead of publishing empty pages. */
export async function fetchTable<T>(table: string, query: string, opts: { url?: string; key?: string } = {}): Promise<T[]> {
  const base = opts.url ?? URL_;
  const key = opts.key ?? ANON;
  if (!base || !key) throw new Error('PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY missing');
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${base}/rest/v1/${table}?${query}`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) return (await res.json()) as T[];
      lastErr = new Error(`Supabase ${table} fetch failed: ${res.status}`);
      if (res.status < 500) break; // client errors won't fix themselves
    } catch (err) {
      lastErr = err;
    }
    if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 1000));
  }
  throw lastErr instanceof Error ? lastErr : new Error(`Supabase ${table} fetch failed`);
}

function cached<T>(k: string, f: () => Promise<T>): Promise<T> {
  if (!cache.has(k)) cache.set(k, f());
  return cache.get(k) as Promise<T>;
}

export const getServices = () =>
  cached('services', () => fetchTable<Service>('services', 'select=*&is_active=eq.true&order=display_order'));
export const getFaqs = () => cached('faqs', () => fetchTable<Faq>('faqs', 'select=*&is_active=eq.true&order=display_order'));
export const getArticles = () =>
  cached('articles', () =>
    fetchTable<Article>('articles', 'select=id,title,slug,excerpt,content,category,author,published_at,updated_at,featured_image&published=eq.true&order=published_at.desc'),
  );
export const getPlans = (product: string) =>
  cached('plans', () => fetchTable<Plan>('subscription_plans', 'select=*&is_active=eq.true&order=display_order')).then((all) =>
    all.filter((p) => p.product === product),
  );

export function mergeSiteConfig(rows: { key: string; value: string | null }[]): SiteConfig {
  const out = { ...CONTACT_FALLBACK };
  for (const r of rows) if (r.key in out && r.value && r.value.trim()) (out as any)[r.key] = r.value.trim();
  return out;
}

export const getSiteConfig = () =>
  cached('site_config', async () => mergeSiteConfig(await fetchTable<{ key: string; value: string }>('site_config', 'select=key,value')));

export interface Profile { name: string; title: string; bio: string; qualification: string | null; experience: string | null; areas_of_expertise: string[]; memberships: string[]; profile_image: string | null }
/** Hides admin placeholder text ("… editable from admin dashboard") from public pages. */
export const isReal = (v: string | null | undefined): v is string => !!v && !/editable from admin/i.test(v);
export const getProfile = () => cached('profile', async () => (await fetchTable<Profile>('profiles', 'select=*&limit=1'))[0] ?? null);
