import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'

/**
 * Single source of truth for the six neighborhoods Abigail covers. Order here
 * is the order they render on the /neighborhoods index.
 */
export const NEIGHBORHOOD_SLUGS = [
  'bellevue',
  'seattle',
  'newcastle',
  'eastside',
  'shoreline',
  'renton',
] as const

export type NeighborhoodSlug = (typeof NEIGHBORHOOD_SLUGS)[number]

export const NEIGHBORHOODS: Record<
  NeighborhoodSlug,
  {
    slug: NeighborhoodSlug
    name: string
    cardImage: string
    heroImage: string
    /** Short blurb used on the /neighborhoods index card. */
    blurb: string
    /** Best-effort centroid for the static map placeholder. */
    coords: { lat: number; lng: number }
  }
> = {
  bellevue: {
    slug: 'bellevue',
    name: 'Bellevue',
    cardImage: '/images/home-neighborhoods-image-bellevue.jpg',
    heroImage: '/images/neighborhoods-bellevue-background.jpg',
    blurb:
      'High-rise skyline, waterfront parks, and some of the strongest schools on the Eastside.',
    coords: { lat: 47.6101, lng: -122.2015 },
  },
  seattle: {
    slug: 'seattle',
    name: 'Seattle',
    cardImage: '/images/home-neighborhoods-image-seattle.jpg',
    heroImage: '/images/neighborhoods-seattle-background.jpg',
    blurb:
      'Urban neighborhoods on Elliott Bay, from Queen Anne to Capitol Hill to Ballard.',
    coords: { lat: 47.6062, lng: -122.3321 },
  },
  newcastle: {
    slug: 'newcastle',
    name: 'Newcastle',
    cardImage: '/images/home-neighborhoods-image-newcastle.jpg',
    heroImage: '/images/neighborhoods-background.jpg',
    blurb:
      'Tucked between Bellevue and Renton, with golf, hillside views, and quiet streets.',
    coords: { lat: 47.5301, lng: -122.1621 },
  },
  eastside: {
    slug: 'eastside',
    name: 'Eastside',
    cardImage: '/images/home-neighborhoods-image-eastside.jpg',
    heroImage: '/images/neighborhoods-background.jpg',
    blurb:
      'Bellevue, Kirkland, Redmond and the tech-corridor suburbs east of Lake Washington.',
    coords: { lat: 47.6694, lng: -122.1215 },
  },
  shoreline: {
    slug: 'shoreline',
    name: 'Shoreline',
    cardImage: '/images/home-neighborhoods-image-shoreline.jpg',
    heroImage: '/images/neighborhoods-background.jpg',
    blurb:
      'North of Seattle with light-rail access, mid-century homes, and Puget Sound views.',
    coords: { lat: 47.7557, lng: -122.3415 },
  },
  renton: {
    slug: 'renton',
    name: 'Renton',
    cardImage: '/images/home-neighborhoods-image-renton.jpg',
    heroImage: '/images/neighborhoods-background.jpg',
    blurb:
      'South-end value on Lake Washington, with a growing downtown and close-in commute.',
    coords: { lat: 47.4829, lng: -122.2171 },
  },
}

export function isNeighborhoodSlug(value: string): value is NeighborhoodSlug {
  return (NEIGHBORHOOD_SLUGS as readonly string[]).includes(value)
}

/* ------------------------------------------------------------------------- */
/*  Minimal, hand-rolled markdown section parser.                             */
/*                                                                           */
/*  The per-slug /content/neighborhoods/<slug>.md files follow a consistent   */
/*  shape: YAML frontmatter, a nav bullet list, a `# <Name>` H1, then a run   */
/*  of `## Section` blocks. We split on H2s and only render the sections we   */
/*  want on the detail page — skipping the nav/buttons/footer scaffolding,    */
/*  property-listings search UI (rendered separately as a CTA), and the      */
/*  "Explore Other Neighborhoods" / "Ready to Begin?" blocks (ContactCta      */
/*  handles the final CTA).                                                   */
/*                                                                           */
/*  If we ever need richer rendering (inline bold/italics/links inside body   */
/*  text), switch to react-markdown — tracked in TODO.md.                     */
/* ------------------------------------------------------------------------- */

export type MarkdownBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'heading'; level: 3 | 4 | 5 | 6; text: string }
  | { kind: 'list'; items: string[] }

export type MarkdownSection = {
  /** H2 heading, e.g. "Overview for Bellevue, WA". */
  title: string
  blocks: MarkdownBlock[]
}

/** H2 section titles we do NOT render on the detail page. */
const SECTION_BLOCKLIST = new Set([
  'Property Listings',
  'Explore Other Neighborhoods',
  'Ready to Begin?',
])

/** H2 section title *prefixes* (case-insensitive) we drop wholesale. */
const SECTION_BLOCKLIST_PREFIXES = [
  // Schools tables are data-dense and lose meaning without the rating widget
  // on the live site. Suppress for now; live reference screenshots also elide.
  'Schools in ',
]

