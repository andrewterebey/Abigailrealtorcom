# Changelog

Client-visible changes to abigailrealtor.com rebuild. Reverse-chronological.

Each entry should name what an Abigail-side reader would see or notice. Internal
refactors, dependency bumps, and tooling changes don't need their own entry
unless they change behavior on the site.

## Unreleased

### Changed
- All 12 placeholder listings now read as obviously fake. Addresses are
  scrubbed to fictional streets ("100 Placeholder Lane", "200 Sample
  Avenue", "300 Demo Drive", etc.) while keeping the real King County
  cities and ZIPs so the city/zip filters still work. Descriptions
  collapsed to a single line ("This is a placeholder listing — real
  property details will appear here once the IDX integration is live.")
  and feature bullets are now generic `Placeholder feature 1…7`. Listing
  photos under `/public/listings/` switched from Unsplash JPGs to flat
  gray SVGs labeled `PLACEHOLDER LISTING #01 / PRIMARY`, with `FRAME A/B/C`
  variants for the gallery thumbnails — no real-looking photography is
  shipped while we wait on a real IDX provider. New
  `scripts/generate-listing-placeholders.ts` regenerates the SVG set;
  `next.config.ts` opts in to `dangerouslyAllowSVG` so `next/image` can
  serve them. The defensive image-URL filter in `listing-detail.tsx` is
  removed now that every referenced frame exists on disk.
- `/neighborhoods/[slug]` detail pages rebuilt to match the live site:
  full-bleed aerial hero with centered uppercase city name, a new
  `Property Listings` section that fetches up to 8 active listings via
  `/api/listings?city=<name>&status=for-sale&limit=8` and renders them as a
  4-up grid with a gold "View More <City> Homes" CTA linking to the Home
  Search page, an "About / Overview" block with a 4-row quick-facts
  sidebar, a dark-band "Around <City>, WA" section with three gold score
  tiles (Walking / Bike / Transit) plus a Points of Interest intro and
  category chips (static — the live Yelp embed is out of scope; see
  TODO.md), and a Demographics & Employment block with horizontal gold
  progress bars for both Age Group and Education Level rows. Schools and
  the map-widget H2 sections are now suppressed to match the live
  structure; the static placeholder map remains pending Leaflet wiring.
  New reusable `ScoreCard` and `StatBar` components live under
  `components/neighborhood/`. The markdown list parser in
  `lib/neighborhoods.ts` now merges continuation lines into list items so
  the `- <Label>\n<count> (<pct>%)` Education rows parse correctly.

### SEO
- `/sitemap.xml` and `/robots.txt` now served from `app/sitemap.ts` and
  `app/robots.ts`. Sitemap covers the 11 top-level pages, 6 neighborhood
  detail pages, 4 blog posts, every placeholder property listing (pulled at
  build time from the IDX provider), and the 3 legal pages. Base URL reads
  from `NEXT_PUBLIC_SITE_URL` with a fallback to `https://abigailrealtor.com`.
- Added `alternates.canonical`, `openGraph`, and `twitter` metadata to every
  sub-page metadata export (about, buyers, sellers, options, home-valuation,
  testimonials, contact, neighborhoods index, blog index,
  terms-and-conditions, privacy-policy). OG images use each page's hero
  background where available (`{page}-background.jpg`) and fall back to
  `home-portrait-main.jpg` for pages without one — gap tracked in TODO.md.

### Changed
- Contact API (`/api/contact`) is now rate-limited to 5 submissions per
  10 minutes per IP and rejects any payload larger than 16 KB before
  parsing, so the form can't be used as a spam relay once Resend is wired
  up. Backed by a new in-memory token-bucket helper in `lib/rate-limit.ts`;
  a comment flags that multi-instance deployments will need a shared store.
- `InquiryForm` now uses native browser validation (dropped `noValidate`)
  so empty required fields are caught in the browser instead of
  round-tripping to the server for a 400.
- Listing-detail gallery thumbnails now carry descriptive alt text
  (`"<address> — photo N"`) for screen-reader users. Applies on every
  `/properties/[slug]` page once real IDX data surfaces the secondary
  images on disk.
- `lib/blog.ts`: consolidated the slug → title fallback onto the single
  `BLOG_POSTS` source of truth (added a `title` field to each entry and
  removed the duplicated map).
- Footer social-link row is hidden by default. The four icons pointed at
  `href="#"` (dead keyboard-tab targets) pending real URLs from Abigail.
  Set `NEXT_PUBLIC_SHOW_SOCIALS=true` to show them.

### Fixed
- `/home-search` no longer 404s — the bare route now redirects to
  `/home-search/listings`, matching where the site nav already points.
- `/dmca-notice` now renders from the verbatim `/content/legal/dmca-notice.md`
  source via the shared `LegalBody` component, instead of hand-re-keyed JSX
  that had collapsed whitespace and reformatted the original copy.
- `/neighborhoods/[unknown-slug]` now returns a `"Neighborhood not found"`
  page title alongside the 404 instead of an empty metadata object.

### Added
- Home page `RealEstateAgent` and `LocalBusiness` JSON-LD (CLAUDE.md §10).
  New `/lib/structured-data.ts` centralises the schema so future pages can
  reuse the agent/business shapes. `priceRange` and `openingHours` are
  placeholders pending Abigail's confirmation (see TODO.md).
- Home page SEO metadata: page-specific `title`, `description`, canonical,
  `openGraph` (with the 1200x1200 portrait), and `twitter` card image.

### Added
- Sub-pages: About Abigail, Buyer's Guide, Seller's Guide, Option Services,
  Home Valuation, Testimonials, and Contact. Copy is pulled verbatim from the
  corresponding markdown in `/content/`. All pages reuse the shared
  `Container`/`Section`/`ContactCta` primitives plus a new shared `PageHero`
  banner. Buyers/Sellers/Options/Contact/Home-Valuation render a shared
  `InquiryForm` that posts to `/api/contact` (dev logs to console; Resend
  wiring still pending `RESEND_API_KEY`). Home Valuation reproduces the
  live site's FAQ tiles, CMA vs. appraisal side-by-side, and "Why Is a
  Valuation Important?" grid; the instant-estimate widget on the live site is
  3rd-party and is stubbed as a form anchor in this build (open question in
  TODO.md — Home valuation provider). Contact page is a 2-column
  form/info layout with no "Ready to Begin" CTA (the whole page is contact).
- Ad-hoc `scripts/diff-page.ts` helper for capturing local screenshots of an
  arbitrary path at one or more viewports (used to eyeball new sub-pages
  against `/screenshots/live/`).
- Properties & Home Search: `/properties` renders a 3-column grid of all
  active, pending, and sold listings with status badges, a hero banner, and
  prev/next pagination (12 per page); `/properties/[slug]` renders a detail
  page with full-bleed hero, beds/baths/sqft/year band, description, feature
  list, sticky price sidebar with a "Request a Tour" CTA, and JSON-LD
  `Residence` schema for SEO (unknown slugs return 404); `/home-search/listings`
  provides URL-synced filters (city, min/max price, min beds, min baths, type,
  status) that refresh the results grid without a full page reload. The home
  page Spotlight section and every listing page now share a single
  `ListingCard` component.
- Blog section: `/blog` index with a 2-column grid of the four captured posts,
  each linking through to a full post-detail page (`/blog/[slug]`). Post copy
  is rendered verbatim from `/content/blog/*.md`.
- Legal pages: `/dmca-notice` (DMCA takedown + counter-notification
  instructions, verbatim), `/terms-and-conditions` (full Privacy Policy /
  Terms of Use document, verbatim), and `/privacy-policy` (short stub that
  points at the canonical Privacy Policy; pending a client decision — see
  TODO.md).
- Neighborhoods section: `/neighborhoods` index page with a 6-card grid
  (Bellevue, Seattle, Newcastle, Eastside, Shoreline, Renton) and a full
  `/neighborhoods/[slug]` detail route for each. Detail pages render the
  neighborhood overview, demographics, "Around", schools, and
  "Explore Other Neighborhoods" sections driven verbatim from
  `/content/neighborhoods/<slug>.md`, with a static map placeholder
  (Leaflet wiring tracked in TODO.md).
- Initial project scaffold (Next.js 15 + TypeScript + Tailwind v4 + shadcn/ui).
- IDX fake API layer at `/api/listings` and `/api/listings/[id]` backed by 12
  King County placeholder listings.
- NWMLS/IDX disclaimer captured verbatim from the live site footer.
- `npm run capture-live` script for refreshing live-site reference screenshots
  at the three design viewports (1440, 768, 375).
