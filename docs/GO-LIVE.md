# Go-live guide: Astro site + Razorpay booking on Cloudflare

Branch: `astro-rebuild` · Worker: `caconsultancyservice` · Domain: `ca-sk-basak-consultancy.in`

## Hosting recommendation (short)

The site is a **Cloudflare Worker with static assets**. That's the setup you already run, and it stays the same.
- Astro builds the public pages to static HTML in `dist/`, which Cloudflare serves from its edge.
- The same Worker (`worker/index.ts`) runs the three booking API routes. It also serves your existing tools and admin panel (`/admin`, `/<monitor>/dashboard` and so on) unchanged.

Why Workers rather than Pages or Pages Functions: Cloudflare now directs new projects to Workers, your domain is already attached to this Worker, and one Worker can serve the static files, the API and the secrets together.

## 1. Environment variables

**Plain variables**: in `wrangler.jsonc` → `vars`. They're committed to Git, so never put a secret here. Values in this file override any dashboard values on every deploy.

| Name | Value | Notes |
|---|---|---|
| `RAZORPAY_KEY_ID` | `rzp_test_…` (your test Key ID) | Change to `rzp_live_…` at launch |
| `OWNER_EMAIL` | the address that receives booking alerts | **Replace `REPLACE_ME@example.com`** |
| `WHATSAPP_NUMBER` | digits with country code, e.g. `919830012345` | Reserved for Worker use. The success page's WhatsApp button reads from Admin → Settings → WhatsApp |
| `BOOKING_FROM_EMAIL` | `bookings@ca-sk-basak-consultancy.in` | Must be on a domain verified in Resend |
| `CONSULTATION_FEE_PAISE` | `100000` | ₹1,000 incl. GST |
| `SUPABASE_URL` | `https://htfluyhsaondqacgeyou.supabase.co` | |
| `SITE_URL` | `https://ca-sk-basak-consultancy.in` | |

**Secrets**: set in Cloudflare → Workers & Pages → `caconsultancyservice` → Settings → Variables and Secrets → *Add → Secret*, or with `npx wrangler secret put NAME`. They're never stored in Git.

| Secret | Where to get it |
|---|---|
| `RAZORPAY_KEY_SECRET` | Razorpay Dashboard (Test mode) → Account & Settings → API Keys |
| `RAZORPAY_WEBHOOK_SECRET` | The secret you choose when creating the webhook (step 4) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` key |
| `RESEND_API_KEY` | Resend → API Keys (sending access only) |

**Build-time (public)**: `.env.production` contains only the public Supabase URL and anon key, which already ship in the browser today.

For local testing, copy `.dev.vars.example` to `.dev.vars`, fill in the test secrets, then run `npm run preview`. `.dev.vars` is git-ignored.

## 2. Supabase database change (once)

Supabase → SQL Editor → paste and run `supabase/migrations/2026-11-24-appointment-payments.sql`. It's safe to run twice. It adds `payment_status`, `amount_paise`, `razorpay_order_id`, `razorpay_payment_id` and `paid_at` to `appointments`.

## 3. Resend (confirmation emails)

1. Sign up at resend.com → Domains → Add `ca-sk-basak-consultancy.in`.
2. Resend shows 3–4 DNS records (an MX and a TXT/SPF on a `send` subdomain, a DKIM TXT `resend._domainkey`, and an optional DMARC TXT). Add each one in Cloudflare → DNS exactly as shown, with **DNS only (grey cloud)**.
3. Click Verify in Resend. Create an API key and save it as the `RESEND_API_KEY` secret.

## 4. Razorpay (test mode first)

1. Dashboard in **Test mode** → API Keys → generate. Put the Key ID in `wrangler.jsonc` and the Key Secret in the Cloudflare secret.
2. Settings → Payment capture → **Automatic capture** on. The code also captures `authorized` payments as a fallback.
3. Webhooks → Add:
   - URL: `https://ca-sk-basak-consultancy.in/api/booking/webhook`
   - Secret: a long random string, also saved as `RAZORPAY_WEBHOOK_SECRET`
   - Events: `payment.captured`, `payment.failed`, `order.paid`

## 5. Deploy