function stripFrontmatter(raw: string): string {
  if (!raw.startsWith('---')) return raw
  const end = raw.indexOf('\n---', 3)
  if (end === -1) return raw
  return raw.slice(end + 4).replace(/^\r?\n/, '')
}

function parseBlocks(body: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = []
  const lines = body.split(/\r?\n/)
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i++
      continue
    }
    // List: a run of lines starting with `- `. A list item may span multiple
    // physical lines until the next `- ` prefix or an empty line followed by
    // non-list content (we absorb blank-line gaps between sibling items, but
    // stop at blank-line-then-heading or blank-line-then-paragraph).
    if (/^\s*-\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length) {
        const cur = lines[i]
        if (!/^\s*-\s+/.test(cur)) {
          // Could be a continuation line or the end of the list. Peek ahead:
          // if we see another `- ` after blanks, treat current + intervening
          // non-blank lines as continuation of the previous item.
          break
        }
        const parts: string[] = [cur.replace(/^\s*-\s+/, '').trim()]
        i++
        // Absorb continuation lines until the next `- `, a heading, or we hit
        // two consecutive blank lines (which ends the list).
        while (i < lines.length) {
          const c = lines[i]
          if (/^\s*-\s+/.test(c)) break
          if (/^#{1,6}\s+/.test(c)) break
          if (!c.trim()) {
            // blank — peek to the next non-blank; if it's a new list item, keep going.
            let k = i + 1
            while (k < lines.length && !lines[k].trim()) k++
            if (k < lines.length && /^\s*-\s+/.test(lines[k])) {
              i = k
              break
            }
            // blank line followed by non-list content ends the list.
            break
          }
          parts.push(c.trim())
          i++
        }
        items.push(parts.join(' '))
      }
      blocks.push({ kind: 'list', items })
      continue
    }
    // Sub-heading ###, ####, #####, ######
    const h = /^(#{3,6})\s+(.*)$/.exec(line)
    if (h) {
      blocks.push({
        kind: 'heading',
        level: h[1].length as 3 | 4 | 5 | 6,
        text: h[2].trim(),
      })
      i++
      continue
    }
    // Drop the "Buttons: `...`" and "Form fields: `...`" scaffolding lines —
    // those are artifacts of the live-site capture, not real copy.
    if (/^(Buttons|Form fields):\s*/.test(line)) {
      i++
      continue
    }
    // Paragraph: collect consecutive non-empty, non-special lines.
    const para: string[] = [line.trim()]
    i++
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,6}\s+/.test(lines[i]) &&
      !/^\s*-\s+/.test(lines[i]) &&
      !/^(Buttons|Form fields):\s*/.test(lines[i])
    ) {
      para.push(lines[i].trim())
      i++
    }
    blocks.push({ kind: 'paragraph', text: para.join(' ') })
  }
  return blocks
}

export type ParsedNeighborhood = {
  /** First H1, e.g. "Bellevue". */
  title: string
  sections: MarkdownSection[]
}

export function readNeighborhood(slug: NeighborhoodSlug): ParsedNeighborhood {
  const file = path.join(
    process.cwd(),
    'content',
    'neighborhoods',
    `${slug}.md`,
  )
  if (!existsSync(file)) {
    return { title: NEIGHBORHOODS[slug].name, sections: [] }
  }
  const raw = stripFrontmatter(readFileSync(file, 'utf8'))
  // Split on H2. The first chunk contains the nav list + H1.
  const parts = raw.split(/\r?\n## /)
  const head = parts.shift() ?? ''
  const h1 = /^#\s+(.*)$/m.exec(head)
  const title = h1 ? h1[1].trim() : NEIGHBORHOODS[slug].name
  const sections: MarkdownSection[] = []
  for (const chunk of parts) {
    const nl = chunk.indexOf('\n')
    const rawTitle = (nl === -1 ? chunk : chunk.slice(0, nl)).trim()
    const body = nl === -1 ? '' : chunk.slice(nl + 1)
    if (SECTION_BLOCKLIST.has(rawTitle)) continue
    if (
      SECTION_BLOCKLIST_PREFIXES.some((p) =>
        rawTitle.toLowerCase().startsWith(p.toLowerCase()),
      )
    ) {
      continue
    }
    sections.push({ title: rawTitle, blocks: parseBlocks(body) })
  }
  return { title, sections }
}

/* ------------------------------------------------------------------------- */
/*  Helpers that mine specific shapes out of the parsed markdown sections.    */
/* ------------------------------------------------------------------------- */

/** A single Walking / Bike / Transit score tile. */
export type ScoreTile = {
  score: string
  label: string
  category: string
}

/**
 * In `## Around <City>, WA` the markdown alternates:
 *   `##### <number>`  →  `###### <qualitative label>`  →  `<Category> Score`
 *
 * Some neighborhoods omit the Transit row, and some extend the pattern with a
 * `Buttons: \`Learn More\`` line. We walk blocks and reassemble up to three
 * tiles whose category ends in "Score".
 */
export function getScoreTiles(section: MarkdownSection): ScoreTile[] {
  const tiles: ScoreTile[] = []
  const blocks = section.blocks
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    if (b.kind !== 'heading' || b.level !== 5) continue
    // The next h6 holds the qualitative label.
    let label = ''
    let category = ''
    for (let j = i + 1; j < blocks.length; j++) {
      const next = blocks[j]
      if (next.kind === 'heading' && next.level === 6) {
        label = next.text
      } else if (next.kind === 'paragraph') {
        if (/Score$/i.test(next.text)) {
          category = next.text
          break
        }
      } else if (next.kind === 'heading' && next.level === 5) {
        break
      }
    }
    if (label && category) tiles.push({ score: b.text, label, category })
  }
  return tiles
}

