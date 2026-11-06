# Admin dashboard — tab review and build plan (2026-11-05)

Follow-up to `2026-08-25-admin-page-design.md`. That spec approved four
modules (Content, Leads, Listings, Analytics); the rough draft that followed
copied the Luxury Presence (LP) sidebar section-for-section, which left 13
top-level sections and 25 pages, most of them empty states. This document
goes through every tab, says whether it earns its place on a single-agent
site with an NWMLS feed, and lays out what to build, in what order.

Status: proposal. Decisions marked **Andrew** need his answer; everything
else is my recommendation and can be overridden.

## 1. What the admin is for

Abigail owns the rebuilt site. The admin exists so she can, without a
developer:

1. see and answer leads from the site's forms,
2. keep the site's own content current (testimonials, blog, neighborhood
   copy),
3. confirm the MLS feed is healthy (read-only; NWMLS data is never edited),
4. see whether the site is getting traffic and leads.

Anything in the sidebar that does not serve one of those four jobs is LP
parity for its own sake and should go. LP's sidebar is wide because LP sells
CRM, ad campaigns, email automation, multi-site and multi-agent products.
This site has none of those, and faking them with dead buttons makes the tool
feel broken rather than familiar.

## 2. Tab-by-tab verdict

Legend: **Keep** = stays, builds out. **Fold** = content moves into another
tab, page removed. **Cut** = remove page and nav entry.

| Tab (today) | Verdict | Why |
| --- | --- | --- |
| Dashboard | **Keep** | Landing page. Live counts already work; "New leads" and feed health are stubs. |
| Actions | **Cut** | LP's AI follow-up suggestions on CRM data. No CRM here. |
| Collaborations | **Cut** | LP's shared-home-search product. Needs visitor accounts; not planned. |
| Contacts | **Keep, rename "Leads"** | Core job 1. Only has sample rows today. |
| Listings → MLS Search | **Keep** | Core job 3. Works, but see fixes in §4. |
| Listings → Saved Searches | **Cut** | Needs visitor accounts. |
| Listings → Saved Listings | **Cut** | Same. |
| Listings → Listing Feeds | **Fold into Listings** | One feed, configured in CI. Its copy is also stale ("site rebuilds from the published snapshot" — the site reads Postgres now). Becomes the sync-health card on the Listings page. |
| Marketing → Email Campaigns | **Cut** | The page is literally LP's "this moved" redirect. |
| Auto Emails | **Cut** | Saved-search / valuation / saved-listing alerts all need visitor accounts plus transactional email. Revisit only if accounts are ever built. |
| Websites | **Cut** | Single site; "Create Website" can never do anything. A **Settings** page (new, §3) covers the one real need here. |
| Content → Agents | **Cut** | One agent. Her name, phone, photo and bio belong in Settings → Profile, not an LP agents table. |
| Content → Teams | **Cut** | No team. |
| Content → Blog Posts (+ editor) | **Keep, conditional** | Core job 2, but only if Abigail will write posts (TODO.md still lists this as an open question). If not, keep the list read-only and skip the editor. |
| Content → Developments | **Cut** | Not used on the site. |
| Content → Neighborhoods | **Keep (read-only for now)** | Lists the six guides and links to the live pages. Editing is deferred: the guides are structured markdown (score tiles, points of interest, demographics tables) that a free-text editor would break. |
| Content → Offices | **Cut** | No offices. |
| Content → Press Releases | **Cut** | Not used on the site. |
| Content → Properties | **Cut** | LP's hand-made property pages. Every listing here comes from the feed. |
| Content → Testimonials | **Keep** | Core job 2. Four records, simple shape, cheapest real editor to ship. |
| Presentations | **Cut** | LP product. |
| Analytics (5 sub-sections) | **Keep ONE page, cut the five sub-sections** | "Building Awareness / Attracting Visitors / Getting Leads / Establishing Trust / Products and Services" are LP's marketing-funnel reports driven by LP ad products. One analytics page with visitors, top pages, leads over time and search usage covers what Abigail would actually look at. |
| Education | **Cut as a section** | Replace with a single "Help" link in the sidebar footer to a short guide once the editors exist. |

## 3. The sidebar after pruning

```
Dashboard
Leads
Listings
Content
  Blog Posts
  Testimonials
  Neighborhoods
Analytics
Settings            (new)
---------------
Help                (footer link, later)
Abigail Anderson    (account / sign out)
```

