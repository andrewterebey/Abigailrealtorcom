# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Instructions for Claude Code when working in this repo. Read this in full at the start of every session.

---

## 1. Project Overview

This is a **client project for Abigail Anderson** — a pixel-accurate, from-scratch rebuild of her current site **https://abigailrealtor.com**. She's a King County, WA real estate agent (John L. Scott). Her current site is on Luxury Presence's platform; we're rebuilding it on our own stack so she owns the code and we can customize freely.

**Visual target: ≥95% parity with the live site at desktop, tablet, and mobile viewports.**

All MLS/IDX data on the live site is replaced with placeholder data wired through a fake API layer that mirrors a real IDX provider's contract (see §7).

### 1.1 Client context — read this

- **All content, branding, copy, headshots, and photos on the live site are Abigail's intellectual property.** We keep them as-is. Download and reuse them locally. No find-and-replace pass at the end — this IS the real branding.
- **Do not modify the live production site** (`abigailrealtor.com`). It is still live on Luxury Presence during this build.
- **Production contact form and phone number are live.** During development, the contact form posts to a dummy endpoint (see §7 setup). Never submit test forms to her real phone/email. Click-to-call links render but are not to be tested against her real number.
- **The NWMLS / IDX disclaimer text at the footer is legally required** and must be kept verbatim (see `/content/legal/idx-disclaimer.md`).
- **Before go-live**, a handoff review with Abigail is required covering: contact form destination, Instagram handle, Calendly/booking URL if any, and confirmation that all photos of her are approved for continued use.

---

## 2. Tech Stack

| Layer            | Choice                                      | Why                                                                 |
| ---------------- | ------------------------------------------- | ------------------------------------------------------------------- |
| Framework        | **Next.js 15 (App Router) + TypeScript**    | SEO-critical for a realtor site; built-in image opt; Netlify-ready  |
| Styling          | **Tailwind CSS v4**                         | Fast iteration; utility-first matches the screenshot-driven workflow |
| UI primitives    | **shadcn/ui** + **@base-ui/react**          | shadcn for common forms; Base UI for unstyled a11y primitives       |
| Icons            | **lucide-react**                            |                                                                     |
| Forms            | Netlify Forms (dev) / Resend (prod email)   | Zero-backend for MVP; Resend for transactional                      |
| Maps             | **Leaflet** + OpenStreetMap tiles           | Free; sufficient for neighborhood pages                             |
| Animations       | Framer Motion (sparingly)                   | Only if needed to match live site transitions                       |
| Hosting          | **Netlify**                                 | Same pipeline as other Terebey projects                             |
| Analytics        | Plausible (placeholder; swap later)         |                                                                     |

If you ever feel tempted to add a dependency, stop and ask first.

---

## 3. Repository Layout

