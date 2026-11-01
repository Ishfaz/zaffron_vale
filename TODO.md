# Zaffron Valley TODO

> **See `LAUNCH.md` for the full step-by-step launch guide** (domain, DNS, email,
> Razorpay, Supabase, costs). This file is just the checklist.

## Immediate next steps
- [ ] Create `zaffronvalley@gmail.com` (already wired into all 9 pages — just needs to exist).
- [ ] Buy `zaffronvalley.com` (Cloudflare Registrar, ~₹900/yr) and connect it in Netlify Domain management.
- [ ] Verify the live site deploys successfully from GitHub.
- [x] Update branding text across the site from `Saffron Vale` / `Mouj Kashmir` to `Zaffron Valley`.
- [x] Wire real phone `+91 60065 75829` and working `wa.me` WhatsApp links into all pages.
- [x] Replace the dead `hello@zaffronvalley.com` with the interim Gmail address.
- [ ] Replace the placeholder office address (`Lal Chowk, Srinagar 190001`) with the real one.
- [ ] Replace the placeholder legal entity name (`Zaffron Valley Travel Co.`) with the registered name.
- [ ] Replace sample testimonials, package prices, and images with real content.
- [ ] Update `sitemap.xml` and `robots.txt` from the netlify.app URL to the real domain.

## Important site launch tasks
- [x] Add Privacy Policy page.
- [x] Add Terms page.
- [x] Add Refund Policy page.
- [ ] Confirm SSL/HTTPS is active for the custom domain.

## Backend (completed)
- [x] Build custom backend with Netlify Functions + Supabase.
- [x] Add serverless API: submit-enquiry, create-order, verify-payment, razorpay-webhook.
- [x] Add Razorpay payment checkout to experiences page.
- [x] Create admin dashboard (admin.html) with leads, bookings, and payments tables.

## Security
- [x] Price tampering: `create-order` now prices orders from `netlify/functions/catalogue.js`
      instead of trusting the browser's `amount`. (Was: edit `data-price` in DevTools,
      pay ₹1 for a ₹3,200 houseboat.)
- [x] Stored XSS: all customer-supplied text in `admin.html` is now HTML-escaped
      before it reaches `innerHTML`, and badge CSS classes are whitelisted.
- [x] Admin dashboard credentials: `admin.html` no longer contains any keys or the
      password. Reads go through `netlify/functions/get-admin-data.js`, which verifies
      `ADMIN_PASSWORD` server-side with a timing-safe comparison, throttles failed
      attempts, and queries with the service role key. Fails closed (503) if the env
      vars are missing, so a misconfigured deploy can never serve data unauthenticated.

## When you change a price
Prices live in TWO places and must agree, or the booking is refused with a 409:
1. `netlify/functions/catalogue.js` — what the customer is charged (paise)
2. `experiences.html` `data-price` — what the customer is shown (paise)

## Pre-launch setup (user action required)
- [ ] Create a Supabase project (Mumbai/Singapore region) and run `supabase-setup.sql`.
- [ ] Sign up for Razorpay and complete KYC verification.
- [ ] Set Netlify environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `ADMIN_PASSWORD`.
- [x] ~~Update `admin.html` placeholders~~ — no longer needed. `admin.html` holds no
      credentials; everything comes from Netlify environment variables at runtime.
- [ ] Run `npm install` inside `netlify/functions/` before deploying.
- [ ] Test Razorpay in test mode before going live.

## Maintenance guidance
- [ ] Keep the site content updated regularly.
- [ ] Test any code change locally before pushing to GitHub.
- [ ] Monitor deploys in Netlify after each push.
- [ ] Renew the domain registration each year.
