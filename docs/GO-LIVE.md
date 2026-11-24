# Go-live guide (Cloudflare edition)

Everything runs on Cloudflare: domain, website, payment API, **D1 database**, **Email Routing**, and the **Access** login for your bookings page. Resend sends the automatic emails and a Telegram bot sends instant alerts to your phone (CallMeBot WhatsApp is supported too, but its free bot is often full).

```
Client books & pays ₹1,000 ─► Cloudflare Worker ─► D1 database "skb-bookings"
                                   ├─► Resend: receipt email to the client   (from booking@ca-sk-basak-consultancy.in)
                                   ├─► Resend: alert email to you
                                   └─► Telegram: instant alert to your phone (with a tap-to-WhatsApp link to the client)
Client replies to the email ─► Cloudflare Email Routing ─► your Gmail
Contact-form enquiries ─► D1 + email + Telegram alert to you
You view everything at https://ca-sk-basak-consultancy.in/manage (Cloudflare Access login)
```

**Already done for you:**
- GitHub and Cloudflare are connected.
- D1 database `skb-bookings` is created (ID `6fa77f66-a88d-4274-89ed-0f6274c78db8`, region APAC), and its tables are created.

**Still on Supabase for now:** the monitor tools, subscriptions, the old admin panel, and the articles, services and FAQs content. That old compiled app can't be moved without rebuilding it.

---

## Do these in this order

### Step 1: Check the domain (2 min)
1. Go to **dash.cloudflare.com** → click **ca-sk-basak-consultancy.in**. The status should be **Active**.
2. **Workers & Pages → caconsultancyservice → Settings → Domains & Routes.** `ca-sk-basak-consultancy.in` should be listed. To add `www`, click **+ Add → Custom domain → `www.ca-sk-basak-consultancy.in`**.
3. **SSL/TLS → Overview** → mode **Full (strict)**. Then **SSL/TLS → Edge Certificates** → **Always Use HTTPS: On**.

### Step 2: Email Routing, to receive email at your domain (5 min, free)
1. Your domain → **Email → Email Routing → Get started**.
2. Click **Add records and enable**. Cloudflare adds the MX and SPF records itself.
3. **Destination addresses → Add destination address** → your Gmail → open Gmail and click **Verify**.
4. **Routing rules → Create address:**
   - `booking` → Send to → your Gmail
   - `info` → Send to → your Gmail
5. Test it: from another email account, send a message to `info@ca-sk-basak-consultancy.in`. It should arrive in Gmail.

### Step 3: Resend, to send the automatic emails (10 min, free up to 3,000 a month)
1. Sign up at **resend.com** (you can use your Gmail).
2. **Domains → Add domain** → `ca-sk-basak-consultancy.in`, region **Tokyo (ap-northeast-1)**.
3. If Resend offers **"Sign in to Cloudflare" / auto-configure**, use it. Otherwise copy each record into **Cloudflare → DNS → Records → Add record**, matching Type, Name and Value exactly, with **Proxy status: DNS only (grey cloud)**.
   - The records go on `send` and `resend._domainkey`, so they don't clash with Email Routing.
4. Click **Verify DNS records** and wait until it shows **Verified**.
5. **API Keys → Create API key** → permission **Sending access** → copy the key (you only see it once).

### Step 4: Telegram, for instant alerts to your phone (5 min, free)
1. Install Telegram and open **@BotFather** (the one with the blue tick). Send `/newbot`, then give it a name and a username ending in `bot`. Copy the **token**.
2. Open your new bot, tap **Start** and send `hi`.
3. In a browser, open `https://api.telegram.org/bot<TOKEN>/getUpdates` and copy the number after `"chat":{"id":`. That's your **chat ID**.

### Step 5: Razorpay test keys and webhook (10 min)
1. **dashboard.razorpay.com** → switch to **Test mode** (toggle at the top).
2. **Account & Settings → API Keys → Generate test key.** Copy the **Key ID** and the **Key Secret**.
3. **Account & Settings → Payment capture → Automatic capture.**
4. **Account & Settings → Webhooks → + Add new webhook:**
   - URL: `https://ca-sk-basak-consultancy.in/api/booking/webhook`
   - Secret: make up a long random password and copy it
   - Events: `payment.captured`, `payment.failed`, `order.paid` → **Create**

### Step 6: Cloudflare Access, to protect your bookings page (5 min, free)
1. Cloudflare left menu → **Zero Trust**. The first time, pick a team name (e.g. `skbasak`) and the **Free** plan.
2. **Access → Applications → Add an application → Self-hosted.**
   - Application name: `Bookings`
   - Domain: `ca-sk-basak-consultancy.in`, Path: `manage`
   - Add a second destination with the same domain and path `manage/*`
