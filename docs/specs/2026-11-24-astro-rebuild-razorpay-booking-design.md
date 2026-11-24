# Design: Astro public site + Razorpay consultation booking

Date: 2026-11-24 · Site: https://ca-sk-basak-consultancy.in · Owner: CA S K Basak

## 1. Intent

The practice website should (a) look modern and professional, (b) be fully readable by Google and AI search tools so the practice is found and cited, and (c) let a client pay a consultation booking fee online.

Today the repo holds only the **compiled output** of a Vite + React + Supabase single-page app. There is no source code. Every page reaches crawlers as an empty `<div id="root">`, which is the main SEO and AI-visibility problem. The site already runs on Cloudflare as a Worker serving static assets (`wrangler.jsonc`).

## 2. Goals, non-goals, anti-goals

**Goals**
- Rebuild every public page in **Astro** (static HTML) with a refreshed design.
- Keep every existing public URL unchanged.
- A working ₹1,000 (GST inclusive) consultation booking paid through Razorpay. The payment is verified on the server, recorded in Supabase and confirmed by email.
- SEO/GEO: per-page meta, canonical tags, Open Graph, JSON-LD, sitemap, robots.txt and llms.txt.

**Non-goals (this project)**
- Rebuilding the six monitor tools (signup, dashboard, submit, registers) or the admin panel.
- Calendar slot picking, multiple fee tiers, automatic GST invoices, refunds through the site.

**Anti-goals (a failure even if the code "works")**
- Any existing URL returns 404, or search rankings drop because of URL changes.
- The admin panel or the monitor tools stop working.
- The Razorpay Key Secret (or any secret) reaches browser code or Git.
- A booking is marked "paid" without server-side signature and amount verification.

## 3. Constraints

- Hosting: Cloudflare Workers with static assets (already in use). Domain is already on Cloudflare.
- Backend: the existing Supabase project (`htfluyhsaondqacgeyou`). Tables in use: `services`, `faqs`, `articles`, `site_config`, `appointments`, `subscription_plans`, among others.
- Razorpay test mode first. The Key Secret is stored only as a Cloudflare secret.
- Fee: ₹1,000 fixed, GST inclusive (100000 paise, INR).

## 4. Approaches considered

| | Approach | Trade-off |
|---|---|---|
| **A (picked)** | New Astro public site; existing compiled tools/admin kept and served by the same Worker | Fastest route to new look + SEO + payments. Old look remains inside tools/admin. |
| B | Rebuild everything in Astro, tools included | One codebase, consistent look, but several times the effort and risk from minified code with no source; delays payments and SEO. |
| C | Keep the SPA; CSS overrides + prerender snapshots | Fast but fragile; skin-deep redesign. Ruled out. |

The owner picked **A**.

## 5. Architecture

```
repo root
├─ astro.config.mjs, package.json, tsconfig.json
├─ src/            Astro pages, layouts, components, content loaders
├─ public/         favicons, manifest, ads.txt, robots.txt, llms.txt
├─ legacy/         the existing compiled React app (pruned to files index.html actually needs)
│   ├─ app.html    (former index.html)
│   └─ assets/…
├─ worker/index.ts Cloudflare Worker: API routes + legacy routing
├─ scripts/        build step that copies legacy/ into dist/
├─ supabase/migrations/2026-11-24-appointment-payments.sql
├─ wrangler.jsonc
└─ docs/
```

**Build:** `astro build` produces `dist/` (static). A post-build script copies `legacy/app.html` and `legacy/assets/*` into `dist/`. Legacy assets live under `/assets/` and Astro's under `/_astro/`, so their paths don't collide. Content (services, FAQs, articles, plans, contact config) is fetched from Supabase **at build time** using the public anon key.

**Worker routing** (`run_worker_first` for the routes below; everything else is served straight from static assets):
- `/api/booking/*` handled by the Worker (see §6).
- Legacy app routes return `dist/app.html`, and React Router takes over in the browser:
  - `/admin` and `/admin/*`
  - `/<monitor>/<sub>` for the six monitor slugs (`dashboard`, `login`, `signup`, `submit`, `payment-status`, `loans`, `receivables`, `payables`, `actions`, `facilities`, `budget`)