```
/
├─ CLAUDE.md                    ← this file
├─ app/
│  ├─ layout.tsx                ← root layout: nav, footer, fonts
│  ├─ page.tsx                  ← home
│  ├─ about/page.tsx
│  ├─ properties/
│  │  ├─ page.tsx               ← listings grid → GET /api/listings
│  │  └─ [slug]/page.tsx        ← listing detail → GET /api/listings/[id]
│  ├─ home-search/
│  │  ├─ page.tsx               ← redirects to /home-search/listings
│  │  └─ listings/page.tsx      ← IDX search UI, URL-synced filters
│  ├─ home-valuation/page.tsx
│  ├─ neighborhoods/{page.tsx, [slug]/page.tsx}
│  ├─ {testimonials, buyers, sellers, options, contact}/page.tsx
│  ├─ blog/{page.tsx, [slug]/page.tsx}
│  ├─ {privacy-policy, terms-and-conditions, dmca-notice}/page.tsx
│  ├─ sitemap.ts                ← Next.js metadata route → /sitemap.xml
│  ├─ robots.ts                 ← Next.js metadata route → /robots.txt
│  └─ api/
│     ├─ listings/{route.ts, [id]/route.ts}
│     └─ contact/route.ts       ← POST; rate-limited (see §7.10)
├─ components/
│  ├─ nav/                      ← header, mega menu, mobile drawer
│  ├─ home/                     ← hero, cta-tiles, testimonials, neighborhoods-carousel, spotlight-listings, newsletter, contact-cta
│  ├─ listings/                 ← listing-card, listing-grid, listing-detail, listing-filters, home-search-client
│  ├─ neighborhood/             ← score-card, stat-bar (detail-page widgets)
│  ├─ site/                     ← site-header, site-footer, page-hero, legal-body
│  ├─ forms/                    ← inquiry-form
│  └─ ui/                       ← shadcn primitives
├─ lib/
│  ├─ idx/                      ← provider.ts, placeholder-provider.ts, index.ts
│  ├─ schemas.ts                ← Zod schemas for API boundary validation
│  ├─ structured-data.ts        ← JSON-LD builders (RealEstateAgent, LocalBusiness, Residence)
│  ├─ rate-limit.ts             ← in-memory token-bucket for /api/contact
│  ├─ blog.ts                   ← BLOG_POSTS + minimal md→JSX renderer
│  ├─ neighborhoods.ts          ← neighborhood md loader + parser
│  ├─ legal.ts / legal-content.ts
│  └─ utils.ts
├─ types/
│  └─ listing.ts                ← shared TS types
├─ content/                     ← verbatim copy pulled from the live site
│  ├─ home.md
│  ├─ about.md
│  ├─ testimonials.json
│  ├─ legal/
│  │  └─ idx-disclaimer.md      ← VERBATIM, legally required
│  └─ neighborhoods/*.md
├─ data/
│  ├─ listings.json             ← placeholder IDX data (never imported from UI)
│  └─ neighborhoods.json
├─ public/
│  ├─ images/                   ← assets downloaded from live site
│  └─ listings/                 ← placeholder listing photos
├─ screenshots/
│  ├─ live/                     ← committed reference screenshots
│  └─ local/                    ← gitignored, regenerated every run
├─ scripts/
│  ├─ capture-live.ts           ← refresh /screenshots/live from the real site
│  ├─ capture-refs.ts           ← capture specific reference frames
│  ├─ diff-page.ts              ← capture any local path at the three viewports
│  ├─ diff-home.ts, diff-listings.ts, diff-neighborhoods.ts, diff-bellevue.ts
│  ├─ diff-dom.ts               ← DOM-structure diff between live and local
│  ├─ download-assets.ts        ← pull images/video from live site into /public
│  └─ extract-content.ts        ← scrape verbatim copy from live into /content
└─ .claude/
   └─ settings.json             ← MCP server config (see §5)
```

---

## 4. Development Commands

```bash
npm run dev          # Next dev server at http://localhost:3000 (turbopack)
npm run build        # production build (turbopack)
npm run start        # serve production build locally
npm run lint         # eslint && tsc --noEmit  (lint + strict typecheck)
npm run capture-live # refresh /screenshots/live from the real site
```

Ad-hoc scripts (run with `tsx scripts/<name>.ts`) live in `/scripts/` — see the
layout in §3. No automated test suite is wired yet; `npm run test:idx` is
referenced in §7.6 but not implemented (tracked in `TODO.md`).

Env vars:

| Var                          | When                                                      |
| ---------------------------- | --------------------------------------------------------- |
| `RESEND_API_KEY`             | Prod contact-form email. Unset in dev = console log only. |
| `NEXT_PUBLIC_SITE_URL`       | Base URL for `sitemap.xml` / canonicals. Falls back to `https://abigailrealtor.com`. |
| `NEXT_PUBLIC_SHOW_SOCIALS`   | Set to `true` to show the footer social-icon row. Hidden by default until real URLs land. |

Always confirm `npm run dev` is running on port 3000 before taking local screenshots.

