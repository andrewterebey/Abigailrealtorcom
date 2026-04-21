import { chromium, type Browser, type Page } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const LIVE_BASE_URL = 'https://abigailrealtor.com'
const OUT_DIR = path.join(process.cwd(), 'content')

type PageKind =
  | 'page'
  | 'testimonials'
  | 'neighborhood'
  | 'legal'
  | 'blog-index'
  | 'blog-post'

type PageSpec = {
  urlPath: string
  output: string // relative to /content
  kind: PageKind
}

// Pages to crawl, per task brief + live sitemap. Listing grids
// (/properties*, /home-search/listings) are intentionally skipped —
// those are data-driven in /data/listings.json.
const PAGES: PageSpec[] = [
  { urlPath: '/', output: 'home.md', kind: 'page' },
  { urlPath: '/about', output: 'about.md', kind: 'page' },
  { urlPath: '/buyers', output: 'buyers.md', kind: 'page' },
  { urlPath: '/sellers', output: 'sellers.md', kind: 'page' },
  { urlPath: '/options', output: 'options.md', kind: 'page' },
  { urlPath: '/testimonials', output: 'testimonials.json', kind: 'testimonials' },
  { urlPath: '/home-valuation', output: 'home-valuation.md', kind: 'page' },
  { urlPath: '/contact', output: 'contact.md', kind: 'page' },
  { urlPath: '/blog', output: 'blog/index.md', kind: 'blog-index' },
  { urlPath: '/dmca-notice', output: 'legal/dmca-notice.md', kind: 'legal' },
  {
    urlPath: '/terms-and-conditions',
    output: 'legal/terms-and-conditions.md',
    kind: 'legal',
  },
  { urlPath: '/neighborhoods', output: 'neighborhoods.md', kind: 'page' },
  {
    urlPath: '/neighborhoods/bellevue',
    output: 'neighborhoods/bellevue.md',
    kind: 'neighborhood',
  },
  {
    urlPath: '/neighborhoods/seattle',
    output: 'neighborhoods/seattle.md',
    kind: 'neighborhood',
  },
  {
    urlPath: '/neighborhoods/newcastle',
    output: 'neighborhoods/newcastle.md',
    kind: 'neighborhood',
  },
  {
    urlPath: '/neighborhoods/eastside',
    output: 'neighborhoods/eastside.md',
    kind: 'neighborhood',
  },
  {
    urlPath: '/neighborhoods/shoreline',
    output: 'neighborhoods/shoreline.md',
    kind: 'neighborhood',
  },
  {
    urlPath: '/neighborhoods/renton',
    output: 'neighborhoods/renton.md',
    kind: 'neighborhood',
  },
  {
    urlPath: '/blog/why-king-county-homes-are-a-smart-investment',
    output: 'blog/why-king-county-homes-are-a-smart-investment.md',
    kind: 'blog-post',
  },
  {
    urlPath: '/blog/investing-in-bellevue-real-estate-an-essential-guide',
    output: 'blog/investing-in-bellevue-real-estate-an-essential-guide.md',
    kind: 'blog-post',
  },
  {
    urlPath: '/blog/seattle-real-estate-guide-buying-tips-for-first-time-homeowners',
    output: 'blog/seattle-real-estate-guide-buying-tips-for-first-time-homeowners.md',
    kind: 'blog-post',
  },
  {
    urlPath: '/blog/kirkland-real-estate-life-in-a-lakeside-retreat',
    output: 'blog/kirkland-real-estate-life-in-a-lakeside-retreat.md',
    kind: 'blog-post',
  },
]

// ---------- shared node types returned from page.evaluate ----------

type StructBlock =
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: 'paragraph'; markdown: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'button'; label: string; href: string | null }
  | { type: 'image'; alt: string; src: string }
  | { type: 'label'; text: string; fieldType: string | null }
  | { type: 'quote'; text: string; attribution: string | null }

type StructMeta = {
  title: string
  description: string
  ogImage: string
  h1: string
  articleDate: string
}

type StructPage = {
  meta: StructMeta
  blocks: StructBlock[]
  testimonials: { author: string; location: string; role: string; quote: string }[]
  blogCards: {
    title: string
    excerpt: string
    href: string
    slug: string
    date: string
  }[]
  rawBodyText: string
}

// ---------- helpers: file names, slugs ----------

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function yamlEscape(s: string): string {
  // Conservative: always wrap in double quotes and escape " and \.
  const escaped = s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  return `"${escaped}"`
}

// ---------- playwright page driver ----------

