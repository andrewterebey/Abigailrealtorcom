# Changelog

Client-visible changes to abigailrealtor.com rebuild. Reverse-chronological.

Each entry should name what an Abigail-side reader would see or notice. Internal
refactors, dependency bumps, and tooling changes don't need their own entry
unless they change behavior on the site.

## Unreleased

### Added
- Initial project scaffold (Next.js 15 + TypeScript + Tailwind v4 + shadcn/ui).
- IDX fake API layer at `/api/listings` and `/api/listings/[id]` backed by 12
  King County placeholder listings.
- NWMLS/IDX disclaimer captured verbatim from the live site footer.
- `npm run capture-live` script for refreshing live-site reference screenshots
  at the three design viewports (1440, 768, 375).