---

## 5. Visual Comparison Workflow — THE CORE LOOP

This is the single most important workflow in this repo. Claude Code must use it on every meaningful UI change.

### 5.1 One-time setup

Install the Playwright MCP server:

```bash
claude mcp add playwright -- npx -y @playwright/mcp@latest
```

Verify with `claude mcp list` — you should see `playwright` in the output. If it's missing at session start, **stop and tell me** before writing any UI code.

### 5.2 The Playwright MCP tools Claude will use

| Tool                        | Purpose                                 |
| --------------------------- | --------------------------------------- |
| `browser_navigate`          | Load a URL                              |
| `browser_resize`            | Set viewport size                       |
| `browser_take_screenshot`   | Capture PNG (pass `fullPage: true`)     |
| `browser_snapshot`          | A11y tree, for layout debugging         |
| `browser_evaluate`          | Read computed styles when visual diff is ambiguous |

### 5.3 The three viewports — always all three

| Name    | Width | Height |
| ------- | ----- | ------ |
| Desktop | 1440  | 900    |
| Tablet  | 768   | 1024   |
| Mobile  | 375   | 812    |

### 5.4 The loop

For every page or component change:

1. **Pull live reference.** Navigate to the matching URL on `https://abigailrealtor.com`, resize to each viewport in turn, and `browser_take_screenshot` with `fullPage: true`. Save to `/screenshots/live/<page>-<viewport>.png`. Skip this step if the file already exists and is fresh (< 7 days).
2. **Capture local.** Navigate to `http://localhost:3000<path>`, same three viewports, same full-page screenshots. Save to `/screenshots/local/<page>-<viewport>.png`.
3. **Compare.** Open the live and local screenshots for one viewport at a time in Claude's context. Scan top-to-bottom and enumerate diffs in these categories, in priority order:
   1. **Layout** — section order, column widths, grid gaps, vertical spacing
   2. **Typography** — font family, size, weight, line-height, letter-spacing, color
   3. **Color** — backgrounds, accents, gradients, overlay opacities
   4. **Imagery** — aspect ratio, object-fit, crop focal point
   5. **Interactive states** — hover, focus, active (screenshot separately if needed)
   6. **Motion** — carousel timing, transition easing (note only; hold until last)
4. **Fix the top 3–5 highest-impact diffs.** Don't chase one-pixel details before the big stuff is right.
5. **Re-capture local → re-diff.** Repeat until the page reads "same" at a glance at all three viewports.

### 5.5 Measurement, not guessing

When a spacing, color, or font size is ambiguous from the screenshot alone, use `browser_evaluate` against the live site to read the actual computed style:

```js
getComputedStyle(document.querySelector('h1.hero-title'))
  .getPropertyValue('font-size')
```

**Never invent pixel values.** If you can't measure it, take another screenshot or ask me.

### 5.6 Rules

- Commit `/screenshots/live/` to git. These are the source of truth.
- `/screenshots/local/` is gitignored and regenerated every run.
- Never declare a page "done" without a final 3-viewport local screenshot passing visual diff.
- If the live site changes its layout mid-project, re-run `npm run capture-live` to refresh references.

### 5.7 Script helpers for the loop

`/scripts/diff-*.ts` automate parts of §5.4 so you don't have to re-drive the
MCP by hand every iteration. `diff-page.ts` takes a path and captures the three
viewports in one shot; `diff-dom.ts` diffs the rendered DOM structure (useful
when screenshots look close but layout containers differ). Use them when you're
iterating fast; drop back to the Playwright MCP when you need to inspect state,
hover, or read computed styles.

---

## 6. Design Tokens

Extract these from the live site using `browser_evaluate` on the root element — **do not guess**.

Placeholders until first extraction pass:

