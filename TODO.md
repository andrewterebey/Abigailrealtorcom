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
- [ ] 2. About Abigail
- [ ] 3. Properties (listings grid)
- [ ] 4. Property Detail (`/properties/[slug]`)
- [ ] 5. Home Search
- [ ] 6. Home Valuation
- [ ] 7. Neighborhoods (index + 6 detail pages: Bellevue, Seattle, Newcastle,
      Eastside, Shoreline, Renton)
- [ ] 8. Testimonials
- [ ] 9. Buyers / Sellers / Options
- [ ] 10. Blog (shell only — no posts needed yet)
- [ ] 11. Contact

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