Check how the Worker deploys today: Cloudflare → Worker → Settings → Builds.

- **Connected to GitHub (Workers Builds):** set *Build command* to `npm run build` and *Deploy command* to `npx wrangler deploy`. Pushing the branch, or merging it to `main`, deploys it.
- **Manual:** run `npm ci && npm run deploy` from this folder (it asks you to log in with `wrangler login` the first time).

## 6. Test payment checklist (test mode)

- [ ] `/appointment` loads, the form validates, and "Pay ₹1,000 & book" opens Razorpay Checkout
- [ ] Pay with UPI ID `success@razorpay` (or Razorpay's test card) → redirected to `/booking/success?ref=SKB-…`
- [ ] Supabase `appointments` row: `payment_status = paid`, `razorpay_payment_id` filled, visible in Admin → Appointments
- [ ] Client receipt email and owner alert email both arrive, **once each**
- [ ] Razorpay → Webhooks → the delivery for this payment shows 200
- [ ] Pay with `failure@razorpay` → `/booking/failed`; "Try again" keeps the form filled in
- [ ] Close the checkout window → a friendly message appears and the form is still filled in
- [ ] `/admin` and a monitor dashboard (e.g. `/loan-dscr-monitor/dashboard`) still work
- [ ] `/sitemap.xml`, `/robots.txt` and `/llms.txt` load

## 7. Domain and SSL

- The domain is already on Cloudflare and attached to this Worker. Confirm that Worker → Settings → Domains & Routes lists `ca-sk-basak-consultancy.in` (add `www.` too, with a redirect to the apex if you want).
- SSL/TLS: mode **Full (strict)**, *Always Use HTTPS* on, minimum TLS 1.2. HSTS is sent by `public/_headers`.
- AI crawlers (see the audit report): Cloudflare → AI Crawl Control / Security → Bots. Allow PerplexityBot, OAI-SearchBot, ChatGPT-User, Claude-SearchBot and Claude-User. Then decide whether to keep "Manage robots.txt" (it prepends its own rules to `public/robots.txt`).

## 8. Switching to live payments

1. Razorpay account activated. The site already has the required Terms, Privacy, Refund & Cancellation and Contact pages; **contact details must be filled in** first.
2. Razorpay **Live mode** → generate live keys. Update `RAZORPAY_KEY_ID` in `wrangler.jsonc` to `rzp_live_…` and replace the `RAZORPAY_KEY_SECRET` secret.
3. Create the same webhook again **in Live mode** (it's separate from test mode), with a new secret, and update `RAZORPAY_WEBHOOK_SECRET`.
4. Deploy. Make one real ₹1,000 booking yourself, check the row and emails, then refund it from the Razorpay dashboard.

## 9. Before go-live: content you need to supply

- Admin → Settings: phone, WhatsApp (digits with country code), email, office address
- Admin → Profile: real qualification, experience, membership number, photo
- `wrangler.jsonc`: `OWNER_EMAIL`, `RAZORPAY_KEY_ID`
- Optional: profile URLs in `src/config/site.ts` → `SAME_AS`, `PERSON_SAME_AS`
- Review the wording of `src/legal/refund-policy.md` (24-hour reschedule and cancellation rule)

The site reads contact and profile details **at build time**, so trigger a rebuild or redeploy after editing them in Admin.

## 10. Git: push the branch

```bash
cd caconsultancy
```
```bash
git push -u origin astro-rebuild
```

Then open a pull request into `main` on GitHub and merge it when the test checklist passes. If you deploy straight from `main` without review:

```bash
git checkout main && git merge --no-ff astro-rebuild && git push origin main
```

Suggested squash or merge commit message:

```
Rebuild public site in Astro and add Razorpay consultation booking

- Static Astro pages for every existing URL (new design, SEO/GEO, JSON-LD graph)
- Cloudflare Worker: legacy tools/admin unchanged, /api/booking/{order,verify,webhook}
- Server-side Razorpay order creation, HMAC signature + amount verification,
  idempotent paid marking, webhook fallback, Resend confirmation emails
- sitemap.xml, robots.txt, llms.txt, security headers, refund policy page
- Legacy build pruned from ~300 to 42 files
```