```
--color-primary:    TBD   /* appears to be a warm neutral / cream */
--color-accent:     TBD   /* gold/brass button accents */
--color-text:       TBD
--color-muted:      TBD
--font-display:     TBD   /* serif — likely Canela, Tiempos, or Didot family */
--font-body:        TBD   /* sans — likely Söhne, Inter, or similar */
--content-max-w:    TBD   /* probably 1280–1440px */
--radius:           TBD
```

Document the final values in `app/globals.css` as CSS custom properties and mirror them in `tailwind.config.ts`.

---

## 7. IDX / MLS — Fake API Layer

The live site is fed by **NWMLS via IDX**. We're building a fake API layer that matches the *shape* of a real IDX integration. Frontend code calls our own `/api/listings` endpoints — it never reads `/data/listings.json` directly. Swapping to a real IDX provider later (NWMLS direct, Realtyna, iHomefinder, Showcase IDX) is a **one-line change** in `/lib/idx/index.ts`, not a UI refactor.

### 7.1 Architecture

```
UI components
    ↓ fetch('/api/listings?...')
/app/api/listings/route.ts           ← Next.js route handlers:
/app/api/listings/[id]/route.ts        validate query → call provider → validate response
    ↓ import { provider } from '@/lib/idx'
/lib/idx/index.ts                    ← exports the ACTIVE provider (one line swap)
    ↓
/lib/idx/placeholder-provider.ts     ← current impl: reads /data/listings.json

   future swap:
/lib/idx/nwmls-provider.ts           ← or realtyna, ihomefinder, etc.
```

### 7.2 The `IDXProvider` interface (`/lib/idx/provider.ts`)

This is the contract. Every provider implementation must satisfy it exactly.

```ts
export type ListingStatus = 'for-sale' | 'pending' | 'sold'
export type PropertyType  = 'single-family' | 'condo' | 'townhouse' | 'multi-family' | 'land'

export interface ListingFilter {
  city?: string
  minPrice?: number
  maxPrice?: number
  minBeds?: number
  minBaths?: number
  propertyType?: PropertyType
  status?: ListingStatus
}

export interface Pagination {
  limit: number    // 1–50
  offset: number   // >= 0
}

export interface ListingSummary {
  id: string             // provider-stable ID, used in URLs
  mlsNumber: string
  slug: string           // SEO-friendly path segment
  address: string
  city: string
  state: string
  zip: string
  price: number
  beds: number
  baths: number
  sqft: number
  status: ListingStatus
  primaryImage: string
}

export interface ListingDetail extends ListingSummary {
  description: string
  images: string[]
  coordinates: { lat: number; lng: number }
  yearBuilt: number
  propertyType: PropertyType
  features: string[]
  schoolDistrict?: string
  listingAgent?: string
}

export interface IDXProvider {
  list(filter: ListingFilter, page: Pagination): Promise<{
    items: ListingSummary[]
    total: number
  }>
  get(id: string): Promise<ListingDetail | null>
}
```

### 7.3 Endpoints

**`GET /api/listings`**

Query params (all optional): `city`, `min_price`, `max_price`, `min_beds`, `min_baths`, `property_type`, `status`, `limit` (default 20, max 50), `offset` (default 0).

Response 200:
```json
{
  "items": [/* ListingSummary[] */],
  "total": 147,
  "limit": 20,
  "offset": 0
}
```

**`GET /api/listings/[id]`**

Response 200: `ListingDetail` object.
Response 404: `{ "error": "Listing not found" }`.

### 7.4 Runtime validation with Zod

Every route handler validates query params on the way in and the provider's response on the way out. Mismatches surface immediately as 500s rather than rendering broken cards.

```ts
// /lib/schemas.ts — single source of truth for validation
import { z } from 'zod'
export const listingFilterSchema    = z.object({ /* ... */ })
export const listingSummarySchema   = z.object({ /* ... */ })
export const listingDetailSchema    = listingSummarySchema.extend({ /* ... */ })
```

Validation failures return:
- **400** for bad input (e.g., `min_price=notanumber`)
- **500** for provider contract violations (log loudly — this is a bug)

