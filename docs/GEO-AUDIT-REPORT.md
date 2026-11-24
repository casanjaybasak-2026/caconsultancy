# GEO + SEO Audit: CA S K Basak

| | |
|---|---|
| Site | https://ca-sk-basak-consultancy.in |
| Audit date | 24 November 2026 |
| Business type | Professional services (CA practice) with local intent (Kolkata) and a publisher section (15 guides) |
| Pages analysed | 37 HTML pages (all public URLs, including the 15 articles), checked on the live site and on the new Astro build |
| Method | Live site checked with curl (raw HTML, robots.txt, headers, crawler user agents) and the in-app browser (rendered text). New build checked by parsing every file in `dist/`. |

Scores are judgement-based estimates on the evidence below, not measurements from an AI platform.

## 1. Executive summary

| Category | Weight | Live site (React SPA) | New Astro build (with fixes applied) |
|---|---|---|---|
| AI citability | 25% | 15 | 68 |
| Brand authority | 20% | 10 | 15 |
| Content E-E-A-T | 20% | 25 | 55 |
| Technical GEO | 15% | 10 | 85 |
| Schema & structured data | 10% | 0 | 70 |
| Platform optimisation | 10% | 10 | 62 |
| **GEO score** | | **13 / 100 (Critical)** | **57 / 100 (Poor, upper end)** |

Computed as `C×0.25 + B×0.20 + E×0.20 + T×0.15 + S×0.10 + P×0.10`.

**Live site.** The live site is close to invisible to AI systems:
- Every page is delivered as an empty `<div id="root">`, so a crawler that doesn't run JavaScript sees about 10 words on `/about`.
- There is no structured data at all.
- Cloudflare is blocking several AI crawlers. One of them, PerplexityBot (a search and answer crawler), gets a hard 403.

**New build.** The new build fixes the technical and structural problems: static HTML on every page, one JSON-LD graph per page, a sitemap with lastmod dates, robots.txt, llms.txt, security headers and stronger answer-style content.

**What still holds the score down:**
- **Missing business details.** There's no phone, email or street address, and no Google Business Profile or LinkedIn presence.
- **Thin About profile.** The qualification and experience fields still contain placeholder text.
- **Cloudflare settings** still block AI crawlers.

All three are owner actions (section 5). Once they're done, the realistic target is **72–78 (Good)**.

## 2. Issues by severity

### Critical

| # | Issue | Where | Fix | Status |
|---|---|---|---|---|
| C1 | Content only appears after JavaScript runs; crawlers get an empty page | All pages (live) | Rebuild the public pages as static HTML (Astro) | **Fixed in new build.** Pages now carry 88–966 words of HTML each. |
| C2 | No structured data anywhere | All pages (live) | JSON-LD graph for each page type (section 4) | **Fixed** |
| C3 | Cloudflare edge returns **403 to PerplexityBot** (also to GPTBot and ClaudeBot) | Zone setting (Bots / AI Crawl Control) | In Cloudflare → AI Crawl Control (or Security → Bots), set search and answer crawlers (PerplexityBot, OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User) to **Allow**. Training crawlers can stay blocked if you prefer. | **Owner action.** Code can't override an edge block. |

### High

