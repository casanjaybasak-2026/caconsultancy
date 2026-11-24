# Beginner's setup guide: where to click, and how to know it worked

**How to use this guide:**
- Do one step at a time.
- After each step, type **"check step N"** in chat. For steps 1, 2, 3 and 8 I can check it myself from here.
- **Lost in Cloudflare?** Press **Ctrl+K** (Windows) or **Cmd+K** (Mac), or click the search box at the top, and type the menu name (e.g. "Email Routing"). Cloudflare sometimes moves menus around, but search always finds them.

## Where you are now (checked 24 Nov 2026)

| Step | Status |
|---|---|
| 1. Domain / SSL | ✅ `www` added, HTTPS forced |
| 2. Email Routing | ✅ Enabled; `info@` and `booking@` forward to Gmail |
| 3. Resend | 🟡 DNS records are **already added** (Tokyo). You still need to confirm "Verified" and create an API key |
| 4. CallMeBot | ❓ I can't check this; it's on your phone |
| 5. Razorpay | ❓ I can't check this; it's in your Razorpay account |
| 6. Cloudflare Access | ❓ I can check it after deploy |
| 8. Secrets | ❌ None added yet |

---

## Step 1: Fix `www` and force HTTPS (5 min)

**A. Make `www.ca-sk-basak-consultancy.in` work**
1. Open **https://dash.cloudflare.com** and log in.
2. In the left menu, click **Workers & Pages**. It may sit under **Compute (Workers)**; if you can't find it, search "Workers & Pages".
3. Click your Worker **caconsultancyservice**.
4. Click the **Settings** tab, then find the **Domains & Routes** section.
5. Click **+ Add**, then **Custom domain**.
6. Type `www.ca-sk-basak-consultancy.in` and click **Add domain**.
7. If Cloudflare says a DNS record already exists for `www`:
   - Go to your domain → **DNS → Records**.
   - Find the `www` row, click **Edit → Delete**.
   - Come back and repeat step 6.

✅ **It worked when:** Domains & Routes lists both `ca-sk-basak-consultancy.in` and `www.ca-sk-basak-consultancy.in`, and opening `https://www.ca-sk-basak-consultancy.in` shows your website instead of an error page. It can take 2–5 minutes.

**B. Always use HTTPS**
1. Go back to the dashboard home page and click your domain **ca-sk-basak-consultancy.in**.
2. In the left menu, click **SSL/TLS → Overview**. Set the encryption mode to **Full (strict)**.
3. In the left menu, click **SSL/TLS → Edge Certificates**. Scroll to **Always Use HTTPS** and switch it **On**.

✅ **It worked when:** typing `http://ca-sk-basak-consultancy.in` in your browser changes to `https://` by itself.

👉 Type **"check step 1"** in chat.

---

## Step 2: Email Routing, to receive email at your domain (5 min)

1. Click your domain **ca-sk-basak-consultancy.in**.
2. In the left menu, click **Email → Email Routing**.
3. Click **Get started** (or **Enable Email Routing**).
4. If it asks for a first address, type `info`, set **Destination** to your Gmail, and click **Create and continue**.
5. Cloudflare shows the DNS records it needs. Click **Add records and enable**.
6. **Open your Gmail.** Find the email from Cloudflare ("Verify your email address") and click **Verify email address**.
7. Back in Cloudflare, go to **Email Routing → Routing rules → Create address**:
   - Custom address: `booking`
   - Action: **Send to an email**
   - Destination: your Gmail
   - Click **Save**.