3. **Policy:** name `Owner`, Action **Allow**, Include → **Emails** → your Gmail. Save.
4. Open the application again → **Overview** and copy the **Application Audience (AUD) Tag**.
5. Note your **team domain**: `yourteam.cloudflareaccess.com` (shown in Zero Trust → Settings → Custom pages).

### Step 7: Send me these values (not secret, safe to paste in chat)
| What | Example |
|---|---|
| Razorpay **test Key ID** | `rzp_test_xxxxxxxx` |
| Access **team domain** | `skbasak.cloudflareaccess.com` |
| Access **AUD tag** | long code from Step 6.4 |

I'll put them in `wrangler.jsonc` (`RAZORPAY_KEY_ID`, `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`). Your Gmail and WhatsApp number are secrets (Step 8) because the GitHub repo is public.

### Step 8: Add the six secrets in Cloudflare (yourself; never paste these in chat)
**Workers & Pages → caconsultancyservice → Settings → Variables and Secrets → + Add**, Type **Secret**:

| Name | Value from |
|---|---|
| `RAZORPAY_KEY_SECRET` | Step 5.2 |
| `RAZORPAY_WEBHOOK_SECRET` | Step 5.4 (the password you made) |
| `RESEND_API_KEY` | Step 3.5 |
| `TELEGRAM_BOT_TOKEN` | Step 4.1 |
| `TELEGRAM_CHAT_ID` | Step 4.3 |
| `OWNER_EMAIL` | your Gmail (booking and enquiry alerts) |

### Step 9: Fill in your public details (old admin panel)
At `https://ca-sk-basak-consultancy.in/admin`, log in:
- **Settings:** phone, WhatsApp, email (use `info@ca-sk-basak-consultancy.in`), office address
- **Profile:** qualification, experience, membership number, photo

The website reads these when it builds, so do this **before** Step 10.

### Step 10: I deploy
Tell me "deploy". I'll run the tests, build, deploy with Wrangler, and push the `astro-rebuild` branch to GitHub.

### Step 11: Test payment (test mode, no real money)
1. Open `https://ca-sk-basak-consultancy.in/appointment`, fill in the form with your own email, and click **Pay ₹1,000 & book**.
2. In Razorpay checkout choose **UPI** → enter `success@razorpay`.
3. Check each of these:
   - [ ] The "Payment received" page shows `SKB-XXXXXXXX`
   - [ ] Receipt email in your inbox (from `booking@…`)
   - [ ] Alert email to your Gmail
   - [ ] Telegram alert on your phone
   - [ ] `https://ca-sk-basak-consultancy.in/manage` → log in with the email code → the booking shows as **paid**
   - [ ] Reply to the receipt email → it arrives in your Gmail (via Email Routing)
4. Try again with `failure@razorpay` → you should see "Payment not completed".
5. Send a message from the **Contact** page → you get an email and a Telegram alert, and it appears in `/manage` → Enquiries.

### Step 12: Switch to real payments
1. Razorpay must have activated your account (it checks your Terms, Privacy, **Refund & Cancellation** and Contact pages, which are all on the site).
2. Switch to **Live mode** → generate live keys → send me the live Key ID (`rzp_live_…`), and replace `RAZORPAY_KEY_SECRET` in Cloudflare.
3. **Live mode → Webhooks:** add the same webhook again with a new password, and replace `RAZORPAY_WEBHOOK_SECRET`.
4. I redeploy. Make one real ₹1,000 booking, check it, then refund it from Razorpay.

---

## Reference

**Plain settings** (`wrangler.jsonc` → `vars`, committed to the public repo, so no secrets or personal details): `RAZORPAY_KEY_ID`, `BOOKING_FROM_EMAIL` (`booking@ca-sk-basak-consultancy.in`), `CONSULTATION_FEE_PAISE` (`100000`), `SITE_URL`, `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`.
Values in this file override dashboard values on every deploy, so change them here.

**Secrets** (Cloudflare dashboard only): `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RESEND_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `OWNER_EMAIL` (optional WhatsApp via CallMeBot: `CALLMEBOT_API_KEY`, `OWNER_WHATSAPP`).

**Database:**
- Schema in `migrations/`. Apply new ones with `npx wrangler d1 migrations apply skb-bookings --remote`.
- Quick look from a terminal: `npx wrangler d1 execute skb-bookings --remote --command "SELECT * FROM bookings ORDER BY created_at DESC LIMIT 20"`.
- Or use the Cloudflare dashboard → **Storage & Databases → D1 → skb-bookings → Console**.

**Local testing:** copy `.dev.vars.example` to `.dev.vars`, fill in the test secrets, then run `npx wrangler d1 migrations apply skb-bookings --local` and `npm run preview`.

**Git:**
```bash
git push -u origin astro-rebuild
```
Then open a pull request into `main` on GitHub and merge it.
