# Admin page design — 2026-08-25

Approved in-session with Andrew. An admin area at `/admin` inside the existing
Next.js app, copying the structure and look of the Luxury Presence dashboard
(`app.luxurypresence.com` — Abigail's current CMS) so she gets a familiar UI on
the rebuilt site she owns.

## Decisions (approved)

- **Scope:** four modules — Website content (blog posts, testimonials), Leads
  (contact-form submissions), Listings (read-only; MLS data legally can't be
  hand-edited), Analytics (last phase, needs Plausible wired).
- **Placement:** `app/admin/` route group in this repo/app. Public pages move
  into an `app/(site)/` route group so the admin layout carries no public
  header/footer. URLs unchanged.
- **Auth:** Supabase Auth (email + password), allowlist of Abigail + Andrew.
  Middleware guards `/admin/*` and `/api/admin/*`. New deps approved:
  `@supabase/supabase-js`, `@supabase/ssr`. *(Not in the rough draft.)*
- **Persistence:** Supabase content tables (`blog_posts`, `testimonials`,
  `page_content`, `contact_submissions`); site reads DB-first with git content
  as seed/fallback; on-demand revalidation on save → instant publish.
  *(Not in the rough draft.)*
- **Visual style:** near-exact copy of LP's layout and neutral styling
  (light-gray sidebar frame, white rounded main panel, black pill buttons,
  data tables, status dots). Admin is scoped separately from the public site's
  square-corner/gold design rules.
- **Blog body editing:** markdown textarea + preview for v1, not a WYSIWYG.
- **Hard guardrail:** legal text (NWMLS/IDX disclaimers, DMCA, privacy) is
  never editable from the admin. Listings are never editable (NWMLS feed).

## Rough draft (this phase)

Non-persisting UI wired to real repo data, clearly labeling stubs:

- Shell: LP-style sidebar (Dashboard, Leads, Listings, Content → Blog Posts /
  Testimonials, Analytics), avatar footer, white main panel. `noindex` +
  `robots.txt` disallow for `/admin`.
- Dashboard: welcome + live stat cards (listings from the IDX provider, blog
  post + testimonial counts) + explore cards.
- Content → Blog Posts: LP-style table from `lib/blog.ts`; Edit Post screen
  cloning LP's (Post Details/SEO side-tabs, fields, markdown body, image
  panel). Save/Publish disabled with "next phase" notes.
- Content → Testimonials: table from `content/testimonials.json`.
- Leads: LP Contacts-style table with clearly-marked sample rows + banner
  (storage lands with Supabase phase).
- Listings: sync-status card (`getSnapshotDataAsOf`, counts) + paginated
  read-only table via the IDX provider.
- Analytics: LP-style stat tiles + placeholder charts, labeled placeholder.

## Later phases

1. Supabase Auth + middleware. 2. Supabase content tables + editors persist +
revalidation. 3. `/api/contact` → `contact_submissions` + live leads table.
4. Analytics via Plausible API. 5. Page-copy editing (scoped fields only).
