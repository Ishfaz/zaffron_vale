# Zaffron Valley — Launch Guide

Everything left between the current repo and a live, paid-bookings-taking business site.
Do it in this order. **Prices below are approximate and change constantly — always
confirm the number at checkout, and specifically confirm the RENEWAL price, not just
the first-year price.**

---

## 1. Buy the domain

**Target:** `zaffronvalley.com`

Check availability first at [instantdomainsearch.com](https://instantdomainsearch.com)
or straight in a registrar's search box. If `zaffronvalley.com` is gone, in order of
preference: `zaffronvalley.co`, `thezaffronvalley.com`, `zaffronvalleykashmir.com`,
`zaffronvale.com`. Avoid hyphens and avoid `.net` — for a business people will type
from a card or an Instagram bio, `.com` or nothing.

### Where to buy — cheapest that isn't a trap

| Registrar | 1st year (approx) | Renewal (approx) | Notes |
|---|---|---|---|
| **Cloudflare Registrar** | ~$10 / ₹900 | **~$10 / ₹900** | Sold at wholesale cost, never marked up. Free WHOIS privacy. **Cheapest over 3+ years.** Must use Cloudflare's nameservers — fine with Netlify. |
| **Porkbun** | ~$10 / ₹900 | ~$11 / ₹1,000 | Free WHOIS privacy, clean UI, no upsell pressure. |
| **Namecheap** | ~$6 / ₹550 | ~$15 / ₹1,300 | Cheap year one, then jumps. Free privacy. |
| **Hostinger / BigRock** | ₹99–799 | ₹1,200–1,800 | Very cheap bait year, expensive after. INR billing, UPI accepted. |
| **GoDaddy India** | ₹99–499 | ₹1,500–2,000+ | Cheapest teaser, worst renewal, heaviest upselling. |
| **Netlify** | ~$15 / ₹1,300 | ~$15 / ₹1,300 | One-click, zero DNS work. You pay for convenience. |

**Recommendation:** buy at **Cloudflare Registrar**. Boring, no teaser pricing, no
upsells, and it's the cheapest total cost of ownership. If you'd rather pay in INR by
UPI, use Hostinger for year one — then transfer to Cloudflare after 60 days (ICANN
blocks transfers for the first 60 days after registration).

**Money-saving trick:** buy the cheap ₹99 first year somewhere, set a calendar
reminder for month 11, transfer out to Cloudflare before renewal. The transfer adds
a year, so you never pay the inflated renewal.

**Do NOT buy:** the "SSL certificate", "site lock", "business email hosting", or
"WHOIS privacy" add-ons the registrar pushes at checkout. Netlify gives you SSL free,
and privacy is free at Cloudflare and Porkbun.

---

## 2. Hosting — you're already done

You are on **Netlify free tier** (`ubiquitous-tulumba-9d2b34.netlify.app`), auto-deploying
from GitHub `main`. Do not move. Free tier gives you 100 GB bandwidth/month, 300 build
minutes, and 125,000 function invocations — a tourism site would need thousands of
visitors a day to come close. **Cost: ₹0.**

The only thing Netlify can't do free is the domain itself.

---

## 3. Connect the domain to Netlify

Netlify → your site → **Domain management** → *Add a domain* → type `zaffronvalley.com`.
Netlify then gives you two paths — pick **A**.

### Option A — let Netlify run DNS (easiest)

Netlify shows you four nameservers like:

```
dns1.p03.nsone.net
dns2.p03.nsone.net
dns3.p03.nsone.net
dns4.p03.nsone.net
```

Go to your registrar → your domain → **Nameservers** → *Custom* → paste all four →
save. Wait 15 minutes to 24 hours. Netlify then issues the free Let's Encrypt SSL
certificate automatically and handles `www` → apex redirects for you.

> Caveat: if you bought at **Cloudflare Registrar**, you cannot change nameservers away
> from Cloudflare. Use Option B instead.

### Option B — keep DNS at your registrar (required for Cloudflare)

Add these two records in your registrar's DNS panel:

| Type | Name / Host | Value | Proxy |
|---|---|---|---|
| A | `@` (or blank) | `75.2.60.5` | **DNS only — grey cloud** |
| CNAME | `www` | `ubiquitous-tulumba-9d2b34.netlify.app` | **DNS only — grey cloud** |

**On Cloudflare, the orange proxy cloud must be OFF for both.** Leaving it on causes
an SSL handshake loop between Cloudflare and Netlify and your site shows an error.
Then in Netlify → Domain management → **Verify DNS configuration** → wait for
"Netlify certificate: Active".

### Then update these two files

Once the domain is live, replace the netlify.app URLs so Google indexes the real domain:

- `sitemap.xml` — all 8 `<loc>` entries
- `robots.txt` — the `Sitemap:` line

---

## 4. Email

### Right now (free, 5 minutes)

Create `zaffronvalley@gmail.com` at [accounts.google.com/signup](https://accounts.google.com/signup).

I have already put this address into every page of the site, so it works the moment
you create it. **Create the account with exactly that spelling** — if it's taken,
tell me the address you got and I'll swap it across all 9 pages in one pass.

Note: I can't create the Google account for you — it needs a phone OTP and a CAPTCHA
that only you can complete. Use `6006575829` for the verification.

Inside Gmail, set up:

- **Display name:** `Zaffron Valley` (Settings → Accounts → Send mail as → edit info).
  Otherwise replies show as your personal name and look unprofessional.
- **Signature** with the name, phone, WhatsApp link and website.

### Later (once the domain is bought)

Move to `hello@zaffronvalley.com`. A Gmail address on a business card that sells
₹30,000 tour packages costs you bookings — travellers reading "is this a scam?"
forums check exactly this.

| Option | Cost | Verdict |
|---|---|---|
| **Zoho Mail Free** | **₹0** — 5 users, 5 GB each, custom domain | **Best value.** Webmail + mobile app. No IMAP on free tier. Start here. |
| Google Workspace | ~₹136–200/user/month | Only if you need Gmail-in-Outlook, Drive, and shared calendars. |
| Registrar email | ₹100–300/month | Skip. Poor deliverability, worse spam filtering. |

Zoho setup: sign up → add domain → add the TXT verification record, the MX records,
and the DKIM record it gives you at your DNS provider → create `hello@`. Takes ~20
minutes. Then you can forward it into Gmail so you keep one inbox.

**Also add these DNS records** or your booking confirmations land in spam:

| Type | Name | Value |
|---|---|---|
| TXT | `@` | `v=spf1 include:zoho.com ~all` |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:hello@zaffronvalley.com` |

---

## 5. Backend — what to add, in order

The code is written. What's missing is credentials and one database.

### 5a. Supabase (database) — free

1. [supabase.com](https://supabase.com) → New project. **Pick the Singapore or Mumbai
   region** — closest to your customers, and it keeps Indian traveller data in-region.
2. SQL Editor → New query → paste **`supabase-setup.sql`** (in this repo) → Run.
   That creates `leads`, `bookings`, `payments` with the exact column names the
   functions expect.
3. Settings → API → copy three values:
   - Project URL → `SUPABASE_URL`
   - `anon` `public` key → `SUPABASE_ANON_KEY`
   - `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY`

> **The service_role key bypasses all security.** It goes only in Netlify environment
> variables. Never in an HTML file, never committed to GitHub.

### 5b. Razorpay (payments) — 2% per transaction

1. [razorpay.com](https://razorpay.com) → sign up → complete **KYC**. This is the slow
   step: 2–7 working days. You'll need PAN, bank account details, and a business
   proof (GST certificate, Udyam/MSME registration, or shop & establishment licence).
   A plain individual account works for low volumes but a registered entity gets
   better rates and fewer holds.
2. Start in **Test mode**. Settings → API Keys → Generate → gives `RAZORPAY_KEY_ID`
   (starts `rzp_test_`) and `RAZORPAY_KEY_SECRET`.
3. Settings → **Webhooks** → Add webhook:
   - URL: `https://zaffronvalley.com/api/razorpay-webhook`
   - Events: `payment.captured`, `payment.failed`, `refund.processed`
   - Set a secret → that's `RAZORPAY_WEBHOOK_SECRET`
4. Razorpay reviews your **website** as part of KYC. They check for reachable contact
   details, and Privacy / Terms / Refund pages. You have all four — that's why they're
   in the repo.
5. Only switch to Live keys after a successful test payment end to end.

### 5c. Netlify environment variables

Netlify → Site configuration → **Environment variables** → add all seven:

| Variable | From |
|---|---|
| `SUPABASE_URL` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (secret) |
| `SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `RAZORPAY_KEY_ID` | Razorpay → API Keys |
| `RAZORPAY_KEY_SECRET` | Razorpay → API Keys |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay → Webhooks |
| `ADMIN_PASSWORD` | You choose. Long and random. |

Then **Deploys → Trigger deploy → Clear cache and deploy site**. Environment variables
are only picked up on a fresh build.

### 5d. Function dependencies

`netlify/functions/package.json` declares `razorpay` and `@supabase/supabase-js`.
Netlify installs these automatically during the build — you do **not** need to commit
`node_modules`. If the functions 500 with "Cannot find module", run
`npm install` inside `netlify/functions/` locally, commit the resulting
`package-lock.json`, and push.

### 5e. The admin dashboard needs fixing before you use it with real data

`admin.html` currently has `__SUPABASE_URL__`, `__SUPABASE_ANON_KEY__` and
`__ADMIN_PASSWORD__` as placeholders, and it reads the database **from the browser**.
That means the password and the anon key end up in the page source — anyone can press
Ctrl+U and read them, and with anon SELECT policies enabled they could read every
customer's name, email and phone.

Fine while testing with fake data. **Not fine once real bookings exist.** The fix is a
`get-admin-data` Netlify Function that checks the password server-side and queries
with the service role key. Say the word and I'll write it.

---

## 6. Still placeholder content — replace before launch

| What | Where | Currently |
|---|---|---|
| Office address | footer of all 9 pages, `privacy.html`, `terms.html` | `Lal Chowk, Srinagar, J&K 190001` — invented. Must be your real address; Razorpay KYC and Indian consumer law both require it. |
| Legal entity name | `privacy.html` line 54, `terms.html` | `Zaffron Valley Travel Co.` — must match your actual registered business name. |
| Testimonials | `index.html` | Labelled sample/illustrative. **Keep the label until you have real, verified reviews.** Fake reviews are an offence under the Consumer Protection Act. |
| Package prices | `packages.html`, `index.html` | Placeholders. Note prices in `data-price` are in **paise** — `90000` means ₹900. |
| Photos | all pages | Hot-linked from Unsplash. Fine legally, but generic stock hurts a trust-based brand. Own photos of your actual houseboats and hosts will convert far better. |

---

## 7. Total running cost

| Item | Per year |
|---|---|
| Domain (.com) | ~₹900–1,000 |
| Netlify hosting + functions | ₹0 |
| Supabase database | ₹0 |
| Zoho Mail (custom domain email) | ₹0 |
| Razorpay | ₹0 fixed + 2% per transaction |
| **Fixed total** | **~₹1,000/year** |

---

## Order of operations (the short version)

1. Create `zaffronvalley@gmail.com` — 5 min
2. Buy `zaffronvalley.com` at Cloudflare Registrar — 10 min
3. Point DNS at Netlify, wait for SSL to go Active — same day
4. Start Razorpay KYC (**do this early, it's the 2–7 day bottleneck**)
5. Create Supabase project, run `supabase-setup.sql`
6. Add the 7 environment variables in Netlify, clear-cache deploy
7. Replace the placeholder address, entity name, prices, photos
8. Test a ₹1 payment in Razorpay test mode, end to end
9. Fix the admin dashboard to be server-side
10. Switch Razorpay to Live keys
11. Update `sitemap.xml` + `robots.txt` to the real domain
12. Set up Zoho `hello@zaffronvalley.com`, retire the Gmail from the site
