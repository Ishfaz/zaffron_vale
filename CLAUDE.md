# CLAUDE.md — Zaffron Valley

Guidance for Claude Code when working in this repository.

## What this is
**Zaffron Valley** is a marketing website for a locally-owned Kashmir tourism business:
curated tour **packages** + a marketplace of vetted local **experiences**
(houseboats, shikara rides, Wazwan dinners, treks, etc.). Positioning is built on one
wedge — **trust**: transparent fixed pricing, ID-verified local hosts, money kept in
the valley.

## Tech stack — keep it simple
- **Plain static site: HTML + CSS + vanilla JS. No build step, no framework, no package manager, no dependencies.**
- Do **not** introduce React/Tailwind/Node build tooling unless explicitly asked. The
  whole point is that a non-developer can edit a file and push.
- Fonts load from Google Fonts CDN (Fraunces + Inter). Photos are hot-linked from
  Unsplash (`images.unsplash.com/...`). Everything else is self-contained.

### The one deliberate exception: top-level `package.json`
The **pages** are dependency-free — that rule stands. But the Netlify Functions in
`netlify/functions/` genuinely need `razorpay` and `@supabase/supabase-js`, and
**Netlify does not install dependencies declared inside a function directory's own
`package.json`**. Builds failed at the "Functions bundling" stage with
`Could not resolve "@supabase/supabase-js"` for two months because of this.

So the root has a `package.json` + committed `package-lock.json` holding those two
packages, and `netlify/functions/package.json` keeps **only** `"type": "module"`
(without it the functions' ESM `import` statements are parsed as CommonJS and fail).

**Do not "clean this up."** The tempting alternative is adding
`@netlify/plugin-functions-install-core` to `netlify.toml` and moving the deps back
down. That also works, but it installs with a bare `npm install` and no lockfile, so
an upstream patch release could break the payment functions with no change on our
side. The versions are pinned deliberately because this code touches money.

Nothing here affects the frontend: no bundler, no transpiler, no build command. A
non-developer can still edit an HTML file and push.

## File structure (flat — all at repo root)
| File | Purpose |
|------|---------|
| `index.html` | Home (hero, packages, marketplace preview, comparison, testimonials, CTA) |
| `packages.html` | Tour packages, filterable |
| `experiences.html` | Experiences marketplace, filterable + "become a host" block |
| `about.html` | Story / Kashmiriyat / responsible travel |
| `contact.html` | "Plan a trip" enquiry form |
| `styles.css` | ALL styling (single stylesheet) |
| `main.js` | ALL interactions (single script) |
| `favicon.svg` | Logo/emblem |

HTML references assets at the root: `styles.css`, `main.js`, `favicon.svg`.

## Run / preview / deploy
- **Preview:** VS Code "Live Server" extension (right-click `index.html` → Open with Live Server), or `python -m http.server 8000`.
- **No build or test commands exist** (static site).
- **Deploy:** push to the `main` branch on GitHub → Netlify auto-deploys in ~30s.
  Netlify publish directory = repo root, build command = none.
  Live: https://ubiquitous-tulumba-9d2b34.netlify.app

## Conventions
- **Colours: use the CSS variables in `:root`** in `styles.css` — don't hard-code hex.
  Key tokens: `--saffron #E2912E`, `--saffron-deep #C2761B`, `--cream #FAF6EE`,
  `--ink #241F1A`, `--lake #1F6E78`, `--lake-deep #103C43`, `--green #2E5D4E`, `--crimson #9C2A23`.
- **Type:** `--font-display` = Fraunces (headings), `--font-body` = Inter (body).
- **Responsive:** fluid via `clamp()` + CSS grid; breakpoints at 980 / 820 / 560px. Mobile nav is a toggle (`.nav-toggle` / `.nav-links.open`).
- **Filtering:** filter buttons use `data-filter="X"`; cards use `data-cat="X Y"` (space-separated). Logic is in `main.js`.
- **Form:** `contact.html` has `<form data-validate>`; `main.js` validates and shows the `.form-ok` success state. The site now uses Netlify Forms for submission handling.
- **Images:** hero / page-hero / `.card__media` contain either an inline `<svg>` illustration OR an `<img>` (Unsplash) with `object-fit:cover`. Keep alt text descriptive.
- **Accessibility:** keep semantic landmarks, `aria-label`s, visible focus styles, and `prefers-reduced-motion` support intact.
- **Spelling/voice:** warm, premium, honest. British-style spelling is used ("traveller", "itemised"). Currency is INR (₹).

## Hard rules (do not break)
- **Do NOT invent reviews, ratings, or traction numbers.** The testimonials in
  `index.html` are clearly labelled **sample/illustrative placeholders** — keep that
  label until real, verified reviews exist. Stats are framed as commitments, not claims.
- Keep the site dependency-free and editable by hand.
- Don't hot-link images from competitors or any unlicensed source; Unsplash/own photos only.

## Common tasks (where to look)
- **Change a price / package detail:** edit the relevant card in `packages.html` (and the 3 featured cards in `index.html`).
- **Add an experience:** copy an existing `<article class="card" data-cat="...">` block in `experiences.html`.
- **Swap an illustration for a real photo:** replace the inner `<svg>` of a `.card__media` / hero with `<img src="..." alt="..." style="width:100%;height:100%;object-fit:cover">`.
- **Edit contact details / footer:** they repeat in the footer of every page (search `zaffronvalley@gmail.com`, `Lal Chowk`, `60065 75829`).

## TODO before public launch
- Confirm Netlify Forms is enabled and test the contact form submission.
- Replace placeholder prices, contact details, photos, and the sample testimonials.
- Add Privacy / Terms / Refund pages (required before payments).
- Connect a payment gateway (Razorpay for India) — needs a small backend; static site can't take payments alone.
- Buy & connect your chosen domain (for example `zaffronvalley.com`) in Netlify → Domain management.
