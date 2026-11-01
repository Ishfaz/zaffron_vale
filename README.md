# Zaffron Valley

**Kashmir, honestly.** — A premium tourism website for curated Kashmir tour packages and vetted local experiences (houseboats, shikara rides, Wazwan dinners, treks & more).

Live site: [ubiquitous-tulumba-9d2b34.netlify.app](https://ubiquitous-tulumba-9d2b34.netlify.app)

---

## What's included

### Frontend (static site — no build step)
| File | Purpose |
|------|---------|
| `index.html` | Home — hero, featured packages, marketplace preview, comparison, testimonials, CTA |
| `packages.html` | All tour packages with category filters |
| `experiences.html` | Local experiences marketplace with filters + "Book & Pay" buttons |
| `about.html` | Brand story, Kashmiriyat values, responsible travel |
| `contact.html` | "Plan a trip" enquiry form (submits to backend API) |
| `privacy.html` | Privacy Policy |
| `terms.html` | Terms & Conditions |
| `refund-policy.html` | Refund & Cancellation Policy |
| `admin.html` | Admin dashboard — leads, bookings & payments (password-protected) |
| `styles.css` | All styling (single stylesheet, CSS variables) |
| `main.js` | All interactions — navigation, filters, form validation, booking modal, Razorpay checkout |
| `favicon.svg` | Site logo/emblem |

### Backend (Netlify Functions + Supabase + Razorpay)
| File | Purpose |
|------|---------|
| `netlify.toml` | Netlify config — functions directory, API redirects |
| `netlify/functions/submit-enquiry.js` | Contact form → saves lead to Supabase |
| `netlify/functions/create-order.js` | Creates Razorpay order + pending booking in Supabase |
| `netlify/functions/verify-payment.js` | Verifies Razorpay payment signature (HMAC-SHA256) |
| `netlify/functions/razorpay-webhook.js` | Razorpay webhook handler (payment captured/failed/refunded) |
| `netlify/functions/catalogue.js` | **Authoritative prices.** Change a price here AND in `experiences.html` |
| `netlify/functions/get-admin-data.js` | Admin dashboard data — verifies `ADMIN_PASSWORD` server-side, queries with the service role key |
| `supabase-setup.sql` | Run once in Supabase SQL Editor to create the tables |
| `thank-you.html` | Confirmation page for the no-JavaScript form path |
| `LAUNCH.md` | Domain / DNS / email / Razorpay setup guide + costs |

---

## Tech stack

| Layer | Technology | Cost |
|-------|-----------|------|
| Frontend | HTML + CSS + vanilla JS (no framework) | Free |
| Hosting | Netlify (auto-deploy from GitHub) | Free |
| API | Netlify Functions (serverless Node.js) | Free (125k invocations/month) |
| Database | Supabase (PostgreSQL) | Free (500 MB) |
| Payments | Razorpay Standard Checkout (UPI, cards, wallets, net banking) | 2% per transaction |

---

## Features built

- Responsive design with fluid typography (`clamp()`) and CSS grid
- Mobile hamburger navigation
- Scroll-reveal animations (IntersectionObserver)
- Category filtering for packages and experiences
- Contact enquiry form with validation → saves to Supabase
- Razorpay payment checkout on experiences (Book & Pay)
- Booking modal with guest details form
- Payment verification (signature + webhook)
- Admin dashboard with login, stats, and three data tables (leads, bookings, payments)
- Legal pages (Privacy, Terms, Refund Policy)
- SEO meta tags + Open Graph tags
- Accessibility: semantic HTML, ARIA labels, focus styles, reduced-motion support

---

## How to preview locally

Open `index.html` in your browser, or run:

```
python -m http.server 8000
```

Then visit `http://localhost:8000`.

---

## Deployment

Push to `main` branch → Netlify auto-deploys in ~30 seconds.

---

## Setup (before going live)

1. **Supabase**: Create a project and run the table setup SQL (leads, bookings, payments)
2. **Razorpay**: Sign up and complete KYC verification
3. **Netlify environment variables** — set these in the Netlify dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY`
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `RAZORPAY_WEBHOOK_SECRET`
   - `ADMIN_PASSWORD`
4. **Admin dashboard**: Update placeholders in `admin.html` with real Supabase URL, anon key, and admin password
5. **Domain**: Buy and connect `zaffronvalley.com` (or your chosen domain) in Netlify
6. **Email**: Set up business email (e.g. Zoho Mail) for `hello@zaffronvalley.com`

---

## Changelog

### v5 — Admin dashboard moved server-side
- Added `netlify/functions/get-admin-data.js`. `admin.html` no longer contains the
  Supabase anon key or the admin password — previously both were literals in the page
  source, and the "login" was a client-side string comparison anyone could skip by
  calling the loader functions from DevTools.
- Password is compared with a timing-safe hash comparison, failed attempts are
  throttled ~600ms, and the function returns 503 rather than data if `ADMIN_PASSWORD`
  or the Supabase env vars are missing — a misconfigured deploy fails closed.
- Stats (lead counts, paid revenue) are computed server-side.
- Responses are `Cache-Control: no-store` so customer data is never cached.
- Credential is held in a closure for the Refresh button, never in `sessionStorage`;
  closing the tab ends the session.

### v4 — Real contact details, security fixes, test coverage
- Wired real phone (`+91 60065 75829`) and working `wa.me` WhatsApp links across all pages
- Replaced the dead `hello@zaffronvalley.com` links with a working interim Gmail
- **Security: server-side price catalogue (`netlify/functions/catalogue.js`).** `create-order`
  no longer trusts the `amount` sent by the browser — previously anyone could edit
  `data-price` in DevTools and pay ₹1 for a ₹3,200 houseboat
- **Security: escaped all customer data in `admin.html`.** Lead names and messages were
  written straight to `innerHTML`, so a `<img onerror=...>` in the contact form was
  stored XSS that executed in the admin dashboard
- **Fixed silent lead loss:** `submit-enquiry` returned 500 on a native form POST
  (JS disabled / script not yet loaded) because it only parsed JSON. Now accepts
  urlencoded and base64 bodies and redirects to a real `thank-you.html`
- Added `guest_email` validation and guest-count bounds to `create-order`
- Changed the new-lead lookup from `.single()` to `.maybeSingle()` (errored on every new guest)
- Added `supabase-setup.sql` — the schema the README referenced but was missing
- Added `LAUNCH.md` — domain, DNS, email, Razorpay and cost guide
- Added `thank-you.html` for the no-JavaScript submission path

### v3 — Full backend + payments
- Added Netlify Functions serverless API (submit-enquiry, create-order, verify-payment, razorpay-webhook)
- Integrated Razorpay Standard Checkout on experiences page
- Added booking modal with guest details form
- Created admin dashboard (admin.html) with leads, bookings, and payments tables
- Connected contact form to `/api/submit-enquiry` backend

### v2 — Rebrand + legal pages
- Rebranded from "Saffron Vale" to "Zaffron Valley" across all pages
- Added Privacy Policy, Terms & Conditions, and Refund Policy pages
- Added SEO meta tags and Open Graph tags
- Added sitemap.xml and robots.txt

### v1 — Initial site
- Built complete static tourism website
- 5 pages: Home, Packages, Experiences, About, Contact
- Responsive design, category filters, form validation
- Deployed on Netlify via GitHub

---

Built with care for Kashmir.