async function scrollPageToBottom(page: Page) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let y = 0
      const step = () => {
        window.scrollTo(0, y)
        y += 400
        if (y < document.body.scrollHeight) setTimeout(step, 100)
        else resolve()
      }
      step()
    })
    await new Promise((r) => setTimeout(r, 600))
    window.scrollTo(0, 0)
    await new Promise((r) => setTimeout(r, 300))
  })
}

/**
 * Extract structured content from the current page. The strategy is a single
 * top-down walk that accumulates blocks in document order so the output
 * faithfully mirrors what a visitor reads.
 */
async function extractStructured(page: Page): Promise<StructPage> {
  return await page.evaluate((): StructPage => {
    // --- meta ---
    function metaContent(name: string, attr: 'name' | 'property' = 'name'): string {
      const el = document.head.querySelector(`meta[${attr}="${name}"]`)
      return (el?.getAttribute('content') || '').trim()
    }

    const title = (document.title || '').trim()
    const description =
      metaContent('description') || metaContent('og:description', 'property')
    const ogImage = metaContent('og:image', 'property')
    const firstH1 = document.querySelector('h1')?.textContent?.trim() || ''
    let articleDate = ''
    const timeEl = document.querySelector('article time, time[datetime], time')
    if (timeEl) {
      articleDate = (
        timeEl.getAttribute('datetime') ||
        timeEl.textContent ||
        ''
      ).trim()
    }

    // --- inline markdown renderer for a DOM node ---
    function inlineMd(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || ''
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return ''
      const el = node as HTMLElement
      const tag = el.tagName.toLowerCase()
      const inner = Array.from(el.childNodes).map(inlineMd).join('')
      const trimmed = inner.trim()
      if (!trimmed && tag !== 'br') return inner
      switch (tag) {
        case 'br':
          return '  \n'
        case 'strong':
        case 'b':
          return `**${inner}**`
        case 'em':
        case 'i':
          return `*${inner}*`
        case 'code':
          return `\`${inner}\``
        case 'a': {
          const href = el.getAttribute('href') || ''
          if (!href || href.startsWith('#')) return inner
          return `[${inner}](${href})`
        }
        case 'u':
          return inner
        case 'span':
        case 'small':
        case 'sup':
        case 'sub':
          return inner
        default:
          return inner
      }
    }

    function normalizeWhitespace(s: string): string {
      return s.replace(/[ \t\f\v]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim()
    }

    // --- collect the main content root ---
    // Prefer <main>, otherwise fall back to <body>.
    const root =
      document.querySelector('main') ||
      document.querySelector('#__next main') ||
      document.body

    // Skip obvious chrome (header/nav/footer) when possible.
    const excludeSelectors = ['header nav', 'nav[role="navigation"]']
    const excluded = new Set<Element>()
    for (const sel of excludeSelectors) {
      for (const el of Array.from(root.querySelectorAll(sel))) {
        excluded.add(el)
      }
    }

    const blocks: StructBlock[] = []
    const seenText = new Set<string>()

    function pushParagraph(md: string) {
      const t = normalizeWhitespace(md)
      if (!t) return
      // De-duplicate exact paragraph repeats (common on live site because of
      // hidden/duplicated responsive variants).
      const key = `p::${t}`
      if (seenText.has(key)) return
      seenText.add(key)
      blocks.push({ type: 'paragraph', markdown: t })
    }

    function pushHeading(level: 1 | 2 | 3 | 4 | 5 | 6, text: string) {
      const t = normalizeWhitespace(text)
      if (!t) return
      const key = `h${level}::${t}`
      if (seenText.has(key)) return
      seenText.add(key)
      blocks.push({ type: 'heading', level, text: t })
    }

    function pushListItem(ordered: boolean, items: string[]) {
      const cleaned = items
        .map((i) => normalizeWhitespace(i))
        .filter((i) => i.length > 0)
      if (cleaned.length === 0) return
      const key = `l::${ordered ? 'ol' : 'ul'}::${cleaned.join('||')}`
      if (seenText.has(key)) return
      seenText.add(key)
      blocks.push({ type: 'list', ordered, items: cleaned })
    }

    function pushButton(label: string, href: string | null) {
      const t = normalizeWhitespace(label).replace(/\s+/g, ' ').trim()
      if (!t) return
      const key = `btn::${t}::${href || ''}`
      if (seenText.has(key)) return
      seenText.add(key)
      blocks.push({ type: 'button', label: t, href })
    }

    function pushLabel(text: string, fieldType: string | null) {
      const t = normalizeWhitespace(text).replace(/\s+/g, ' ').trim()
      if (!t) return
      const key = `lbl::${t}`
      if (seenText.has(key)) return
      seenText.add(key)
      blocks.push({ type: 'label', text: t, fieldType })
    }

    function isVisible(el: Element): boolean {
      const htmlEl = el as HTMLElement
      if (!htmlEl.getClientRects || htmlEl.getClientRects().length === 0) {
        // Scripts/meta don't render.
        if (htmlEl.tagName === 'SCRIPT' || htmlEl.tagName === 'STYLE') return false
      }
      const cs = window.getComputedStyle(htmlEl)
      if (cs.display === 'none' || cs.visibility === 'hidden') return false
      return true
    }

    // Tags that act as chrome/noise and should be skipped entirely when we
    // encounter them at the root of the walk (but NOT when they contain real
    // content — we still recurse into <header>/<footer> under body).
    const skipIds = new Set([
      'google_translate_element',
      'userwayAccessibilityIcon',
      'userwayLstIcon',
    ])
    const skipClasses = [
      'uw-sl',
      'uwy',
      'userway_',
      'uw-s10',
      'uw-s12',
      'uwaw-',
      'uwif',
    ]

    function shouldSkipElement(el: Element): boolean {
      if (skipIds.has(el.id)) return true
      const cls =
        typeof el.className === 'string'
          ? el.className.toLowerCase()
          : (el as SVGElement).getAttribute?.('class')?.toLowerCase() || ''
      for (const c of skipClasses) {
        if (cls.includes(c)) return true
      }
      return false
    }

    function walk(node: Element) {
      if (excluded.has(node)) return
      if (shouldSkipElement(node)) return
      if (!isVisible(node)) return
      const tag = node.tagName.toLowerCase()

      // Headings.
      if (/^h[1-6]$/.test(tag)) {
        const level = Number(tag.slice(1)) as 1 | 2 | 3 | 4 | 5 | 6
        pushHeading(level, node.textContent || '')
        return
      }

      // Paragraphs + small inline text containers.
      if (tag === 'p') {
        const md = Array.from(node.childNodes).map(inlineMd).join('')
        pushParagraph(md)
        return
      }

      // Blockquotes / testimonial quotes.
      if (tag === 'blockquote') {
        const md = Array.from(node.childNodes).map(inlineMd).join('')
        pushParagraph(`> ${normalizeWhitespace(md)}`)
        return
      }

      // Lists.
      if (tag === 'ul' || tag === 'ol') {
        const items: string[] = []
        for (const li of Array.from(node.children)) {
          if (li.tagName.toLowerCase() !== 'li') continue
          if (!isVisible(li)) continue
          const md = Array.from(li.childNodes).map(inlineMd).join('')
          items.push(md)
        }
        pushListItem(tag === 'ol', items)
        return
      }

      // Links/buttons styled as CTAs. Only capture those with short text.
      if (tag === 'a' || tag === 'button') {
        const label = (node.textContent || '').trim()
        if (label.length > 0 && label.length <= 80) {
          const href =
            tag === 'a' ? node.getAttribute('href') || null : null
          // Skip bare hash anchors and empty hrefs.
          if (!href || !href.startsWith('#')) {
            pushButton(label, href)
          }
        }
        return
      }

      // Form field labels + placeholder/help text.
      if (tag === 'label') {
        const forAttr = node.getAttribute('for')
        let fieldType: string | null = null
        if (forAttr) {
          const target = document.getElementById(forAttr)
          if (target)
            fieldType =
              (target as HTMLInputElement).type || target.tagName.toLowerCase()
        }
        pushLabel(node.textContent || '', fieldType)
        return
      }
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        const ph = node.getAttribute('placeholder') || ''
        const aria = node.getAttribute('aria-label') || ''
        const label = ph || aria
        if (label) {
          const fieldType = (node as HTMLInputElement).type || tag
          pushLabel(label, fieldType)
        }
        return
      }

      // Scripts/styles — ignore.
      if (tag === 'script' || tag === 'style' || tag === 'noscript') return

      // Everything else: walk childNodes (not just children) so loose text
      // nodes between headings are captured as paragraphs. This is important
      // for blog posts on this site, which render article body text as raw
      // text-node siblings of <h2>/<h3> rather than inside <p> tags.
      const childNodes = Array.from(node.childNodes)
      const hasElementChildren = childNodes.some((n) => n.nodeType === 1)

      if (hasElementChildren) {
        for (const child of childNodes) {
          if (child.nodeType === 1) {
            walk(child as Element)
          } else if (child.nodeType === 3) {
            const txt = (child.textContent || '').trim()
            if (txt.length >= 20) {
              pushParagraph(txt)
            }
          }
        }
      } else {
        // Leaf element: capture its text content as a paragraph.
        const txt = (node.textContent || '').trim()
        if (txt.length >= 2 && txt.length <= 1200) {
          const parentTag = node.parentElement?.tagName.toLowerCase() || ''
          const parentAlreadyHandled = [
            'p',
            'li',
            'a',
            'button',
            'label',
            'h1',
            'h2',
            'h3',
            'h4',
            'h5',
            'h6',
            'blockquote',
          ].includes(parentTag)
          if (!parentAlreadyHandled) {
            pushParagraph(txt)
          }
        }
      }
    }

    walk(root)

    // --- testimonials ---
    // Primary strategy: the site uses `.testimonials__item-right` cards with
    // `.author__name` + `.testimonials-list__item-content > p`. Fallback: a
    // heuristic over generic quote/review elements for other pages.
    const testimonials: StructPage['testimonials'] = []
    const seenQuotes = new Set<string>()

    function addTestimonial(author: string, quote: string, location = '', role = '') {
      const cleanQuote = quote.replace(/\s+/g, ' ').trim()
      if (cleanQuote.length < 20) return
      const key = cleanQuote.slice(0, 80).toLowerCase()
      if (seenQuotes.has(key)) return
      seenQuotes.add(key)
      testimonials.push({
        author: author.replace(/\s+/g, ' ').trim(),
        location: location.replace(/\s+/g, ' ').trim(),
        role: role.replace(/\s+/g, ' ').trim(),
        quote: cleanQuote,
      })
    }

    const primaryCards = Array.from(
      root.querySelectorAll(
        '.testimonials__item-right, [class*="testimonial"][class*="item"], .review__card',
      ),
    )
    for (const card of primaryCards) {
      const authorEl = card.querySelector(
        '.author__name, .review__author-name, [class*="author"][class*="name"]',
      )
      const quoteEl =
        card.querySelector(
          '.testimonials-list__item-content, .review__text, [class*="testimonial"][class*="content"]',
        ) || card.querySelector('p')
      const author = authorEl?.textContent?.trim() || ''
      const quote = quoteEl?.textContent?.trim() || ''
      // Location/role sometimes appear in a sibling element.
      const locationEl = card.querySelector(
        '.author__position, .review__author-location, [class*="location"]',
      )
      const location = locationEl?.textContent?.trim() || ''
      if (author && quote) {
        addTestimonial(author, quote, location)
      }
    }

    // Fallback: for other pages (home has a carousel snippet), scan for
    // blockquotes + articles containing quote marks.
    if (testimonials.length === 0) {
      const fallbackRoots = Array.from(
        root.querySelectorAll(
          [
            'blockquote',
            'article',
            '[class*="testimonial" i]',
            '[class*="review" i]',
            '[class*="quote" i]',
          ].join(','),
        ),
      )
      for (const el of fallbackRoots) {
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim()
        if (text.length < 60 || text.length > 2400) continue
        const authorEl = el.querySelector(
          '.author__name, cite, footer, [class*="author"]',
        )
        const author = authorEl?.textContent?.trim() || ''
        const pEl = el.querySelector('p')
        const quote = (pEl?.textContent || text).trim()
        addTestimonial(author, quote)
      }
    }

    // --- blog post cards (for /blog index) ---
    // The site wraps each blog card in an <a class="blog-list__item"> — the
    // link IS the card root. Use that directly rather than walking up the tree
    // (which yielded one shared ancestor for every card).
    const blogCards: StructPage['blogCards'] = []
    const seenSlugs = new Set<string>()
    for (const a of Array.from(
      root.querySelectorAll<HTMLAnchorElement>('a[href^="/blog/"]'),
    )) {
      const href = a.getAttribute('href') || ''
      const slug = href.replace(/^\/blog\//, '').replace(/\/$/, '')
      if (!slug || slug.includes('/')) continue
      if (seenSlugs.has(slug)) continue
      seenSlugs.add(slug)

      const h = a.querySelector('h1, h2, h3, h4, h5')
      // Title fallbacks: inner heading → img alt → aria-label.
      const img = a.querySelector('img')
      const title = (
        h?.textContent ||
        img?.getAttribute('alt') ||
        a.getAttribute('aria-label') ||
        ''
      )
        .replace(/\s+/g, ' ')
        .trim()
      const pEl = a.querySelector('p')
      const excerpt = (pEl?.textContent || '').replace(/\s+/g, ' ').trim()
      let cardDate = ''
      const tEl = a.querySelector('time, .blog-list__item-date, [class*="date"]')
      if (tEl) {
        cardDate = (
          tEl.getAttribute('datetime') ||
          tEl.textContent ||
          ''
        ).trim()
      }
      if (title && slug) {
        blogCards.push({ title, excerpt, href, slug, date: cardDate })
      }
    }

    const rawBodyText = (root.textContent || '').replace(/\s+/g, ' ').trim()

    return {
      meta: { title, description, ogImage, h1: firstH1, articleDate },
      blocks,
      testimonials,
      blogCards,
      rawBodyText,
    }
  })
}

// ---------- renderers ----------

function frontmatter(meta: Record<string, string | undefined>): string {
  const lines: string[] = ['---']
  for (const [k, v] of Object.entries(meta)) {
    if (v == null || v === '') continue
    lines.push(`${k}: ${yamlEscape(v)}`)
  }
  lines.push('---')
  return lines.join('\n')
}

function renderBlocks(blocks: StructBlock[]): string {
  const out: string[] = []
  const ctaBuffer: string[] = []
  const labelBuffer: string[] = []

  function flushCtas() {
    if (ctaBuffer.length > 0) {
      out.push(
        `Buttons: ${ctaBuffer.map((b) => `\`${b}\``).join(', ')}`,
      )
      ctaBuffer.length = 0
    }
  }
  function flushLabels() {
    if (labelBuffer.length > 0) {
      out.push(
        `Form fields: ${labelBuffer.map((l) => `\`${l}\``).join(', ')}`,
      )
      labelBuffer.length = 0
    }
  }

  for (const b of blocks) {
    if (b.type === 'heading') {
      flushCtas()
      flushLabels()
      out.push(`${'#'.repeat(b.level)} ${b.text}`)
    } else if (b.type === 'paragraph') {
      flushCtas()
      flushLabels()
      out.push(b.markdown)
    } else if (b.type === 'list') {
      flushCtas()
      flushLabels()
      const marker = b.ordered ? (i: number) => `${i + 1}.` : () => '-'
      out.push(b.items.map((it, i) => `${marker(i)} ${it}`).join('\n'))
    } else if (b.type === 'button') {
      ctaBuffer.push(b.label)
    } else if (b.type === 'label') {
      labelBuffer.push(b.text)
    }
  }
  flushCtas()
  flushLabels()
  return out.join('\n\n').trim() + '\n'
}

function renderLegalVerbatim(
  data: StructPage,
  sourceUrl: string,
): string {
  const today = new Date().toISOString().slice(0, 10)
  const header = [
    '<!--',
    `Source: ${sourceUrl}`,
    `Captured: ${today}`,
    'This text is LEGALLY REQUIRED and rendered VERBATIM per CLAUDE.md §9.12.',
    'Do not paraphrase, reformat, or "clean up" the body copy below.',
    '-->',
    '',
  ].join('\n')
  const fm = frontmatter({
    title: data.meta.title || data.meta.h1,
    description: data.meta.description,
    source_url: sourceUrl,
    captured: today,
  })
  return `${header}${fm}\n\n${renderBlocks(data.blocks)}`
}

function renderBlogPost(spec: PageSpec, data: StructPage, sourceUrl: string): string {
  const slug = spec.output.replace(/^blog\//, '').replace(/\.md$/, '')
  const fm = frontmatter({
    title: data.meta.h1 || data.meta.title,
    slug,
    date: data.meta.articleDate,
    description: data.meta.description,
    hero_image: data.meta.ogImage,
    source_url: sourceUrl,
  })

  // For blog posts we want the article body without footer/related-posts
  // noise. Drop trailing blocks that look like nav chrome ("All Posts",
  // "Read More", etc.) by trimming button-only runs at the tail.
  const blocks = [...data.blocks]
  while (blocks.length > 0) {
    const last = blocks[blocks.length - 1]
    if (last.type === 'button' || last.type === 'label') {
      blocks.pop()
    } else {
      break
    }
  }
  return `${fm}\n\n${renderBlocks(blocks)}`
}

function renderBlogIndex(data: StructPage, sourceUrl: string): string {
  const today = new Date().toISOString().slice(0, 10)
  const fm = frontmatter({
    title: data.meta.title,
    description: data.meta.description,
    source_url: sourceUrl,
    captured: today,
  })
  const lines: string[] = [fm, '', `# ${data.meta.h1 || 'Blog'}`, '']
  if (data.blogCards.length === 0) {
    lines.push('<!-- no blog post cards detected on live page -->')
  } else {
    for (const card of data.blogCards) {
      lines.push(`## [${card.title}](${card.href})`)
      if (card.date) lines.push(`*${card.date}*`)
      if (card.excerpt) lines.push(card.excerpt)
      lines.push(`Slug: \`${card.slug}\``)
      lines.push('')
    }
  }
  return lines.join('\n').trimEnd() + '\n'
}

function renderTestimonialsJson(data: StructPage): string {
  const out = {
    testimonials: data.testimonials.map((t) => ({
      id: slugify(t.author || t.quote.slice(0, 40)) || undefined,
      author: t.author || undefined,
      location: t.location || undefined,
      role: t.role || undefined,
      quote: t.quote,
    })),
  }
  return JSON.stringify(out, null, 2) + '\n'
}

function renderGenericPage(
  spec: PageSpec,
  data: StructPage,
  sourceUrl: string,
): string {
  const today = new Date().toISOString().slice(0, 10)
  const fm = frontmatter({
    title: data.meta.title,
    description: data.meta.description,
    source_url: sourceUrl,
    captured: today,
  })
  const body = renderBlocks(data.blocks)
  return `${fm}\n\n${body}`
}

// ---------- main ----------

async function processPage(
  browser: Browser,
  spec: PageSpec,
): Promise<{ ok: boolean; message?: string; data?: StructPage }> {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  })
  // Shim esbuild's __name helper — tsx+esbuild leaks a reference into
  // page.evaluate bodies; the browser has no such function.
  await context.addInitScript({
    content: 'window.__name = function(fn){return fn;};',
  })
  const page = await context.newPage()
  const url = `${LIVE_BASE_URL}${spec.urlPath}`
  try {
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })
    const status = response?.status() ?? 0
    if (status >= 400) {
      return { ok: false, message: `HTTP ${status}` }
    }
    await page.waitForLoadState('load', { timeout: 20000 }).catch(() => {})
    await scrollPageToBottom(page)
    const data = await extractStructured(page)
    return { ok: true, data }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) }
  } finally {
    await context.close()
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const errors: { page: string; message: string }[] = []
  let pagesOk = 0
  let testimonialsCaptured = 0
  let blogPostsCaptured = 0

  const browser: Browser = await chromium.launch()
  try {
    for (const spec of PAGES) {
      const url = `${LIVE_BASE_URL}${spec.urlPath}`
      console.log(`# ${spec.urlPath} -> content/${spec.output}`)
      const result = await processPage(browser, spec)
      if (!result.ok || !result.data) {
        console.warn(`  [fail] ${result.message}`)
        errors.push({ page: spec.urlPath, message: result.message || 'unknown' })
        continue
      }
      const data = result.data
      const outPath = path.join(OUT_DIR, spec.output)
      await mkdir(path.dirname(outPath), { recursive: true })

      let rendered: string
      switch (spec.kind) {
        case 'testimonials':
          rendered = renderTestimonialsJson(data)
          testimonialsCaptured = data.testimonials.length
          break
        case 'legal':
          // Legals: same structured rendering as regular pages, but with a
          // "rendered verbatim" comment header per CLAUDE.md §9.12.
          rendered = renderLegalVerbatim(data, url)
          break
        case 'blog-post':
          rendered = renderBlogPost(spec, data, url)
          blogPostsCaptured += 1
          break
        case 'blog-index':
          rendered = renderBlogIndex(data, url)
          break
        case 'page':
        case 'neighborhood':
        default:
          rendered = renderGenericPage(spec, data, url)
          break
      }
      await writeFile(outPath, rendered, 'utf8')
      console.log(`  [ok]   ${spec.output} (${rendered.length} B)`)
      pagesOk += 1
    }
  } finally {
    await browser.close()
  }

  console.log('\n=== SUMMARY ===')
  console.log(`Pages processed OK: ${pagesOk}/${PAGES.length}`)
  console.log(`Testimonials captured: ${testimonialsCaptured}`)
  console.log(`Blog posts captured: ${blogPostsCaptured}`)
  if (errors.length > 0) {
    console.log('\nErrors:')
    for (const e of errors) console.log(`  - ${e.page}: ${e.message}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