- Unknown paths return Astro's `404.html` with status 404.

**Astro pages (same URLs as today):** `/`, `/about`, `/services`, `/individuals`, `/business`, `/appointment`, `/contact`, `/resources`, `/resources/[slug]` (15 articles), the six monitor landing pages (with plans from `subscription_plans`; CTAs link into the legacy signup/login), `/privacy-policy`, `/terms`, `/disclaimer`, `/cookie-policy`.
**New pages:** `/refund-policy` (Razorpay requires a refund/cancellation policy for live activation), `/booking/success`, `/booking/failed` (both `noindex`).

**Kept as is:** Google Analytics (G-NF8YPK6ZJH), AdSense script and `ads.txt`, the Search Console verification tag, and the PWA manifest and icons.

## 6. Booking and payment flow

1. On `/appointment` the client fills in the existing fields (name, email, phone, client type, service, preferred date and time, communication method, description) and sees "Consultation fee ₹1,000 (incl. GST)".
2. The browser calls `POST /api/booking/order`. The Worker validates the input (and a honeypot field), creates a Razorpay order (`amount: 100000`, `currency: INR`, `receipt: appt_<id>`, notes), inserts an `appointments` row with `payment_status = 'pending'` and `razorpay_order_id`, then returns `{order_id, key_id, amount, prefill}`. **The amount always comes from the server, never the browser.**
3. Razorpay Checkout opens in the browser.
4. On success, the browser calls `POST /api/booking/verify` with `razorpay_order_id`, `razorpay_payment_id` and `razorpay_signature`. The Worker:
   - checks HMAC-SHA256(`order_id|payment_id`, KEY_SECRET) against the signature using a constant-time comparison;
   - fetches the payment from the Razorpay API and confirms it is `captured` (or `authorized`, then captures it), with amount 100000 and the matching order_id;
   - updates the row to `payment_status = 'paid'` and sets `razorpay_payment_id` and `paid_at`. This update is conditional (`where payment_status <> 'paid'`) so it only happens once;
   - only if this call changed the row: sends the emails (step 6);
   - returns a booking reference. The browser redirects to `/booking/success?ref=…`.
5. **Webhook** `POST /api/booking/webhook` (events `payment.captured`, `order.paid`, `payment.failed`). The Worker checks `X-Razorpay-Signature` with WEBHOOK_SECRET against the raw body, then applies the same idempotent "mark paid + email" step, or marks the booking `failed`. This covers clients who close the tab before step 4 completes.
6. **Emails** (Resend API, from `bookings@ca-sk-basak-consultancy.in`):
   - To the client: payment receipt (amount, payment ID, booking ref), the details they submitted, and "We'll confirm your slot and send a Google Meet link within 1 working day."
   - To the owner (OWNER_EMAIL): the booking details and a link to the admin appointments page.
7. **Success page:** a summary, the booking ref and a **WhatsApp button** (`wa.me/<number>` with a prefilled message containing the booking ref).
   **Failed page:** what happened, a "Try again" link back to `/appointment` with the form prefilled from sessionStorage, and a contact link.
8. The owner confirms the time slot and sends the Meet link manually, as today.

**Database migration** (the owner runs it once in the Supabase SQL editor; I provide the file): add to `appointments` the columns `payment_status text default 'unpaid'`, `amount_paise int`, `razorpay_order_id text unique`, `razorpay_payment_id text`, `paid_at timestamptz`, and an index on `razorpay_order_id`. Existing rows stay valid. The Worker writes with the **service-role key** (a secret), so RLS stays unchanged for the browser.

## 7. Design direction

