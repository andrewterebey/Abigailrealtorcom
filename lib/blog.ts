import { readFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * Small, dependency-free reader + markdown converter for the blog posts in
 * /content/blog/*.md. We deliberately hand-roll parsing (CLAUDE.md rule: "If
 * you ever feel tempted to add a dependency, stop and ask first.") — the posts
 * are captured from the live site in a very narrow dialect: frontmatter, h1,
 * h2 headers, paragraphs, and the occasional list. Anything more exotic gets
 * dropped into TODO.md.
 */

export type BlogPostMeta = {
  slug: string
  title: string
  description: string
  teaser: string
  date?: string
  image: string
}

export type BlogPost = BlogPostMeta & {
  blocks: Block[]
}

export type Block =
  | { kind: 'p'; text: string }
  | { kind: 'h2'; text: string }
  | { kind: 'h3'; text: string }
  | { kind: 'ul'; items: string[] }

// --- slug → post metadata -------------------------------------------------

type PostDefinition = {
  slug: string
  file: string
  title: string
  image: string
  date: string
  teaser: string
}

/**
 * Source of truth for the blog index. Order matches the live site's grid
 * (top-left → bottom-right). Teasers are copied from content/blog/index.md.
 * Titles are copied from each post's frontmatter and used as the fallback
 * when the file hasn't been read yet (e.g. on the grid).
 */
export const BLOG_POSTS: PostDefinition[] = [
  {
    slug: 'kirkland-real-estate-life-in-a-lakeside-retreat',
    file: 'kirkland-real-estate-life-in-a-lakeside-retreat.md',
    title: 'Kirkland Real Estate: Life in a Lakeside Retreat',
    image: '/images/blog-image-kirkland-real-estate-life-in-a-lakeside-retreat.jpg',
    date: '07/31/25',
    teaser:
      'It means embracing a lifestyle that combines urban conveniences with natural beauty.',
  },
  {
    slug: 'seattle-real-estate-guide-buying-tips-for-first-time-homeowners',
    file: 'seattle-real-estate-guide-buying-tips-for-first-time-homeowners.md',
    title: 'Seattle Real Estate Guide: Buying Tips for First-Time Homeowners',
    image: '/images/blog-image-seattle-real-estate-guide-buying-tips-for-first-time-homeown.jpg',
    date: '07/31/25',
    teaser:
      'Obtaining a mortgage pre-approval is a critical first step in the home-buying process.',
  },
  {
    slug: 'investing-in-bellevue-real-estate-an-essential-guide',
    file: 'investing-in-bellevue-real-estate-an-essential-guide.md',
    title: 'Investing in Bellevue Real Estate: An Essential Guide',
    image: '/images/blog-image-investing-in-bellevue-real-estate-an-essential-guide.jpg',
    date: '07/31/25',
    teaser:
      'Bellevue real estate offers unparalleled opportunities for both investors and homebuyers.',
  },
  {
    slug: 'why-king-county-homes-are-a-smart-investment',
    file: 'why-king-county-homes-are-a-smart-investment.md',
    title: 'Why King County Homes Are a Smart Investment',
    image: '/images/blog-image-why-king-county-homes-are-a-smart-investment.jpg',
    date: '07/31/25',
    teaser:
      'King County homes are becoming increasingly sought after in today’s real estate market.',
  },
]

// --- content loading ------------------------------------------------------

function contentRoot(): string {
  return path.join(process.cwd(), 'content', 'blog')
}

async function readPostFile(file: string): Promise<string> {
  return readFile(path.join(contentRoot(), file), 'utf8')
}

/**
 * Strip a leading YAML frontmatter block and return the body plus any
 * recognized fields. Enough of a parser for our captured files.
 */
function splitFrontmatter(src: string): {
  fm: Record<string, string>
  body: string
} {
  const lines = src.split(/\r?\n/)
  const fm: Record<string, string> = {}
  if (lines[0] !== '---') {
    return { fm, body: src }
  }
  let i = 1
  for (; i < lines.length; i++) {
    if (lines[i] === '---') break
    const m = lines[i].match(/^([a-zA-Z_]+):\s*"?(.*?)"?\s*$/)
    if (m) fm[m[1]] = m[2]
  }
  const body = lines.slice(i + 1).join('\n')
  return { fm, body }
}

/**
 * Posts from Luxury Presence come with a bunch of chrome we don't want on our
 * rebuild (nav links, "Buttons:" pseudo-content, footer boilerplate, etc).
 * We're rendering it ourselves via SiteHeader / ContactCta / SiteFooter, so
 * this filter strips the duplicates and returns just the body prose.
 */
function stripPostChrome(body: string): string {
  const lines = body.split(/\r?\n/)
  const out: string[] = []
  let skipRest = false
  for (const raw of lines) {
    if (skipRest) break
    const line = raw
    // Drop the nav link list at the top of every file.
    if (/^- \[(About Abigail|Home Search|Home Valuation)\]/.test(line)) continue
    if (/^- Let's Connect\s*$/.test(line)) continue
    // Drop the "Buttons: `…`" pseudo-markers.
    if (/^Buttons:/.test(line)) continue
    // Everything from the first "## Read More Articles" onward is duplicate
    // chrome (contact card, footer disclaimer, etc) that our layout renders
    // on every page. Stop there.
    if (/^##\s+(Read More Articles|Ready to Begin\?)\b/.test(line)) {
      skipRest = true
      break
    }
    out.push(line)
  }
  return out.join('\n')
}

/**
 * Parse a cleaned post body into a list of blocks we can render as JSX.
 * Handles: h1 (dropped — title is rendered from frontmatter), h2, h3,
 * paragraphs (blank-line-separated), and "- " bullet lists.
 */
function parseBlocks(body: string): Block[] {
  const blocks: Block[] = []
  const lines = body.split(/\r?\n/)

  let paraBuf: string[] = []
  let listBuf: string[] = []

  const flushPara = () => {
    if (paraBuf.length > 0) {
      const text = paraBuf.join(' ').trim()
      if (text) blocks.push({ kind: 'p', text })
      paraBuf = []
    }
  }
  const flushList = () => {
    if (listBuf.length > 0) {
      blocks.push({ kind: 'ul', items: listBuf.slice() })
      listBuf = []
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (line.startsWith('# ')) {
      flushPara()
      flushList()
      // Title already rendered from frontmatter — skip h1.
      continue
    }
    if (line.startsWith('### ')) {
      flushPara()
      flushList()
      blocks.push({ kind: 'h3', text: line.slice(4).trim() })
      continue
    }
    if (line.startsWith('## ')) {
      flushPara()
      flushList()
      blocks.push({ kind: 'h2', text: line.slice(3).trim() })
      continue
    }
    if (line.startsWith('- ')) {
      flushPara()
      listBuf.push(line.slice(2).trim())
      continue
    }
    if (line.trim() === '') {
      flushPara()
      flushList()
      continue
    }
    paraBuf.push(line.trim())
  }
  flushPara()
  flushList()
  return blocks
}

// --- public helpers -------------------------------------------------------

export function getAllPostMeta(): BlogPostMeta[] {
  return BLOG_POSTS.map((p) => ({
    slug: p.slug,
    title: slugToTitle(p.slug),
    description: '',
    teaser: p.teaser,
    date: p.date,
    image: p.image,
  }))
}

/**
 * Fallback title — real titles come from each post's frontmatter. Only used
 * before the file is read (e.g. in the grid) and as a last-ditch default
 * inside `getPost`.
 */
function slugToTitle(slug: string): string {
  return BLOG_POSTS.find((p) => p.slug === slug)?.title ?? slug
}

export async function getPost(slug: string): Promise<BlogPost | null> {
  const def = BLOG_POSTS.find((p) => p.slug === slug)
  if (!def) return null
  const raw = await readPostFile(def.file)
  const { fm, body } = splitFrontmatter(raw)
  const cleaned = stripPostChrome(body)
  const blocks = parseBlocks(cleaned)
  return {
    slug: def.slug,
    title: fm.title ?? slugToTitle(def.slug),
    description: fm.description ?? '',
    teaser: def.teaser,
    date: def.date,
    image: def.image,
    blocks,
  }
}
