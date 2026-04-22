# TODO

Rolling punch list. Open questions for Abigail are grouped first — these gate
parts of the build and should be resolved at or before the handoff review.

## Open questions for Abigail (from CLAUDE.md §11)

- [ ] **Contact form destination** — which email(s) should form submissions go
      to? Does she want SMS notifications too (via Twilio)? Needs
      `RESEND_API_KEY` to wire up.
- [ ] **Instagram feed** — handle + approach: static screenshot grid, Instagram
      Basic Display API (requires her FB developer account), or a third-party
      widget (Elfsight, LightWidget)?
- [ ] **Social profile URLs** (Facebook / Instagram / LinkedIn / TikTok) — the
      footer social row is hidden until URLs confirmed; set
      `NEXT_PUBLIC_SHOW_SOCIALS=true` to show.
- [ ] **Calendly / booking link** — does she have one? If so, add to "Let's
      Connect" CTAs.
- [ ] **Blog** — will she write posts? If yes, CMS choice: MDX in repo, Sanity,
      or Contentful?
- [ ] **Real IDX provider** — NWMLS direct (requires broker-level access through
      John L. Scott) vs. a licensed reseller (Realtyna, iHomefinder, Showcase
      IDX). She should loop in her John L. Scott broker on this.
- [ ] **Analytics** — is Plausible fine, or does she want Google Analytics 4
      for compatibility with Luxury Presence reporting?
- [ ] **Home valuation** — the live page is a form that feeds into a
      third-party tool. Which provider? (HomeBot, HouseCanary, or a simple
      contact-form-with-intent.)
- [ ] **Domain / DNS cutover plan** — how and when do we point
      `abigailrealtor.com` DNS from Luxury Presence → Netlify?
- [ ] **Cookie banner / consent** — WA state doesn't require one, but if she
      expects out-of-state/EU traffic we should add it.
- [ ] **Real email address** — the live site obfuscates it via Cloudflare; pull
      directly from Abigail before go-live.

## Build checklist (from CLAUDE.md §8)

Pages in build order. Complete visual parity for page N before starting N+1.

- [ ] 1. Home
- [x] 2. About Abigail
- [ ] 3. Properties (listings grid)
- [ ] 4. Property Detail (`/properties/[slug]`)
- [ ] 5. Home Search
- [x] 6. Home Valuation (instant-estimate widget stubbed as a form that posts
      to `/api/contact` with `topic: valuation` — awaiting a provider choice)
- [ ] 7. Neighborhoods (index + 6 detail pages: Bellevue, Seattle, Newcastle,
      Eastside, Shoreline, Renton)
- [x] 8. Testimonials
- [x] 9. Buyers / Sellers / Options
- [ ] 10. Blog (shell only — no posts needed yet)
- [x] 11. Contact

## Sub-page follow-ups

- [ ] **Sellers hero image** — there is no `/public/images/sellers-*.jpg`
      asset. The hero currently falls back to `home-gallery-portrait.jpg`
      (interior fireplace shot), while the live site uses a night-time home
      exterior. Download a dedicated sellers hero before go-live. Same gap
      affects the page's OG/Twitter card image (falls back to
      `home-portrait-main.jpg` in `app/sellers/page.tsx`).
- [ ] **Contact / legal page OG images** — `/contact`, `/privacy-policy`, and
      `/terms-and-conditions` have no dedicated hero asset, so their
      `openGraph.images[0]` falls back to `home-portrait-main.jpg`. Consider
      authoring 1200×630 OG card art per page before go-live.
- [ ] **Contact page Instagram handle** — `@abigailanderson.realtor` is a
      placeholder. Replace with Abigail's real handle when confirmed (see
      §Open questions).
- [ ] **Real contact form testing** — per CLAUDE.md §1.1 the live contact
      endpoint is Abigail's real phone/email. Do not submit test forms
      against her production destination even after `RESEND_API_KEY` is
      wired. Use a staging inbox until she explicitly approves.
- [ ] **Home Valuation instant-estimate widget** — the live page includes a
      third-party address-autocomplete → instant estimate tile that we do
      not yet replicate. Decide provider (HomeBot, HouseCanary, etc.) and
      wire it into the hero; the current "Get a Free Home Valuation" button
      anchors to our inquiry form as a placeholder.

## Neighborhoods follow-ups

- [ ] **Neighborhood hero backgrounds** — only Bellevue and Seattle have
      dedicated `/public/images/neighborhoods-<slug>-background.jpg` assets.
      Newcastle, Eastside, Shoreline and Renton currently fall back to the
      generic `neighborhoods-background.jpg`. Grab per-neighborhood hero
      imagery (or reuse the card image at full bleed) before go-live.
- [ ] **Interactive map on detail pages** — the `/neighborhoods/<slug>` detail
      page currently renders a static placeholder `<div>` with lat/lng text.
      Wire Leaflet + OpenStreetMap tiles per CLAUDE.md §2 (Maps row).
