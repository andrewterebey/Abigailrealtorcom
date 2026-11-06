# Admin prune + blog editor (front end) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut the admin sidebar down to the sections that serve this site, fix the stale Listings bits, and ship a working blog editor page (fields, markdown with live preview, image picker, browser-local draft) with no backend persistence yet.

**Architecture:** Pure deletions for the prune; the sidebar `NAV` array is the single source of the menu. The markdown parser and the public post block renderer move into import-anywhere modules so the admin preview renders exactly what `/blog/[slug]` renders. The editor is one client component fed by server pages (`[slug]` prefilled from the repo's content, `new` blank). Drafts live in `localStorage` until the Supabase phase; Publish stays disabled.

**Tech Stack:** Next.js 15 App Router, React 19 client components, Tailwind v4, lucide-react. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-05-admin-dashboard-plan.md` (§2 verdicts, §3 sidebar, §4 Listings and Blog Posts) on top of `docs/superpowers/specs/2026-08-25-admin-page-design.md`.

## Global Constraints

- No new dependencies (spec §4 flags a markdown library as "ask first"; this plan extends nothing, it reuses the existing parser).
- Admin stays `noindex` (layout metadata) and `robots.txt`-disallowed; nothing from `app/admin/` merges to `main` before auth.
- Listings remain read-only; the NWMLS courtesy line on the Listings page stays verbatim.
- Legal text is never editable from the admin.
- Admin UI keeps the LP-style neutral look (`.admin-root`), exempt from the public design tokens and from the parity loop.
- `npm run lint` passes after every task.
- Work on `feat/admin-rough-draft`; commit per task with the Co-Authored-By trailer.

## Review Focus

1. A post whose body contains a line starting with `# ` mid-article: the parser drops it (title comes from the field), the preview must not show a stray heading — covered by Task 3's parser check.
2. Refreshing the editor with an unsaved draft: the draft must come back with a visible "restored" notice and a Discard control — Task 4 browser check.
3. Opening the editor for a slug that does not exist: `notFound()`, not a crash — Task 5 curl check (404).
4. A new post with an empty title: slug preview shows a placeholder, Save draft still works, Publish stays disabled — Task 4 browser check.
5. The Listings "Data obtained as of" card in DB mode: must show the DB stamp, not the snapshot file's — Task 2 check against `select max(synced_at)`.

---

### Task 1: Prune the sidebar and the dead pages

**Files:**
- Delete: `app/admin/{actions,collaborations,marketing,auto-emails,websites,presentations,education}/`, `app/admin/listings/{saved-searches,saved-listings}/`, `app/admin/content/{agents,teams,developments,offices,press-releases,properties}/`, `app/admin/analytics/[section]/`, `components/admin/admin-content-empty.tsx`
- Move: `app/admin/contacts/page.tsx` → `app/admin/leads/page.tsx` (title "Leads", copy unchanged otherwise)
- Modify: `components/admin/admin-sidebar.tsx` (NAV + footer), `app/admin/page.tsx` (hrefs), `components/admin/admin-analytics-view.tsx` (single section, drop `ANALYTICS_SECTIONS` map), `app/admin/analytics/page.tsx`

**Interfaces:**
- Produces: `NAV` = Dashboard `/admin`, Leads `/admin/leads`, Listings `/admin/listings`, Content (`/admin/content/blog-posts`, `/admin/content/testimonials`, `/admin/content/neighborhoods`), Analytics `/admin/analytics`. Footer: account row only (Education link removed).

- [ ] Step 1: Delete the directories and the component listed above; `git mv` contacts → leads.
- [ ] Step 2: Rewrite `NAV` to the six entries; Content's top-level `href` becomes `/admin/content/blog-posts`; remove unused lucide imports.
- [ ] Step 3: `AdminAnalyticsView` takes no props and renders the one page: title "Analytics", intro sentence, the four live tiles, two chart frames titled "Visitors over time" and "Leads over time", both labelled "No analytics source connected".
- [ ] Step 4: Dashboard: `/admin/contacts` → `/admin/leads` in `stats` and `explore`.
- [ ] Step 5: Verify: `npm run lint`; `curl -o /dev/null -w '%{http_code}' localhost:3000/admin/actions` → 404; `/admin/leads` → 200; `grep -rn "admin/contacts\|admin/education" app components` → no hits.
- [ ] Step 6: Commit `refactor(admin): prune LP-parity sections down to the five that serve this site`.

### Task 2: Listings page — DB-correct "data as of" and the sync-health card

**Files:**
- Modify: `app/admin/listings/page.tsx`
- Delete: `app/admin/listings/feeds/page.tsx`

**Interfaces:**
- Consumes: `getDataAsOf(): Promise<string | undefined>` from `@/lib/idx` (picks DB vs snapshot by env). `provider.list({ status }, { limit: 1, offset: 0 })` for per-status totals.

- [ ] Step 1: Replace the `getSnapshotDataAsOf` import with `getDataAsOf` from `@/lib/idx`.
- [ ] Step 2: Add a "Feed" card above the table: name "NWMLS via MLS Grid", one-line description "Replicated to Supabase twice daily (6 AM / 6 PM Pacific) by GitHub Actions; the site reads the database directly.", a status pill computed from the age of `dataAsOf`: green "Healthy" under 12 h, amber "Stale" 12–24 h, red "Overdue" over 24 h or unknown; counts Active / Pending / Sold from three `provider.list` calls; link "View sync runs" → `https://github.com/andrewterebey/Abigailrealtorcom/actions/workflows/sync-idx.yml` (new tab).
- [ ] Step 3: Add a GET-form search box (`?q=`) that filters the table by MLS number or address substring: pass `q` to the provider as… the provider has no text filter, so filter client-side is not possible across pages. Decision: skip search in this task (spec §4 lists it; it needs a provider `q` filter in all three filter locations and is its own task). Note it in the page as a TODO comment.
- [ ] Step 4: Verify: `npm run lint`; load `/admin/listings` and compare the "Data obtained as of" value against `select max(record->>'dataAsOf') from public.listings` (Supabase MCP) — must match the DB, not the local snapshot's date.
- [ ] Step 5: Commit `fix(admin): listings page reads the DB data-as-of stamp; feed health card replaces the Feeds tab`.

### Task 3: Shareable markdown parser and post renderer

**Files:**
- Create: `lib/blog-markdown.ts` — `export type Block`, `export function parseBlocks(body: string): Block[]`, `export function stripPostChrome(body: string): string`, `export function splitFrontmatter(raw: string): { fm: Record<string, string>; body: string }` (moved verbatim from `lib/blog.ts`; no `node:` imports).
- Create: `components/blog/post-block.tsx` — `export function PostBlock({ block }: { block: Block })` (moved verbatim from `app/(site)/blog/[slug]/page.tsx`).
- Modify: `lib/blog.ts` (import from the new module; re-export `Block`; add `getPostSource`), `app/(site)/blog/[slug]/page.tsx` (import `PostBlock`).

**Interfaces:**
- Produces: `getPostSource(slug: string): Promise<{ meta: BlogPostMeta; body: string } | null>` in `lib/blog.ts` — `body` is the cleaned markdown (frontmatter and captured page chrome removed, leading `# Title` line removed), i.e. what the editor should show.

- [ ] Step 1: Move the three functions and the `Block` type; keep `lib/blog.ts` exports unchanged for existing callers.
- [ ] Step 2: Move `PostBlock`; the public page's JSX output must be byte-identical (same classes).
- [ ] Step 3: Add `getPostSource`. The leading `# ` line is stripped so the title field is the single source of the title.
- [ ] Step 4: Verify: `npm run lint`; `npx tsx -e` that imports `parseBlocks` from `lib/blog-markdown` and asserts `parseBlocks('# T\n\nHello\n\n## H\n- a\n- b')` equals `[{kind:'p',text:'Hello'},{kind:'h2',text:'H'},{kind:'ul',items:['a','b']}]`; `curl localhost:3000/blog/kirkland-real-estate-life-in-a-lakeside-retreat` still 200 with the same h2 count as before the change.
- [ ] Step 5: Commit `refactor(blog): split markdown parser and post renderer into shareable modules`.

### Task 4: The editor component

**Files:**
- Create: `components/admin/blog-post-editor.tsx` (`'use client'`)

**Interfaces:**
- Produces:
  ```ts
  export type BlogDraft = {
    slug: string; title: string; subtitle: string; date: string; author: string
    featured: boolean; body: string; image: string | null
    metaTitle: string; metaDescription: string
  }
  export function BlogPostEditor(props: { mode: 'new' | 'edit'; initial: BlogDraft }): JSX.Element
  ```
- Consumes: `parseBlocks` from `@/lib/blog-markdown`, `PostBlock` from `@/components/blog/post-block`.

Behaviour (each is a decision, not a suggestion):
- Top bar: back arrow → `/admin/content/blog-posts`; heading "Edit Post" / "New Post"; status pill "Draft" (new) / "Published" (edit); buttons Preview-on-site (edit mode only, opens `/blog/<slug>`), Cancel, **Save draft** (enabled), **Publish** (disabled, title tooltip "Publishing lands with the Supabase phase").
- Side tabs: Post Details / SEO, both functional (state `tab`).
- Post Details fields: Title (required), Subtitle, Publishing Date (`<input type="date">`, stored as `YYYY-MM-DD`; converts the repo's `MM/DD/YY` on load), Author, Featured checkbox, Post Body (markdown textarea) with a Write / Preview toggle; Preview renders `parseBlocks(body).map(PostBlock)` inside a `.blog-preview` wrapper so the public typography classes apply; a word count under the textarea.
- New mode: slug auto-derives from the title (`lowercase, a–z0–9, hyphens, trimmed`) and shows as read-only text under the title (`/blog/<slug>` or `/blog/…` when empty).
- SEO tab: Meta title (placeholder: the title), Meta description (160-char counter).
- Images panel: current image (or empty frame), "Choose image" file input (`image/*`); selection shows via `URL.createObjectURL`, is NOT persisted to the draft (files can't live in localStorage), and a note says so.
- Draft: Save draft writes `BlogDraft` JSON to `localStorage['admin:blog-draft:' + (mode==='new' ? 'new' : slug)]` and shows "Draft saved HH:MM — stored in this browser only". On mount, if a draft exists for the key, load it and show a bar "Restored an unsaved draft from this browser" with a **Discard** button that clears the key and resets to `initial`. All `localStorage` access is wrapped in try/catch.
- Dirty state: Cancel with unsaved changes uses an inline confirm bar (not `window.confirm`).

- [ ] Step 1: Write the component with the state shape above; no network calls.
- [ ] Step 2: Add `.blog-preview` scoping in `app/globals.css` only if the public classes don't render inside `.admin-root` (the admin resets heading styles; the preview must look like the site, so `.admin-root .blog-preview h2/h3` restore `font-display`, uppercase and the gold color).
- [ ] Step 3: `npm run lint`.
- [ ] Step 4: Commit with Task 5 (the component has no route until then).

### Task 5: Routes — edit, new, list

**Files:**
- Modify: `app/admin/content/blog-posts/[slug]/page.tsx` (server: `getPostSource` → `BlogPostEditor mode="edit"`; `notFound()` when null), `app/admin/content/blog-posts/page.tsx` (Add New → link to `/admin/content/blog-posts/new`; table extracted to a client component with a working search box)
- Create: `app/admin/content/blog-posts/new/page.tsx` (`BlogPostEditor mode="new"` with blanks; `author: 'Abigail Anderson'`, `date: today`)
- Create: `components/admin/blog-posts-table.tsx` (`'use client'`; props `posts: { slug; title; image; date }[]`; search filters by title, case-insensitive; shows "N records")

- [ ] Step 1: Build the three pages. The `[slug]` route must be declared before `new` is matched — in the App Router a static `new/` segment wins over `[slug]`, so no ordering issue; just ensure `getPostSource('new')` is never reached.
- [ ] Step 2: Verify with curl: `/admin/content/blog-posts` 200, `/admin/content/blog-posts/new` 200, `/admin/content/blog-posts/kirkland-real-estate-life-in-a-lakeside-retreat` 200, `/admin/content/blog-posts/does-not-exist` 404.
- [ ] Step 3: Browser check (Claude in Chrome): open the Kirkland post — body shows the article only (no nav list / "Buttons:" line); switch to Preview — headings render gold uppercase like the live post; type in the body, Save draft, reload → restored bar appears, Discard → original body back; open `/new`, type a title → slug appears; search on the list narrows rows.
- [ ] Step 4: `npm run lint`.
- [ ] Step 5: Commit `feat(admin): blog editor front end — fields, markdown preview, image picker, browser-local drafts`.

### Task 6: Docs and bookkeeping

**Files:**
- Modify: `CHANGELOG.md` (Unreleased → the admin bullet: sidebar pruned to Dashboard/Leads/Listings/Content/Analytics; blog editor front end, drafts browser-local, Publish pending Supabase phase), `docs/superpowers/specs/2026-11-05-admin-dashboard-plan.md` (status line: phase 0 + blog editor front end done 2026-11-05), wrapper `CLAUDE.md` App-structure paragraph (sidebar now five sections; editor exists; drafts not persisted).

- [ ] Step 1: Make the three edits.
- [ ] Step 2: Commit `docs(admin): record the prune and the blog editor front end`.