### 7.5 Frontend usage

```ts
// components/home/spotlight-listings.tsx
const res = await fetch('/api/listings?status=for-sale&limit=6', {
  next: { revalidate: 300 }, // ISR cache for 5 min
})
const { items } = await res.json()
```

**Never import `/data/listings.json` directly from a component or page.** If you're tempted, stop — use the API. This rule is what makes the future IDX swap a one-line change.

### 7.6 Contract tests (`npm run test:idx`) — NOT YET IMPLEMENTED

Planned: a small test suite in `/tests/idx.contract.test.ts` that hits both
`provider.list()` and `provider.get()` and asserts the Zod schemas pass. Any
new provider implementation must pass these tests before being swapped in.
No test runner is installed today — running `npm run test:idx` will fail.
Writing the suite is tracked in `TODO.md` under "Tech debt / follow-ups".

### 7.7 Swapping to a real provider (future)

1. Implement `IDXProvider` in e.g. `/lib/idx/nwmls-provider.ts`.
2. Change one line in `/lib/idx/index.ts`:
   ```ts
   // export const provider: IDXProvider = new PlaceholderProvider()
   export const provider: IDXProvider = new NWMLSProvider(process.env.NWMLS_KEY!)
   ```
3. Run `npm run test:idx` to verify the contract.
4. Deploy.

### 7.8 Placeholder data

`/data/listings.json`: 12–15 listings across King County at realistic prices ($500k–$3M), mixing Bellevue, Seattle, Newcastle, Kirkland, Shoreline, Renton. Property photos from Unsplash (real-estate category), downloaded to `/public/listings/`. All IDs prefixed `placeholder-` (e.g., `placeholder-nwm-0001`) — never use real MLS numbers that could collide.

### 7.9 Contact API rate limiting

`/api/contact` is rate-limited to **5 submissions / 10 minutes / IP** and
rejects any payload larger than **16 KB** before parsing, so the form can't
be used as a spam relay once Resend is wired. Implementation: in-memory
token-bucket in `lib/rate-limit.ts`. Multi-instance deployments (e.g.,
Netlify scaling up) will need a shared store (Redis / Upstash) — flagged
inline in the file.

### 7.10 What NOT to do

- Don't scrape the NWMLS feed — licensed data, violates ToS.
- Don't embed the current Luxury Presence site as an iframe.
- Don't fabricate MLS numbers that overlap the real namespace.
- Don't import `/data/listings.json` from UI code — always through the API.
- Don't ship real listing-agent names or broker contact info in placeholder data.

---

## 8. Pages to Build

The canonical build-order checklist with live status lives in **`TODO.md`**
(under "Build checklist"). Work through it top-to-bottom and complete visual
parity for page N before starting page N+1. Open questions and per-page
follow-ups are tracked in the same file — consult it before starting a page
so you don't re-litigate decisions Abigail has already weighed in on.

---

## 9. Rules for Claude Code

1. **Confirm the Playwright MCP is available at the start of every session.** If not, stop and tell me.
2. **Screenshot first, code second.** Before writing CSS for any section, screenshot the corresponding section on the live site.
3. **Content is copied, not invented.** All copy comes verbatim from the live site and is stored in `/content/`. If a piece of copy is unclear, ask — don't make it up.
4. **Images from the live site** are downloaded and stored in `/public/images/`, with filenames that describe what they are (`hero-ferry-sunrise.jpg`, not `img1.jpg`).
5. **One component per commit.** Small, reviewable diffs.
6. **Semantic HTML always.** `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`. The live site is lazy about this; we're not.
7. **A11y baseline:** every image has alt text, every form input has a label, every interactive element is keyboard-reachable. Run `browser_snapshot` to verify the a11y tree.
8. **No generic AI-style placeholder text.** No "Lorem ipsum", no "Welcome to our amazing real estate website".
9. **Responsive by default.** Tailwind's `sm/md/lg/xl` breakpoints align with our three test viewports: mobile = base, tablet = `md`, desktop = `lg`.
10. **Ask before deviating.** If the live site does something you think is a bad idea (bad a11y, bad SEO, bad UX), flag it and ask — don't silently "improve" it.
11. **This is a paid client engagement — act accordingly.**
    - Don't hit Abigail's real phone/email/contact endpoints. Contact form in dev posts to `/api/contact` which logs to console only until `RESEND_API_KEY` is set in prod env.
    - Don't modify or attempt to access the live Luxury Presence site — we only read from it (screenshots, content, images).
    - Don't push directly to a production branch. Work in `dev`; merge to `main` only after a local build passes and all three viewports pass visual diff.
    - Keep a running `CHANGELOG.md` of client-visible changes — it becomes the handoff review agenda.