/** Intro paragraph for the "Around <City>, WA" section — first paragraph before the tiles. */
export function getAroundIntro(section: MarkdownSection): string | null {
  for (const b of section.blocks) {
    if (b.kind === 'paragraph') return b.text
    if (b.kind === 'heading' && b.level >= 5) return null
  }
  return null
}

/**
 * Pull the "Points of Interest" sub-section out of the Around section.
 * The live site has a live Yelp embed we don't replicate, but we can at least
 * surface the intro paragraph and the category chip labels.
 */
export function getPointsOfInterest(
  section: MarkdownSection,
): { intro: string | null; chips: string[] } {
  const blocks = section.blocks
  const startIdx = blocks.findIndex(
    (b) => b.kind === 'heading' && b.level === 4 && /Points of Interest/i.test(b.text),
  )
  if (startIdx === -1) return { intro: null, chips: [] }
  let intro: string | null = null
  for (let i = startIdx + 1; i < blocks.length; i++) {
    const b = blocks[i]
    if (b.kind === 'paragraph') {
      intro = b.text
      break
    }
    if (b.kind === 'heading') break
  }
  // Chips are static/known on the live site (they drive a Yelp embed we don't
  // replicate). Return the stable set here; dedicated parsing wasn't worth it
  // since the `Buttons: \`...\`` scaffolding line is dropped during parseBlocks.
  const chips = ['All', 'Restaurants', 'Shopping', 'Active', 'Beauty', 'Nightlife']
  return { intro, chips }
}

/** A single demographics row — label + a 0–100 percentage. */
export type DemoRow = {
  label: string
  percent: number
  valueLabel: string
}

/**
 * Walk the Demographics section looking for the `0-9: 10.44%` style lines.
 * The parser collapses those into a single paragraph run; we split them out.
 */
export function getAgeGroupRows(section: MarkdownSection): DemoRow[] {
  const rows: DemoRow[] = []
  const re = /(\d+(?:-\d+|\+)\s*(?:Years)?):\s*([\d.]+)%/g
  for (const b of section.blocks) {
    if (b.kind !== 'paragraph') continue
    let match: RegExpExecArray | null
    while ((match = re.exec(b.text))) {
      const rawLabel = match[1].trim().replace(/\s+Years$/i, '')
      const percent = Number.parseFloat(match[2])
      if (Number.isNaN(percent)) continue
      rows.push({
        label: `${rawLabel} Years`,
        percent,
        valueLabel: `${match[2]}%`,
      })
    }
  }
  return rows
}

/** Education-level list rows: "- <Label>\n<count> (<pct>%)". */
export function getEducationRows(section: MarkdownSection): DemoRow[] {
  const rows: DemoRow[] = []
  for (const b of section.blocks) {
    if (b.kind !== 'list') continue
    for (const item of b.items) {
      const m = /^(.+?)\s+\d[\d,]*\s*\(([\d.]+)%\)/.exec(item)
      if (!m) continue
      const label = m[1].trim()
      const percent = Number.parseFloat(m[2])
      if (Number.isNaN(percent)) continue
      rows.push({
        label,
        percent,
        valueLabel: `${m[2]}%`,
      })
    }
  }
  return rows
}

/** Strip frontmatter + lift the intro paragraph out of content/neighborhoods.md. */
export function readNeighborhoodsIndexIntro(): {
  heading: string
  eyebrow: string
  paragraph: string
} {
  const file = path.join(process.cwd(), 'content', 'neighborhoods.md')
  if (!existsSync(file)) {
    return {
      heading: 'Areas of Expertise',
      eyebrow: 'Explore Communities',
      paragraph: '',
    }
  }
  const raw = stripFrontmatter(readFileSync(file, 'utf8'))
  const h1 = /^#\s+(.*)$/m.exec(raw)
  const h2 = /^##\s+(.*)$/m.exec(raw)
  return {
    heading: h2 ? h2[1].trim() : 'Areas of Expertise',
    eyebrow: h1 ? h1[1].trim() : 'Neighborhoods',
    paragraph:
      'Explore the King County communities Abigail knows best, from downtown Bellevue high-rises to Seattle\u2019s urban neighborhoods and the waterfront towns in between.',
  }
}