- Brand: "CA S K Basak, Chartered Accountant & Financial Consultant".
- Palette (kept for recognition): navy `#0f2545` / deep `#081729`, gold `#a9812f` / soft `#c9a86a`, paper `#fcfbf8` / dim `#f4f2ec`, ink `#3a4453`, line `#e2ded2`.
- Type: Fraunces (headings), Inter (body), self-hosted for speed.
- Layout: editorial and trustworthy, with clear "Book a consultation – ₹1,000" calls to action, service cards, a "how it works" section (Book → Pay → Confirm → Meet), FAQ, latest articles and the monitor tools.
- Mobile-first, accessible to WCAG AA contrast, no layout shift, minimal JavaScript (only the booking form and the mobile menu).
- Logo: the existing `favicon.svg` mark plus a wordmark.

## 8. Configuration

**Cloudflare Worker variables (plain):** `RAZORPAY_KEY_ID` (test key first), `SUPABASE_URL`, `OWNER_EMAIL`, `BOOKING_FROM_EMAIL`, `CONSULTATION_FEE_PAISE=100000`, `SITE_URL`, `WHATSAPP_NUMBER`.
**Cloudflare Worker secrets:** `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`.
**Build-time (public):** `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`.
Local development uses `.dev.vars` (git-ignored).

## 9. SEO / GEO

Covered in the geo-audit and geo-schema steps: unique titles and descriptions, canonical tags, Open Graph and Twitter cards, `AccountingService`/`ProfessionalService` + `Person` + `Service` + `FAQPage` + `Article` + `BreadcrumbList` JSON-LD, an auto-generated sitemap with lastmod, robots.txt (keep the current disallows, add AI crawler allowances) and llms.txt.

## 10. Left to the builder

Component structure, exact copy wording (based on current site content), how strictly to validate form input, styling of the email templates, and the exact list of legacy files to prune (whatever `app.html` actually imports, traced transitively).

## 11. Open items (owner, before go-live, not blocking the build)

- Contact details: phone, WhatsApp, email and office address are blank in `site_config`. They'll be read at build time from `site_config` (editable in the admin panel), with fallbacks in `src/config/site.ts`. They're needed for the footer, the contact page, the WhatsApp button and LocalBusiness schema.
- OWNER_EMAIL (where booking notifications go).
- Resend account plus the DNS records for the sending domain.
- Razorpay test Key ID, Key Secret and webhook secret, entered in Cloudflare.
- Review the refund/cancellation policy wording.
- Confirm how the Worker is deployed today (Workers Builds connected to GitHub vs `wrangler deploy`). The build command changes to `npm run build`.

## 12. Change (24 Nov 2026): Cloudflare-native bookings (approved by owner)

The owner asked to use Cloudflare instead of Supabase, a domain email address, Resend for automatic emails, and WhatsApp alerts. Phase 1 (done):
- **Bookings and enquiries** are stored in **Cloudflare D1** (`skb-bookings`, schema in `migrations/`), replacing the Supabase `appointments` change. Paid-once logic uses an atomic `UPDATE … WHERE payment_status <> 'paid' RETURNING *`.
- **Contact form** posts to `POST /api/enquiry` on the Worker (D1 + owner email + WhatsApp) instead of writing to Supabase from the browser.
- **Emails** are sent by Resend from `bookings@ca-sk-basak-consultancy.in`. Client replies go to that address, which **Cloudflare Email Routing** forwards to the owner's Gmail.
- **WhatsApp alerts** go to the owner's own number via CallMeBot (secret `CALLMEBOT_API_KEY`, var `OWNER_WHATSAPP`). Messaging clients on WhatsApp would need the Meta WhatsApp Business API and is out of scope.
- **`/manage`** is a Worker-rendered list of bookings and enquiries with CSV export. It's protected by **Cloudflare Access**, and the Worker also verifies the Access JWT (RS256, audience, issuer, expiry), failing closed if not configured.

Phase 2 (later, separate project): rebuild the monitor tools and admin on Cloudflare, then retire Supabase. Until then the legacy app and the build-time content (articles, services, FAQs, profile, contact settings) stay on Supabase.
