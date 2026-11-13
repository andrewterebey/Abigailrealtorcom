/**
 * Pure markdown helpers for the blog — no Node imports, so both the server
 * reader (`lib/blog.ts`) and the admin editor's live preview (a client
 * component) can share one parser and render the same blocks. Hand-rolled on
 * purpose (CLAUDE.md: ask before adding a dependency); the dialect is
 * frontmatter, h1 (dropped), h2, h3, paragraphs and "- " lists.
 */

export type Block =
  | { kind: 'p'; text: string }
  | { kind: 'h2'; text: string }
  | { kind: 'h3'; text: string }
  | { kind: 'ul'; items: string[] }

/**
 * Strip a leading YAML frontmatter block and return the body plus any
 * recognized fields. Enough of a parser for our captured files.
 */
export function splitFrontmatter(src: string): {
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
export function stripPostChrome(body: string): string {
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
export function parseBlocks(body: string): Block[] {
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