12. **Legal text is verbatim.** The NWMLS IDX disclaimer, DMCA notice, and privacy policy wording are copied exactly from the live site into `/content/legal/` and rendered unchanged. Don't paraphrase them, don't "clean them up."

---

## 10. SEO (non-negotiable for a realtor site)

- Unique `<title>` and `<meta description>` per page
- Open Graph + Twitter card images per page
- `structured-data.ts` with `RealEstateAgent` and `LocalBusiness` JSON-LD on the home page
- `Product` / `Residence` JSON-LD on each listing page (placeholder data is fine)
- `sitemap.xml` and `robots.txt` served via Next.js metadata routes at
  `app/sitemap.ts` and `app/robots.ts`. Sitemap base URL reads from
  `NEXT_PUBLIC_SITE_URL` with a fallback to `https://abigailrealtor.com`.
- Canonical URLs, `openGraph`, and `twitter` metadata on every page (see
  `CHANGELOG.md` → SEO for the current coverage)

---

## 11. Open Questions (for Abigail)

Flagged here so we don't hit them mid-build. Track status in `TODO.md`.

- **Contact form destination** — which email(s) should form submissions go to? Does she want SMS notifications too (via Twilio)? Needs `RESEND_API_KEY` to wire up.
- **Instagram feed** — handle + approach: static screenshot grid, Instagram Basic Display API (requires her FB developer account), or a third-party widget (Elfsight, LightWidget)?
- **Calendly / booking link** — does she have one? If so, add to "Let's Connect" CTAs.
- **Blog** — will she write posts? If yes, CMS choice: MDX in repo, Sanity, or Contentful?
- **Real IDX provider** — NWMLS direct (requires broker-level access through John L. Scott) vs. a licensed reseller (Realtyna, iHomefinder, Showcase IDX). She should loop in her John L. Scott broker on this.
- **Analytics** — is Plausible fine, or does she want Google Analytics 4 for compatibility with Luxury Presence reporting?
- **Home valuation** — the live page is a form that feeds into a third-party tool. Which provider? (HomeBot, HouseCanary, or a simple contact-form-with-intent.)
- **Domain / DNS cutover plan** — how and when do we point `abigailrealtor.com` DNS from Luxury Presence → Netlify?
- **Cookie banner / consent** — WA state doesn't require one, but if she expects out-of-state/EU traffic we should add it.

---

## 12. Branding

This IS the real client. Keep all of the following verbatim:
- Name: **Abigail Anderson**
- Phone: **(425) 236-2853**
- Address: **11040 Main St Suite 200, Bellevue, WA 98004**
- Brokerage: **John L. Scott Real Estate**
- All bio copy, testimonials, headshots, and photography currently on the live site.

Email address is obfuscated on the live site via Cloudflare email protection — pull the real address from her directly before go-live, don't try to decode the `cdn-cgi/l/email-protection` link.

No global find-and-replace pass. If a piece of copy sounds off, flag it in `TODO.md` — don't edit it silently.

---

*Last updated: 2026-04-22*