Settings is new. It holds the handful of site-level values that today live
in code or env and that Abigail will reasonably want to change herself:
where lead emails go, her phone, Instagram handle, Calendly/booking URL if
any, and her profile photo/bio copy. It is the home for the later "page-copy
editing (scoped fields only)" phase from the original spec. Legal text is
not editable from it — that guardrail stands.

Files to delete with the cut: `app/admin/{actions,collaborations,marketing,
auto-emails,websites,presentations,education}/`, `app/admin/listings/
{saved-searches,saved-listings,feeds}/`, `app/admin/content/{agents,teams,
developments,offices,press-releases,properties}/`, `app/admin/analytics/
[section]/`, `components/admin/admin-content-empty.tsx`. The sidebar `NAV`
shrinks to the list above. `admin-empty-state.tsx` stays for genuine empty
states ("No leads yet").

## 4. What each surviving tab needs

### Dashboard
- Real "New leads" count (unread rows in `contact_submissions`) and the
  five most recent leads inline.
- Feed-health line: last sync time from the provider's `dataAsOf`, row
  count, and an amber warning when the last sync is older than 12 hours
  (NWMLS Rule 11). Red if older than 24 hours.
- Keep the content counts. Drop the "explore" cards; the sidebar does that.

### Leads
- Table `contact_submissions` (id, created_at, name, email, phone, message,
  intent `contact | valuation | newsletter`, source page, ip, user_agent,
  read_at, notes). RLS: no anon access; service role only via admin API
  routes guarded by auth.
- `/api/contact` inserts the row and still sends the email (Resend, when
  `RESEND_API_KEY` is set). The insert must not block the email, and a
  failed insert must not fail the visitor's submission.
- Table view with tabs All / Contact / Valuation / Newsletter, unread
  highlighting, mark read, a free-text notes field per lead, CSV export.
  LP's "Enriched" and "Clients" tabs are not needed.
- No "Add contact" button in v1. If Abigail wants manual contacts later it
  is a small add.

### Listings
- Fix: the "Data obtained as of" card calls `getSnapshotDataAsOf()` from
  the snapshot provider, which reads the local snapshot file and is wrong
  (or empty) in production, where the site reads Postgres. Use the
  provider's own `dataAsOf` lookup (already implemented in
  `lib/idx/supabase-provider.ts`).
- Sync-health card (from the folded Feeds page): last `synced_at`, listing
  counts by status, the 12-hour staleness warning, and a link to the
  GitHub Actions run list. If a `sync_runs` log table is added later the
  sync script can write one row per run (started, finished, rows, photos,
  result) and this card shows the last five runs.
- Search box: MLS number or address substring. Status filter. Keep the
  read-only banner and the NWMLS courtesy line; both are required.
- Row link to the public listing page.

### Content → Testimonials
- Table `testimonials` (id, author, quote, context/location, published,
  sort_order, created_at, updated_at). Seed from `content/testimonials.json`.
- Public pages read DB first, fall back to the JSON file when the DB is
  unreachable or empty (per original spec).
- Editor: author, quote, published toggle, drag or numeric ordering.
  On save: write row, call `revalidatePath` for `/` and `/testimonials`.

### Content → Blog Posts (if Abigail will write)
- Table `blog_posts` (slug, title, teaser, body_markdown, hero_image_path,
  published_at, status draft|published, updated_at). Seed from
  `content/blog/*.md` plus the index in `lib/blog.ts`.
- Editor: the existing screen, made real — title, subtitle, date, markdown
  body with a side-by-side preview that uses the same renderer as the
  public page, hero image upload to a Supabase Storage bucket, Draft /
  Publish. SEO side-tab: meta title, description.
- Prerequisite: the hand-rolled markdown renderer in `lib/blog.ts` only
  handles headings, paragraphs and lists (TODO.md). Either extend it for
  links, bold and images before giving Abigail an editor, or swap it for a
  small markdown library (dependency; ask first).
- If the answer is "she won't write": keep the read-only list, remove the
  editor route, and the blog stays in git.

### Content → Neighborhoods
- v1: read-only list, as now, with the "Created" column removed (nothing
  to show) and a "View on site" link per row.
- Later, if wanted: edit only the intro paragraph and the card/hero image
  per guide. The scored sections stay in markdown in the repo.