✅ **It worked when:**
- the **Email Routing** page shows a green **Enabled**;
- **Destination addresses** shows your Gmail as **Verified**;
- **Routing rules** lists both `info@` and `booking@`;
- **Test:** from any other email account (or a friend's phone), send a message to `info@ca-sk-basak-consultancy.in`. It should land in your Gmail within a minute. Check the Spam folder too.

❗ **If you see "DNS records conflict"**, click **Fix records** or let Cloudflare replace them. Don't touch the records starting with `send` or `resend._domainkey`; those belong to Resend.

👉 Type **"check step 2"**.

---

## Step 3: Resend, to send automatic emails (5 min; your DNS is already done)

1. Open **https://resend.com** and log in. If you've never signed up, click **Sign up** and use your Gmail.
2. In the left menu, click **Domains**.
3. You should see `ca-sk-basak-consultancy.in`.
   - **If it says "Verified" (green):** go to step 4.
   - **If it says "Pending" or "Failed":** click the domain, then click **Verify DNS Records** (or **Restart**). Wait 5 minutes.
   - **If no domain is listed:** it was added from a different Resend account. Click **Add Domain** → type `ca-sk-basak-consultancy.in` → region **Tokyo (ap-northeast-1)**, then tell me and I'll check that the records match.
4. In the left menu, click **API Keys → Create API Key**.
   - Name: `website`
   - Permission: **Sending access**
   - Domain: `ca-sk-basak-consultancy.in`
   - Click **Add**.
5. **Copy the key** (it starts with `re_`) and save it somewhere safe, like a note on your phone. You can only see it once. **Don't paste it in chat.**

✅ **It worked when:** the domain shows **Verified**, and you have a key starting with `re_` saved.

👉 Type **"check step 3"**. I can confirm the DNS side.

---

## Step 4: CallMeBot, for WhatsApp alerts on your phone (3 min)

1. On your phone or computer, open **https://www.callmebot.com/blog/free-api-whatsapp-messages/**.
2. Find the phone number they list. It changes from time to time; use the one shown on that page.
3. Save that number in your phone contacts as **CallMeBot**.
4. Open **WhatsApp**, start a chat with **CallMeBot**, and send exactly: `I allow callmebot to send me messages`
5. Within a minute or two you'll get a reply like "API Activated for your phone number. Your APIKEY is **123456**".
6. Save that APIKEY number. **Don't paste it in chat.**

✅ **It worked when:** you received the reply with your APIKEY.

❗ **No reply after 2 minutes?** Wait 24 hours and try again. Their service sometimes queues new users.

---

## Step 5: Razorpay test mode (10 min)

1. Open **https://dashboard.razorpay.com** and log in.
2. At the top of the page, find the switch that says **Test Mode / Live Mode**. Switch to **Test Mode**; the page gets an orange or yellow "Test mode" banner.
3. **API keys:**
   - Left menu → **Account & Settings**, then find **API Keys** (or search "API keys").
   - Click **Generate Test Key** (or **Regenerate**).
   - A box shows the **Key Id** (starts with `rzp_test_`) and the **Key Secret**. Click **Download Key Details** to save both.
   - You can send me the **Key Id** in chat. **Keep the Secret private.**
4. **Automatic capture:**
   - **Account & Settings** → find **Payment Capture** (or search "capture").
   - Choose **Automatic capture**, set the time to **12 minutes**, then **Save**.
5. **Webhook:**
   - **Account & Settings → Webhooks** → click **+ Add New Webhook**.
   - **Webhook URL:** `https://ca-sk-basak-consultancy.in/api/booking/webhook`
   - **Secret:** make up a long password (e.g. 4 random words plus numbers). Write it down, because you'll need it in Step 8.
   - **Alert email:** your Gmail.
   - **Active events:** tick **payment.captured**, **payment.failed** and **order.paid**.
   - Click **Create Webhook**.

✅ **It worked when:** you have the `rzp_test_…` Key Id, the Key Secret, and your webhook password saved, and the webhook shows in the list as **Enabled**.

---

## Step 6: Cloudflare Access, the login for your bookings page (10 min)

1. In Cloudflare, click **Zero Trust** in the left menu. It opens a new dashboard.
2. **First time only:**
   - Choose a **team name**, e.g. `skbasak`. Write it down; your team domain will be `skbasak.cloudflareaccess.com`.
   - Choose the **Free** plan. It may ask for a card for verification, but the Free plan costs ₹0.
3. In the left menu, click **Access → Applications** (newer layout: **Access controls → Applications**). Click **+ Add an application**.
4. Choose **Self-hosted**.
5. Fill in:
   - **Application name:** `Bookings`
   - **Session duration:** 24 hours
   - **Public hostname / Application domain:** subdomain *empty*, domain `ca-sk-basak-consultancy.in`, path `manage`
   - Click **+ Add public hostname** and repeat with path `manage/*`.
6. Click **Next** (or **Add policy**).
   - **Policy name:** `Owner only`
   - **Action:** **Allow**
   - **Include → Selector: Emails →** type your Gmail
7. Click **Next**, then **Add application** / **Save**.
8. Open the application you just made: **Access → Applications → Bookings → Edit → Overview** (or **Basic information**). Copy the **Application Audience (AUD) Tag**, a long string of letters and numbers.

✅ **It worked when:** **Bookings** appears in the Applications list, and you have the **team domain** and the **AUD tag** noted. The AUD tag is safe to send me.

---

## Step 7: Send me these 3 things in chat (they're not secrets)

```
Razorpay test Key Id:   rzp_test_...
Access team domain:     yourteam.cloudflareaccess.com
Access AUD tag:         ...
```

Your Gmail and WhatsApp number go into Cloudflare as secrets in Step 8, so they never appear in the public GitHub repo.

---

## Step 8: Add 6 secrets in Cloudflare (5 min, do this yourself)

1. Cloudflare → **Workers & Pages → caconsultancyservice → Settings**.
2. Find **Variables and Secrets** and click **+ Add**.
3. For each row below:
   - set **Type** to **Secret**;
   - type the **Variable name** *exactly* as shown (capital letters, underscores);
   - paste the value;
   - click **Deploy** (or **Save**).

| Variable name | What to paste |
|---|---|
| `RAZORPAY_KEY_SECRET` | Razorpay Key Secret (Step 5.3) |
| `RAZORPAY_WEBHOOK_SECRET` | the webhook password you made (Step 5.5) |
| `RESEND_API_KEY` | the `re_…` key (Step 3.5) |
| `CALLMEBOT_API_KEY` | the APIKEY number (Step 4.5) |
| `OWNER_EMAIL` | your Gmail, where booking and enquiry alerts go |
| `OWNER_WHATSAPP` | your WhatsApp number with country code, no + or spaces (e.g. `919830012345`) |

✅ **It worked when:** all six names appear in the list, each showing as **Secret** with the value hidden.

👉 Type **"check step 8"**. I can see the names (never the values).

---

## Step 9: Your details on the website (10 min)

1. Open **https://ca-sk-basak-consultancy.in/admin** and log in with your admin email and password.
2. **Settings:**
   - Phone, e.g. `+91 98300 12345`
   - WhatsApp, e.g. `919830012345`
   - Email: `info@ca-sk-basak-consultancy.in`
   - Office address: full address with PIN code
   - Click **Save**.
3. **Profile:** replace the placeholder text with:
   - qualification, e.g. "Chartered Accountant (ICAI), qualified 20XX";
   - experience, e.g. "X years in tax, audit and bank finance";
   - your ICAI membership number;
   - a professional photo.
   - Click **Save**.

✅ **It worked when:** both pages save without errors.

---

## Step 10: Type "deploy" in chat

I'll run all the tests, build the site, put it live on Cloudflare and push the code to GitHub. Then I'll check each page myself.

---

## Step 11: Test payment (no real money in test mode)

1. Open **https://ca-sk-basak-consultancy.in/appointment** in your browser.
2. Fill in your name, **your own email** and phone, tick the terms box, and click **Pay ₹1,000 & book**.
3. In the Razorpay window, choose **UPI**, type `success@razorpay` and click **Pay**.
4. Tick off each of these:
   - [ ] You see **"Payment received — thank you"** with a code like `SKB-1A2B3C4D`
   - [ ] **Email to you as the client:** "Booking received – SKB-…" (check Spam the first time and mark it **Not spam**)
   - [ ] **Email to your Gmail:** "New paid booking SKB-…"
   - [ ] **WhatsApp:** "✅ New paid booking SKB-…"
   - [ ] Open **https://ca-sk-basak-consultancy.in/manage**, enter your Gmail, get the 6-digit code from Gmail, type it in, and the booking shows as **paid**
   - [ ] Reply to the "Booking received" email. The reply should come back to your Gmail.
5. Repeat with UPI `failure@razorpay`. You should see **"Payment not completed"**.
6. Send a message from **https://ca-sk-basak-consultancy.in/contact**. You should get an email and a WhatsApp, and it appears under **/manage → Enquiries**.

If any box isn't ticked, tell me which one and I'll fix it.

---

## Step 12: Go live with real payments (after Razorpay approves your account)

1. Razorpay → switch to **Live Mode** → **API Keys → Generate Live Key**.
   - Send me the `rzp_live_…` Key Id.
   - In Cloudflare, update `RAZORPAY_KEY_SECRET` with the **live** secret: open the secret, click **Edit**, paste, then **Deploy**.
2. Razorpay **Live Mode → Webhooks → Add New Webhook**: same URL and events as before, with a **new** password. Update `RAZORPAY_WEBHOOK_SECRET` in Cloudflare.
3. Type **"deploy live"**.
4. Book once with real money, check that everything arrives, then refund yourself from Razorpay → **Transactions → Payments → (your payment) → Issue Refund**.