- [ ] **Neighborhood markdown rendering** — we hand-roll a minimal
      paragraph/heading/list renderer in `lib/neighborhoods.ts`. Inline bold,
      italics, and links in body copy are currently rendered as plain text.
      Revisit `react-markdown` if/when the copy needs richer inline
      formatting.
- [x] **Neighborhood property listings** — `/neighborhoods/[slug]` now fetches
      `GET /api/listings?city=<City>&status=for-sale&limit=8` server-side and
      renders the results as a 4-up grid with a "View More <City> Homes" CTA
      linking to `/home-search/listings?city=<City>`.
- [ ] **Neighborhood search input (detail page)** — the live site's
      `Search by Address, City, or Neighborhood` input is backed by a live
      IDX widget (filters the grid in-place). Ours is rendered as a visual
      placeholder (`readOnly`) for layout parity; wire it to the
      HomeSearchClient filter state (or redirect on submit) in a follow-up.
- [ ] **Points of Interest / Yelp embed** — the live site renders a live Yelp
      POI table filtered by the chip categories. We render only the intro
      paragraph + static category pills. If a POI grid is desired later, pick
      a provider (Yelp Fusion, Foursquare, Google Places) and wire it in.
- [ ] **Eastside listing coverage** — `Eastside` is a region on the live site
      but not a city in the placeholder IDX data. The Property Listings grid
      on `/neighborhoods/eastside` therefore renders the empty-state message.
      Either add Eastside-tagged placeholder listings or expand the API
      `city=` filter to honor a configurable multi-city alias.
- [ ] **Demographics rows for Employment** — we currently render Age Group +
      Education Level. The live site also shows Men vs Women and Employment
      commute bars; those data points exist in the markdown but not in a
      shape that round-trips through the parser cleanly. Revisit once
      `react-markdown` + a structured data file land.

## Blog & legal follow-ups

- [ ] **Standalone `/privacy-policy` copy** — currently a stub that points at
      `/terms-and-conditions` (which is where the live Luxury Presence site
      renders the full Privacy Policy / Terms of Use document). Decide with
      Abigail whether to author a fresh privacy-only document, redirect
      `/privacy-policy` → `/terms-and-conditions`, or leave as-is.
- [ ] **Blog post inline markdown** — the hand-rolled renderer in
      `lib/blog.ts` only handles h2/h3/paragraphs/lists. Inline links and
      bold in body copy render as plain text. Revisit once the live posts
      need richer formatting.
- [ ] **Blog post frontmatter dates** — the live index shows `07/31/25` for
      all four posts. Dates are hard-coded in `BLOG_POSTS`; add a real
      `date` frontmatter field when Abigail starts publishing fresh posts.

## JSON-LD follow-ups

- [ ] **`LocalBusiness` `priceRange`** — currently a placeholder `$$$` in
      `lib/structured-data.ts`. Confirm with Abigail (or remove the field
      entirely) before go-live.
- [ ] **`LocalBusiness` `openingHours`** — currently stubbed as
      `Mo-Fr 09:00-18:00` in `lib/structured-data.ts`. Confirm Abigail's
      real availability window (including weekends / by-appointment) before
      go-live.

## Tech debt / follow-ups

- [ ] Extract real design tokens from the live site via `browser_evaluate` on
      the root element and populate the CSS variables in `app/globals.css`
      (placeholders in CLAUDE.md §6).
- [ ] Download Abigail's photos, headshots, and branded imagery from the live
      site into `/public/images/` with descriptive filenames.
- [ ] Download Unsplash placeholder listing photos into `/public/listings/`
      matching the filenames referenced in `/data/listings.json`.
- [ ] Write `/tests/idx.contract.test.ts` per CLAUDE.md §7.6 and add
      `test:idx` script.
- [ ] Verify `npm run capture-live` URL paths match the live site's actual
      slugs (e.g., `/properties` vs `/listings`, `/buyers` vs `/buying`) and
      adjust `scripts/capture-live.ts` if needed.
- [ ] Make the dynamic date placeholders in
      `/content/legal/idx-disclaimer.md` (`{{DATE}}`, `{{TIME_UTC}}`,
      `{{YEAR}}`) render with the current timestamp when the footer is built.
- [ ] **Populate 12 unique listing photos** in `/public/listings/` — currently
      `placeholder-01.jpg` through `placeholder-12.jpg` are all the same seed
      image (a copy of `home-featured-image.jpg`) so the Spotlight Listings /
      Properties grid renders. Replace with per-listing Unsplash photos per
      CLAUDE.md §7.8 before go-live.
- [ ] **Hero video licensing** — the ferry-at-sunrise video
      (`/public/videos/home-hero.*`) has a "hov-" filename prefix that
      strongly suggests a Luxury Presence stock library asset rather than
      something Abigail licensed directly. Before go-live: confirm the
      license transfers when the site leaves Luxury Presence, or swap for a
      licensed/original replacement clip.