### Analytics
- Needs a provider; nothing is wired today (no Plausible script in the
  layout). See decision 2 below.
- One page: visitors and page views over 7/30/90 days, top pages, referrers,
  leads over time (from `contact_submissions`, no provider needed), and
  home-search usage (`/home-search/listings` views, valuation form submits).
- Until the provider is chosen, the page shows the leads chart and the
  internal counts only. The empty chart frames come out.

### Settings (new)
- Table `site_settings` (key, value, updated_at) or one JSON row. Keys:
  lead notification email, phone, Instagram handle, booking URL, profile
  bio paragraph. Each key maps to one place in the public site; nothing
  else is editable. Revalidate affected paths on save.
- This is where the go-live handoff items (contact destination, Instagram
  handle, Calendly) end up living instead of env vars, which is why it is
  worth doing before go-live rather than after.

## 5. Cross-cutting: auth and data (before any of the above ships)

- **Auth first.** Supabase Auth, email + password, allowlist of two accounts
  (Abigail, Andrew). `middleware.ts` guards `/admin/*` and `/api/admin/*`;
  unauthenticated requests redirect to `/admin/login`. Sign-out in the
  sidebar footer. Dependencies `@supabase/supabase-js` and `@supabase/ssr`
  were approved in the original spec but still need an explicit go before
  install.
- Nothing from `app/admin/` merges to `main` until the middleware is in and
  verified, because `main` auto-deploys to Netlify. Today `main` has no
  admin, which is correct.
- All writes go through `/api/admin/*` route handlers that check the session
  and use the service-role key server-side. The anon key never gains write
  access. The existing `scripts/db.ts` pattern (PostgREST with the service
  key) can be reused for the sync script; the admin routes should use the
  Supabase client.
- DDL lives in `scripts/sql/` next to `listings.sql`, one file per table,
  and is applied by Andrew in the Supabase SQL editor (the permission
  classifier denies `apply_migration` from Claude).
- The in-memory rate limiter is per-instance; fine for the admin, which has
  two users.

## 6. Build order and rough size

| Phase | Scope | Size |
| --- | --- | --- |
| 0 | Prune the sidebar and pages (§3); fix the two stale bits on Listings (§4) | half a session |
| 1 | Auth + middleware + login page + sign-out | 1 session |
| 2 | Leads: table DDL, `/api/contact` insert, Leads page, dashboard count | 1–2 sessions |
| 3 | Testimonials CRUD + DB-first read + revalidation | 1 session |
| 4 | Settings page (unblocks the go-live handoff items) | 1 session |
| 5 | Blog editor (only if decision 1 is yes) incl. renderer upgrade and image upload | 2–3 sessions |
| 6 | Analytics page once a provider is chosen | 1 session |
| 7 | Neighborhood intro/image editing (optional) | 1 session |

Phases 0–2 are the minimum for the admin to be useful to Abigail. Phase 4
is worth pulling ahead of 3 if go-live is close, since it replaces env-var
handoffs with something she can change herself.

## 7. Decisions needed from Andrew

1. **Will Abigail write blog posts?** Yes → phase 5 is in. No → the blog
   stays in git, the editor route is removed, and the list is read-only.
2. **Analytics provider.** Recommendation: Plausible (privacy-friendly, no
   cookie banner needed, simple API, about $9/month). Alternatives: Netlify
   Analytics (server-side, no script, similar price, weaker API), Umami
   (free, self-hosted, more upkeep), Google Analytics (free, needs consent
   UI). Without a choice, phase 6 stays as leads-only charts.
3. **Visitor accounts, ever?** If the answer is a firm no, Saved Searches,
   Saved Listings, Auto Emails and Collaborations are cut for good rather
   than "deferred", and the plan stays as written. If maybe, keep this
   document's cuts anyway; those features would be a separate design.
4. **Lead notification address.** Already a go-live handoff item. The Leads
   table works without it; the email does not.
5. **Neighborhood editing scope** (none / intro + images / full). Default
   in this plan: none for v1.

## 8. Not changing

- Listings stay read-only. Legal text stays out of the admin. Both are
  NWMLS/legal guardrails from the original spec, restated here so the
  pruning is not read as reopening them.
- The admin keeps its LP-style neutral look and stays exempt from the
  public site's square-corner/gold rules and from the visual-parity loop.
