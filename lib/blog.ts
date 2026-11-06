import { readFile } from 'node:fs/promises'
import path from 'node:path'
import {
  parseBlocks,
  splitFrontmatter,
  stripPostChrome,
  type Block,
} from './blog-markdown'

export type { Block } from './blog-markdown'

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

/**
 * What the admin editor should show for a post: its index metadata plus the
 * article markdown with the captured page chrome, the frontmatter and the
 * leading `# Title` line removed (the title field is the single source of
 * the title). Not the raw file — that still carries the live site's nav.
 */
export async function getPostSource(
  slug: string,
): Promise<{ meta: BlogPostMeta; body: string } | null> {
  const def = BLOG_POSTS.find((p) => p.slug === slug)
  if (!def) return null
  const raw = await readPostFile(def.file)
  const { fm, body } = splitFrontmatter(raw)
  const cleaned = stripPostChrome(body)
    .split(/\r?\n/)
    .filter((line) => !line.startsWith('# '))
    .join('\n')
    .trim()
  return {
    meta: {
      slug: def.slug,
      title: fm.title ?? def.title,
      description: fm.description ?? '',
      teaser: def.teaser,
      date: def.date,
      image: def.image,
    },
    body: cleaned,
  }
}
