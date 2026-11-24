# Astro Rebuild + Razorpay Booking Implementation Plan

> Steps use checkbox (`- [ ]`) syntax for tracking. Execute task-by-task.

**Goal:** Replace the public pages with a static Astro site and add a server-verified ₹1,000 Razorpay consultation booking, while keeping the existing compiled tools and admin working on the same Cloudflare Worker.

**Architecture:** `astro build` (static) outputs to `dist/`. A post-build script copies the pruned legacy app (`legacy/app.html` + `legacy/assets/`) into `dist/`. A single Worker (`worker/index.ts`) with an `ASSETS` binding handles `/api/booking/*`, serves `app.html` for legacy routes, and leaves every other request to static assets. Content is fetched from Supabase at build time.

**Tech Stack:** Astro 5 (static), TypeScript, Tailwind CSS 4, Cloudflare Workers + Wrangler 4, Vitest, Supabase REST (no SDK in the Worker), Razorpay Orders API + Checkout.js, Resend REST API.

**Spec:** `docs/specs/2026-11-24-astro-rebuild-razorpay-booking-design.md`

## Global Constraints

- Fee: `CONSULTATION_FEE_PAISE = 100000` (₹1,000, GST inclusive), currency `INR`. The amount is set only on the server.
- Display copy for the fee: `Consultation fee ₹1,000 (incl. GST)`.
- No secret in browser code or Git. Secrets: `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`.
- Plain vars: `RAZORPAY_KEY_ID`, `SUPABASE_URL`, `OWNER_EMAIL`, `BOOKING_FROM_EMAIL`, `CONSULTATION_FEE_PAISE`, `SITE_URL`, `WHATSAPP_NUMBER`.
- Build vars: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`.
- All existing public URLs from the current `sitemap.xml` must return 200 with Astro HTML.
- Legacy routes: `/admin`, `/admin/*`, and `/<monitor>/<sub>` where monitor ∈ {business-financial-health-monitor, loan-dscr-monitor, cash-flow-monitor, receivable-payable-monitor, cma-bank-renewal-monitor, monthly-mis-cfo-dashboard} and sub ∈ {dashboard, login, signup, submit, payment-status, loans, receivables, payables, actions, facilities, budget}.
- Brand palette: navy `#0f2545`, navy-deep `#081729`, gold `#a9812f`, gold-soft `#c9a86a`, paper `#fcfbf8`, paper-dim `#f4f2ec`, ink `#3a4453`, line `#e2ded2`. Fonts: Fraunces (headings), Inter (body), self-hosted.
- Keep GA `G-NF8YPK6ZJH`, AdSense `ca-pub-9565724265217851`, `ads.txt` and the Search Console tag `6uXVrt1CKV9oE12r9fKvkD0QdkM6EyimPYDgPdVKSWw`.
- `/booking/success` and `/booking/failed` carry `noindex`.

## Review Focus

- Double delivery: the verify call and the webhook arrive together, so emails must go out exactly once. Test `markPaid` returns `changed:false` on the second call (Task 4).
- A tampered amount: the browser posts its own amount or order. The server ignores it, and verify rejects a payment whose amount ≠ 100000 or whose order_id doesn't match (Task 4).
- A webhook body re-serialised before HMAC: the signature must be checked over the raw text body (Task 5 test with exact raw bytes).
- Deep links into legacy routes on refresh, e.g. `/loan-dscr-monitor/dashboard`, must return app.html, not 404, while `/loan-dscr-monitor` returns the Astro page (Task 3).
- Supabase content fetch fails at build time: the build must fail loudly, not publish empty pages (Task 6 test of `fetchTable` throwing).

---

## File Structure

```
package.json, astro.config.mjs, tsconfig.json, vitest.config.ts, wrangler.jsonc, .gitignore, .dev.vars.example
legacy/app.html, legacy/assets/*            pruned compiled React app (43 files)
scripts/prune-legacy.mjs                    one-off: trace imports from index.html, move used files to legacy/
scripts/copy-legacy.mjs                     post-build: copy legacy/* into dist/
worker/index.ts                             fetch entry, dispatch
worker/routes.ts                            isLegacyRoute(pathname)
worker/razorpay.ts                          createOrder, fetchPayment, capturePayment, verifyCheckoutSignature, verifyWebhookSignature
worker/supabase.ts                          insertPendingAppointment, markPaid, markFailed
worker/email.ts                             sendBookingEmails
worker/booking.ts                           handleOrder, handleVerify, handleWebhook, validateBookingInput
worker/env.ts                               Env interface
tests/worker/*.test.ts
src/config/site.ts                          brand + contact fallbacks
src/lib/content.ts                          build-time Supabase fetchers
src/lib/seo.ts                              jsonLd builders
src/layouts/Base.astro                      head (meta/canonical/OG/JSON-LD/GA/AdSense), header, footer
src/components/*.astro                      Header, Footer, Hero, ServiceCard, FaqList, ArticleCard, PlanCard, BookingForm, WhatsAppButton, Breadcrumbs
src/scripts/booking.ts                      client: submit → order → Checkout → verify → redirect
src/pages/...                               all routes in spec §5
src/styles/global.css                       Tailwind + tokens
public/ favicon.svg, icons, manifest.json, ads.txt, robots.txt, llms.txt
supabase/migrations/2026-11-24-appointment-payments.sql
tests/site/build.test.ts                    post-build checks over dist/
```

---

### Task 1: Prune legacy app and scaffold the project

**Files:**
- Create: `scripts/prune-legacy.mjs`, `scripts/copy-legacy.mjs`, `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `.dev.vars.example`
- Move: used compiled files → `legacy/` (`index.html` → `legacy/app.html`); delete unused hashed bundles at root and in `assets/`; move icons, manifest and ads.txt to `public/`
- Test: `tests/site/legacy.test.ts`

- [ ] **Step 1: Write the failing test** `legacy app references only files that exist`: parse `legacy/app.html`, follow every `/assets/*.js|css` reference transitively, and assert each file exists in `legacy/assets/`. Assert `legacy/app.html` contains `/assets/index-uS2jb-ZE.js`.
- [ ] **Step 2:** `npx vitest run tests/site/legacy.test.ts` → FAIL (no legacy/).
- [ ] **Step 3:** Write `prune-legacy.mjs` (same trace; `git mv` used files, `git rm` the rest), run it once, then scaffold Astro (`output: 'static'`, `site: 'https://ca-sk-basak-consultancy.in'`, `trailingSlash: 'never'`, `build.format: 'file'`), Tailwind 4 and Vitest. Scripts: `"build": "astro build && node scripts/copy-legacy.mjs"`, `"test": "vitest run"`, `"dev": "wrangler dev"`.
- [ ] **Step 4:** Test passes. `npm run build` succeeds, and `dist/app.html` plus `dist/assets/index-uS2jb-ZE.js` exist.
- [ ] **Step 5:** Commit `chore: scaffold Astro, prune legacy build to used files`.

### Task 2: Supabase migration

**Files:** Create `supabase/migrations/2026-11-24-appointment-payments.sql`

- [ ] **Step 1:** Write the idempotent SQL (`add column if not exists`): `payment_status text not null default 'unpaid' check (payment_status in ('unpaid','pending','paid','failed'))`, `amount_paise integer`, `razorpay_order_id text unique`, `razorpay_payment_id text`, `paid_at timestamptz`, plus `create index if not exists appointments_rzp_order_idx`.
- [ ] **Step 2:** Commit `feat(db): payment columns on appointments`. (The owner runs this in the Supabase SQL editor; it goes in the go-live checklist.)

### Task 3: Worker routing

**Files:** Create `worker/env.ts`, `worker/routes.ts`, `worker/index.ts`; modify `wrangler.jsonc`. Test: `tests/worker/routes.test.ts`

**Interfaces:** Produces `isLegacyRoute(pathname: string): boolean`; the default export `{ fetch(req, env, ctx) }`.

- [ ] **Step 1: Tests:** `isLegacyRoute('/admin')`, `('/admin/appointments')` and `('/loan-dscr-monitor/dashboard')` → true; `('/loan-dscr-monitor')`, `('/about')`, `('/resources/x')` and `('/api/booking/order')` → false. A fetch test with a mocked `env.ASSETS.fetch` checks that `/cash-flow-monitor/receivables` requests `/app.html` and `/api/unknown` returns 404 JSON.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. `wrangler.jsonc`: `name: "caconsultancyservice"`, `main: "worker/index.ts"`, `compatibility_date: "2026-08-30"`, `assets: { directory: "./dist", binding: "ASSETS", not_found_handling: "404-page", run_worker_first: ["/api/*", "/admin", "/admin/*", "/<each monitor>/*"] }`, plus the plain `vars` from Global Constraints (test key placeholder `rzp_test_REPLACE_ME`).
- [ ] **Step 4:** Tests pass.
- [ ] **Step 5:** Commit `feat(worker): legacy routing and API dispatch`.

### Task 4: Razorpay + Supabase helpers

**Files:** Create `worker/razorpay.ts`, `worker/supabase.ts`. Tests: `tests/worker/razorpay.test.ts`, `tests/worker/supabase.test.ts`

**Interfaces (produces):**
- `createOrder(env, { receipt: string, notes: Record<string,string> }): Promise<{ id: string, amount: number }>` with amount from `env.CONSULTATION_FEE_PAISE`
- `fetchPayment(env, paymentId): Promise<{ id, order_id, amount, status, email?, contact? }>`
- `capturePayment(env, paymentId, amount): Promise<void>`
- `verifyCheckoutSignature(orderId, paymentId, signature, secret): Promise<boolean>` (Web Crypto HMAC-SHA256, hex, constant-time compare)
- `verifyWebhookSignature(rawBody: string, signature: string, secret): Promise<boolean>`
- `insertPendingAppointment(env, input: BookingInput, orderId: string): Promise<{ id: string }>`
- `markPaid(env, orderId, paymentId): Promise<{ changed: boolean, appointment?: AppointmentRow }>` via a PATCH filtered on `razorpay_order_id=eq.X&payment_status=neq.paid`, with `Prefer: return=representation`; changed = rows.length > 0
- `markFailed(env, orderId): Promise<void>`, which never overwrites `paid`

- [ ] **Step 1: Tests:**
  - A known vector: secret `test_secret`, `order_A|pay_B` → expected hex computed in the test with node:crypto; a wrong signature → false; a different-length signature → false.
  - `createOrder` posts to `https://api.razorpay.com/v1/orders` with Basic auth `key_id:key_secret` and body amount `100000`, currency `INR` (mock fetch).
  - `markPaid` returns `{changed:true}` when the mock returns 1 row and `{changed:false}` on [] (the second call).
  - `markFailed` URL includes `payment_status=neq.paid`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Tests pass.
- [ ] **Step 5:** Commit `feat(worker): razorpay and supabase helpers`.

### Task 5: Booking endpoints + emails

**Files:** Create `worker/booking.ts`, `worker/email.ts`; wire into `worker/index.ts`. Test: `tests/worker/booking.test.ts`

**Interfaces:**
- `BookingInput { name, email, phone, client_type, service|null, preferred_date|null, preferred_time|null, communication_method, description|null }`
- `validateBookingInput(body: unknown): { ok: true, value: BookingInput } | { ok: false, errors: Record<string,string> }`. Rules: name 2–100 characters; email regex; phone is 10 digits after stripping `+91`, spaces and dashes; preferred_date not in the past (IST); description ≤ 2000; a non-empty honeypot `website` field → reject.
- `POST /api/booking/order` → 200 `{ order_id, key_id, amount: 100000, currency: "INR", appointment_id }`, or 400 `{ errors }`.
- `POST /api/booking/verify` with `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }` → 200 `{ ref }` or 400 `{ error }`.
- `POST /api/booking/webhook` → 200 `{ ok: true }` or 401 for a bad signature.
- `sendBookingEmails(env, appt: AppointmentRow, paymentId: string): Promise<void>` posts twice to `https://api.resend.com/emails` (to the client and to `OWNER_EMAIL`). A failure is logged and doesn't throw.
- `ref` = first 8 characters of the appointment id, upper-cased, prefixed `SKB-`.

- [ ] **Step 1: Tests** (mock fetch, Razorpay, Supabase and Resend):
  - order: an invalid phone → 400 with `errors.phone`; the body includes `amount: 1` → the order is still created with 100000.
  - verify: a bad signature → 400 and markPaid is not called; a valid signature but payment amount 50000 → 400; a valid signature with status `authorized` → capture is called, then markPaid; a valid, captured payment → 200 `{ref:'SKB-…'}` and Resend is called 2×; a second verify for the same order → 200 with Resend still at 2×.
  - webhook: a raw body with a correct signature, event `payment.captured` → markPaid; a bad signature → 401; `payment.failed` → markFailed.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. Email copy for the client: subject `Booking received – SKB-XXXX`. The body includes the amount ₹1,000, the payment ID, the submitted details, and "We'll confirm your slot and send a Google Meet link within 1 working day."
- [ ] **Step 4:** Tests pass.
- [ ] **Step 5:** Commit `feat(worker): booking order, verify, webhook, emails`.

### Task 6: Content layer, layout and design system

**Files:** Create `src/config/site.ts`, `src/lib/content.ts`, `src/lib/seo.ts`, `src/styles/global.css`, `src/layouts/Base.astro`, `src/components/{Header,Footer,Breadcrumbs,WhatsAppButton}.astro`. Test: `tests/site/content.test.ts`

**Interfaces:**
- `fetchTable<T>(table: string, query: string): Promise<T[]>`, which throws on a non-2xx response or a missing env
- `getServices()`, `getFaqs()`, `getArticles()` (published only, ordered by published_at desc), `getPlans(product)`, `getSiteConfig(): Promise<SiteConfig>` (merges `site_config` over `src/config/site.ts` fallbacks)
- `Base.astro` props: `{ title, description, path, jsonLd?: object[], noindex?: boolean, ogType?: 'website'|'article' }`

- [ ] **Step 1: Tests:** `fetchTable` throws when the mocked fetch returns 500; `getSiteConfig` with an empty-string value from Supabase keeps the fallback.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement, using the ui-ux-pro-max guidelines for the design system (tokens from Global Constraints, a sticky header with a "Book consultation" button, a mobile menu, a navy footer with contact details and policy links).
- [ ] **Step 4:** Tests pass. `npm run build` passes.
- [ ] **Step 5:** Commit `feat(site): content layer, base layout, design system`.

### Task 7: Public pages

**Files:** `src/pages/{index,about,services,individuals,business,contact,resources/index,resources/[slug],privacy-policy,terms,disclaimer,cookie-policy,refund-policy,404}.astro`, one page per monitor slug, and `src/components/{Hero,ServiceCard,FaqList,ArticleCard,PlanCard}.astro`. Test: `tests/site/build.test.ts`

- [ ] **Step 1: Test** (runs over `dist/`): for every `<loc>` in the old sitemap (fixture copied to `tests/fixtures/old-sitemap.xml`), the matching `dist/<path>.html` (or `index.html`) exists, has a non-empty `<h1>`, a unique `<title>`, a `<meta name="description">`, and a `<link rel="canonical">` equal to the loc. `dist/refund-policy.html` exists.
- [ ] **Step 2:** Run after a build → FAIL.
- [ ] **Step 3:** Build the pages. Copy comes from the existing site content (extracted from the legacy bundle and Supabase); the monitor pages list plans from `subscription_plans`, with CTAs to `/<monitor>/signup`.
- [ ] **Step 4:** Test passes.
- [ ] **Step 5:** Commit `feat(site): public pages on existing URLs`.

### Task 8: Booking UI

**Files:** `src/pages/appointment.astro`, `src/components/BookingForm.astro`, `src/scripts/booking.ts`, `src/pages/booking/{success,failed}.astro`. Test: extend `tests/site/build.test.ts`

- [ ] **Step 1: Test:** `dist/appointment.html` contains `Consultation fee ₹1,000 (incl. GST)`, `checkout.razorpay.com/v1/checkout.js` and a form with fields name, email, phone and a hidden honeypot `website`. The success and failed pages contain `noindex`, and success contains a `wa.me/` link.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement the client flow: submit → `/api/booking/order` → `new Razorpay({ key, order_id, amount, currency, name: 'CA S K Basak', prefill, theme: { color: '#0f2545' }, handler, modal.ondismiss })` → handler posts to `/api/booking/verify` → `location = /booking/success?ref=`. On a dismissed or failed payment, store the form in sessionStorage and go to `/booking/failed`, which restores it on "Try again". The success page reads `ref` and builds `https://wa.me/${WHATSAPP_NUMBER}?text=` with the ref.
- [ ] **Step 4:** Test passes. Manual: `npx wrangler dev` with `.dev.vars` test keys, then complete a test payment (Razorpay test card / UPI `success@razorpay`) and see the row marked paid and both emails sent.
- [ ] **Step 5:** Commit `feat(site): appointment booking with Razorpay checkout`.

### Task 9: SEO/GEO (geo-audit, geo-schema)

**Files:** `src/lib/seo.ts` (builders), `public/robots.txt`, `public/llms.txt`, `src/pages/sitemap.xml.ts`. Test: extend `tests/site/build.test.ts`

**Interfaces:** `orgJsonLd(cfg)`, `personJsonLd()`, `serviceJsonLd(service)`, `faqJsonLd(faqs)`, `articleJsonLd(article)`, `breadcrumbJsonLd(items)`, `websiteJsonLd()`, each returning a plain object with `@context: 'https://schema.org'`.

- [ ] **Step 1: Test:** every `<script type="application/ld+json">` in dist parses as JSON. The home page includes `@type` `AccountingService`. Each article page includes `Article` and `BreadcrumbList`. `dist/sitemap.xml` lists every old loc plus `/refund-policy`, and excludes `/booking/*` and legacy routes. `robots.txt` keeps the current disallows and adds `Disallow: /booking/` and `Disallow: /api/`. `llms.txt` exists.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement, applying the geo-audit findings.
- [ ] **Step 4:** Test passes.
- [ ] **Step 5:** Commit `feat(seo): JSON-LD, sitemap, robots, llms.txt`.

### Task 10: Final verification and handoff

- [ ] `npm test` and `npm run build` pass; `npx wrangler deploy --dry-run` passes.
- [ ] Local `wrangler dev` smoke test: `/`, `/about`, `/resources/<slug>`, `/admin` (legacy login renders), `/loan-dscr-monitor/dashboard` (legacy), `/nope` (404 page, status 404).
- [ ] Write `docs/GO-LIVE.md`: env var list, Resend DNS, Supabase migration, Razorpay webhook URL `https://ca-sk-basak-consultancy.in/api/booking/webhook`, test payment, switch to live keys. Include the git push commands.
- [ ] Commit `docs: go-live checklist`. **Don't push until the owner approves.**
