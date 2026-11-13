/**
 * Shape of a blog post while it is being written in the admin editor, plus
 * the pure helpers both the server pages (prefilling) and the client editor
 * share. No persistence here: until the Supabase phase, drafts live only in
 * the editor's browser (`localStorage`).
 */

export type BlogDraft = {
  slug: string
  title: string
  subtitle: string
  /** ISO date, YYYY-MM-DD (the repo's index uses MM/DD/YY — see mmddyyToIso). */
  date: string
  author: string
  featured: boolean
  /** Article markdown — the dialect lib/blog-markdown.ts parses. */
  body: string
  /** Public path or URL of the hero image; null when none chosen yet. */
  image: string | null
  metaTitle: string
  metaDescription: string
}

export const DEFAULT_AUTHOR = 'Abigail Anderson'

export function emptyDraft(today: string): BlogDraft {
  return {
    slug: '',
    title: '',
    subtitle: '',
    date: today,
    author: DEFAULT_AUTHOR,
    featured: false,
    body: '',
    image: null,
    metaTitle: '',
    metaDescription: '',
  }
}

/** "Kirkland Real Estate: Life in a Lakeside Retreat" → "kirkland-real-estate-life-in-a-lakeside-retreat". */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** "07/31/25" → "2025-07-31"; anything unparseable is returned as-is. */
export function mmddyyToIso(mmddyy: string | undefined): string {
  if (!mmddyy) return ''
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/.exec(mmddyy)
  if (!m) return mmddyy
  const [, mo, d, y] = m
  return `20${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}