| # | Issue | Where | Fix | Status |
|---|---|---|---|---|
| H1 | Cloudflare *Managed robots.txt* is prepended to your robots.txt and disallows GPTBot, ClaudeBot, Google-Extended, Applebot-Extended and others. Its `Content-Signal` line also leaves `ai-input` unset. | `/robots.txt` (live) | Either turn off "Manage robots.txt" so the new file is served as is, or keep it and set `ai-input=yes`. Blocking *training* bots is a reasonable choice. Blocking *search/answer* bots removes you from AI answers. | New robots.txt written. **Owner decision in Cloudflare.** |
| H2 | No llms.txt (live `/llms.txt` returned the SPA's HTML page) | `/llms.txt` | Generated from your content at build time | **Fixed** |
| H3 | No name, address and phone anywhere (all `site_config` contact fields are blank) | Footer, contact page, schema | Fill in phone, WhatsApp, email and address in Admin → Settings, then rebuild. The schema picks them up automatically. | **Owner action** |
| H4 | About page shows placeholder text ("details editable from admin dashboard"). Author credentials are the strongest trust signal for a CA. | `/about` | Placeholders are now hidden. Add real qualification, year qualified, experience, ICAI membership number and a professional photo in Admin → Profile. | Partly fixed; **owner content needed** |
| H5 | No author attribution on articles | `/resources/*` (live) | Byline linking to `/about`, plus Article.author pointing to the Person entity | **Fixed** |

### Medium

| # | Issue | Fix | Status |
|---|---|---|---|
| M1 | FAQ content without FAQPage schema | FAQPage on the home, booking, individuals, business and six monitor pages | **Fixed** |
| M2 | Thin pages: individuals, business and services were 110–230 words with no direct answers | Added answer-first summaries, 4 Q&As each, and a "how engagements and fees work" section | **Fixed** |
| M3 | No security headers (HSTS, nosniff, referrer policy and so on) | `public/_headers` | **Fixed** (no CSP yet, so Razorpay, GA and AdSense keep working; see the 30-day plan) |
| M4 | Article titles over 60 characters with the brand suffix | The suffix is dropped when the title is over 50 characters | **Fixed** |
| M5 | No `sameAs` profiles. AI tools can't connect "CA S K Basak" to the same entity elsewhere | Create a Google Business Profile and LinkedIn pages, then add the URLs to `SAME_AS` / `PERSON_SAME_AS` in `src/config/site.ts` | **Owner action** |
| M6 | Articles don't cite sources (Income Tax Act sections, CBIC/CBDT circulars, portal links) | Add 2–4 authoritative references per article | 30-day plan |
| M7 | No Reddit, YouTube or Quora presence | Answer real questions with links to the guides | 30-day plan |

### Low

| # | Issue | Fix | Status |
|---|---|---|---|
| L1 | Open Graph image is the 512px app icon | Design a 1200×630 OG image | 30-day plan |
| L2 | Sitemap had no `<lastmod>` on core pages | Generated sitemap with lastmod (article dates come from `updated_at`) | **Fixed** |
| L3 | The free health calculator from the old financial-health page isn't in the new page | Rebuild it as a small Astro island, or link to it in the app | 30-day plan |

## 3. Category deep dives

### AI citability (68)

**Strengths:**
- 15 practical, India-specific guides of 600–860 words each, on DSCR, CMA, GST ITC, regime choice and similar topics.
- The new home page opens with a self-contained, fact-dense answer block: who, ICAI, Kolkata, services, remote work.
- The booking FAQs state the price, payment method, timing and policy in plain sentences.

**Before (live home, typical passage):** "A practical approach to financial advisory … Every engagement starts with a clear review…". The passage never says *who*, *where* or *what it costs*, so AI tools can't quote it as an answer.

**After (new home):** "CA S K Basak is a Chartered Accountant (member of ICAI) based in Kolkata, West Bengal, providing income tax, GST, audit, accounting, loan and project advisory, and business consulting to clients across India." This can be quoted on its own.

**Next:**
- Add a 3–4 bullet "Key takeaways" box at the top of each article, written by you. The schema's `speakable` already points to `.article-summary`.
- Include concrete numbers, deadlines and section references in the articles.

### Brand authority (15)

| Platform | Status |
|---|---|
| Google Business Profile | Not found / not linked. **Most important for "CA near me" and Gemini/AI Overviews.** |
| LinkedIn (practice + personal) | Not linked |
| ICAI member directory | Not linked (add once you have the public URL) |
| YouTube / Reddit / Quora | None found |
| Wikipedia / Wikidata | Not applicable for a sole practice |

These checks rely on what the site links to. A wider web search for third-party mentions wasn't done.

### Content E-E-A-T (55)

**Fixed in the new build:**
- Bylines on every article
- Author linked to `/about`
- Published and updated dates
- "General information, not advice" note on every article
- Refund and cancellation policy page

**Missing:**
- Verifiable credentials: year qualified, membership number, years of practice, sectors served
- A real photo
- Client outcomes or anonymised case examples
- Citations to primary sources

### Technical GEO (85)

**New build:**
- Static HTML on every page, served from Cloudflare's edge
- Self-hosted fonts and minimal JavaScript (only the menu, the booking form and the enquiry form)
- HTTPS with HSTS
- Canonical tag on every page
- `noindex` on the booking result pages
- `/admin`, `/api` and account routes excluded in robots.txt
- Mobile layout checked at 375px with no horizontal scroll

**Not measured:** Core Web Vitals on the live domain. Run PageSpeed Insights after go-live.

### Schema (70 / 100 on the geo-schema rubric)

| Page type | JSON-LD types (single `@graph`, server-rendered) |
|---|---|
| Home | AccountingService + ProfessionalService (`#organization`), WebSite (`#website`), Person (`#person`), FAQPage |
| About | Person (with ICAI credential), BreadcrumbList |
| Services | 8 × Service (provider → `#organization`), BreadcrumbList |
| Individuals / Business | Service, FAQPage, BreadcrumbList |
| Appointment | Service with Offer ₹1,000 INR, FAQPage, BreadcrumbList |
| Monitor pages (6) | Service with monthly Offers (UnitPriceSpecification, MON), FAQPage, BreadcrumbList |
| Resources | ItemList of all guides, BreadcrumbList |
| Articles (15) | Article (author → `#person`, publisher → `#organization`, dates, image, speakable), BreadcrumbList |
| Legal / contact | BreadcrumbList |

**Rubric breakdown:**

| Criterion | Points |
|---|---|
| Organization | 10/15 (no telephone yet) |
| sameAs | 0/15 |
| Article + author | 10/10 |
| Business-type schema | 5/10 (no telephone, opening hours or geo) |
| WebSite SearchAction | 0/5 (the site has no search, so it's correctly omitted) |
| Breadcrumbs | 5/5 |
| JSON-LD format | 5/5 |
| Server-rendered | 10/10 |
| speakable | 5/5 |
| Valid | 10/10 |
| knowsAbout | 5/5 |
| No deprecated types | 5/5 |

**To reach 90+:**
1. Fill in phone, email and address in Admin → Settings, then rebuild. `telephone` and `contactPoint` are added automatically.
2. Add the `SAME_AS` URLs.
3. Add opening hours and geo coordinates to `orgJsonLd` in `src/lib/seo.ts` once your office hours and location are confirmed.

Validate after deploy with Google's Rich Results Test and validator.schema.org.

### Platform optimisation (62)

| Platform | Main lever |
|---|---|
| Google AI Overviews / Gemini | Google Business Profile, consistent name/address/phone, FAQ answers |
| ChatGPT search | OAI-SearchBot is allowed on the live site. The new HTML makes the content readable. |
| Perplexity | **Blocked today (403).** Unblock in Cloudflare (C3). |
| Claude | Claude-SearchBot and Claude-User are allowed in the new robots.txt. ClaudeBot (training) is blocked by Cloudflare. |
| Bing Copilot | Submit the sitemap in Bing Webmaster Tools; it can import from Search Console. |

## 4. Fixes applied in code (this branch)

- Astro static rendering for all 37 public pages
- `src/lib/seo.ts`: entity graph with `@id` cross-references, Offers in INR, speakable, ImageObject logo, `contactPoint` when contact details exist, and `SAME_AS` / `PERSON_SAME_AS` hooks
- `src/pages/sitemap.xml.ts`, `public/robots.txt`, `src/pages/llms.txt.ts`
- `public/_headers`: HSTS, nosniff, referrer and frame policies; immutable caching for hashed assets
- Content: answer-first summaries and FAQs on individuals and business; an "At a glance" facts box and approach section on About; a fees section on Services; article bylines and dates
- Tests in `tests/site/build.test.ts` cover all of the above: every old URL, a unique title, a matching canonical, one valid `@graph` per page, sitemap and robots coverage, and no robots rule that blocks a public page

## 5. Quick wins (this week)

1. **Unblock AI search crawlers in Cloudflare** (C3, H1). Without this, Perplexity can't read the site at all.
2. **Fill in your contact details** in Admin → Settings (H3), then rebuild. This feeds the footer, contact page, WhatsApp button and schema.
3. **Complete the About profile** (H4): qualification year, experience, membership number, photo.
4. **Create or claim a Google Business Profile** for the Kolkata practice. Use exactly the same name, address and phone, and link it to the site.
5. **Submit `sitemap.xml`** in Google Search Console and Bing Webmaster Tools after go-live.

## 6. 30-day action plan

**Week 1: foundations**
- [ ] Go live with the new build (see `docs/GO-LIVE.md`)
- [ ] Cloudflare: allow search/answer AI crawlers, and decide on training crawlers
- [ ] Contact details, About profile and photo, then rebuild
- [ ] Search Console + Bing: submit the sitemap and request indexing of the home, services, appointment and about pages
- [ ] Rich Results Test on the home, an article, `/appointment` and `/loan-dscr-monitor`

**Week 2: entity and trust**
- [ ] Google Business Profile: categories "Chartered accountant" and "Tax consultant", services, hours, photos, the booking link
- [ ] LinkedIn personal profile + practice page. Add both URLs to `SAME_AS` / `PERSON_SAME_AS`, then rebuild
- [ ] Ask 3–5 existing clients for Google reviews
- [ ] Design a 1200×630 OG image and update `Base.astro`

**Week 3: content citability**
- [ ] Add "Key takeaways" and 2–4 primary-source citations (sections, circulars, portal links) to the 5 most important guides: tax regime, ITR checklist, GST ITC, DSCR, CMA
- [ ] Publish 2 new guides on high-intent local queries (for example "GST registration in West Bengal: documents and timeline", "ITR filing fees and process with a CA in Kolkata")
- [ ] Refresh `updated_at` on edited articles so the sitemap lastmod and Article.dateModified move

**Week 4: distribution and measurement**
- [ ] Answer 5 relevant questions on Quora or Reddit (r/IndiaTax, r/IndianStartups), linking to the guides where it genuinely helps
- [ ] PageSpeed Insights on the live domain; fix anything below "Good"
- [ ] Add a Content-Security-Policy in report-only mode, then enforce it
- [ ] Re-run this audit, and test AI answers for "chartered accountant in Kolkata for GST", "how to calculate DSCR for bank loan" and "CA consultation fee Kolkata" in ChatGPT, Perplexity and Gemini

## Appendix: checks not verified

- Core Web Vitals on the production domain (the new build isn't deployed yet)
- Third-party brand mentions beyond the links on the site
- Whether the AI crawler 403s come from "Block AI bots", AI Crawl Control or a custom WAF rule. The fix is in one of those Cloudflare screens.
- Google indexing status. Search Console access is needed.
