import { readFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * Loader for the verbatim legal copy under /content/legal/. Used by the
 * Terms & Conditions page (which — matching the live site — renders the
 * Privacy Policy content; the live URL for the privacy policy is literally
 * `/terms-and-conditions`). CLAUDE.md §12 requires these pages to render
 * the source text without paraphrase or reformatting.
 *
 * The markdown in the source files was captured from the Luxury Presence
 * export, so it includes a bunch of site-chrome (nav links, "Buttons:" pseudo
 * markers, and a duplicated footer disclaimer at the bottom). `loadLegalBody`
 * strips just that chrome, leaving the legal text itself untouched.
 */

export type LegalBlock =
  | { kind: 'h1'; text: string }
  | { kind: 'h2'; text: string }
  | { kind: 'h3'; text: string }
  | { kind: 'p'; markup: string }
  | { kind: 'ol'; items: string[] }
  | { kind: 'ul'; items: string[] }

function splitFrontmatter(src: string): { body: string } {
  const lines = src.split(/\r?\n/)
  // Some files have an HTML comment before the frontmatter.
  let i = 0
  while (i < lines.length && lines[i].trim() !== '---') i++
  if (i >= lines.length) return { body: src }
  // i points at the opening "---". Find the closing one.
  let j = i + 1
  while (j < lines.length && lines[j].trim() !== '---') j++
  if (j >= lines.length) return { body: src }
  return { body: lines.slice(j + 1).join('\n') }
}

function stripChrome(body: string): string {
  // Everything from the first "### Abigail Anderson" footer card onward is
  // site chrome (phone, address, NWMLS disclaimer) rendered elsewhere.
  const footerIdx = body.indexOf('### Abigail Anderson')
  const trimmed = footerIdx >= 0 ? body.slice(0, footerIdx) : body

  const lines = trimmed.split(/\r?\n/)
  const out: string[] = []
  for (const raw of lines) {
    if (/^- \[(About Abigail|Home Search|Home Valuation)\]/.test(raw)) continue
    if (/^- Let's Connect\s*$/.test(raw)) continue
    if (/^Buttons:/.test(raw)) continue
    if (/^<!--/.test(raw) || /-->$/.test(raw)) continue
    out.push(raw)
  }
  return out.join('\n')
}

/**
 * Convert inline markdown markers (`**bold**`, `***bold***`, `[text](url)`)
 * into safe HTML. We escape everything first, then re-introduce the markers
 * so there's no XSS surface from the source files.
 */
function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function renderInline(md: string): string {
  let s = escapeHtml(md)
  // Links — [text](url). Only http(s) and mailto allowed through.
  s = s.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g,
    (_m, text: string, url: string) =>
      `<a href="${url}" class="text-site-gold underline underline-offset-2 hover:text-site-gold-dim" rel="noopener noreferrer">${text}</a>`,
  )
  // Bold/italic combos. Order matters: triple first.
  s = s.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  return s
}

function parseBlocks(body: string): LegalBlock[] {
  const lines = body.split(/\r?\n/)
  const blocks: LegalBlock[] = []

  // The captured files have one logical paragraph per source line (each line
  // is a single very long string). We don't need to accumulate multi-line
  // paragraphs — every non-blank, non-special line becomes its own block.

  let olBuf: string[] = []
  let ulBuf: string[] = []

  const flushOl = () => {
    if (olBuf.length > 0) {
      blocks.push({ kind: 'ol', items: olBuf.map(renderInline) })
      olBuf = []
    }
  }
  const flushUl = () => {
    if (ulBuf.length > 0) {
      blocks.push({ kind: 'ul', items: ulBuf.map(renderInline) })
      ulBuf = []
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd()

    if (line.trim() === '') {
      flushOl()
      flushUl()
      continue
    }
    if (line.startsWith('# ')) {
      flushOl()
      flushUl()
      blocks.push({ kind: 'h1', text: line.slice(2).trim() })
      continue
    }
    if (line.startsWith('### ')) {
      flushOl()
      flushUl()
      blocks.push({ kind: 'h3', text: line.slice(4).trim() })
      continue
    }
    if (line.startsWith('## ')) {
      flushOl()
      flushUl()
      blocks.push({ kind: 'h2', text: line.slice(3).trim() })
      continue
    }
    // Ordered list: "1. …", "2. …". Two shapes in this source:
    //   (a) a short DMCA-style numbered item whose body is on the same line,
    //   (b) a top-level numbered section whose label is "**Title**" and
    //       whose body runs across many paragraphs below it. Render (b) as
    //       a heading so the body prose still flows as normal paragraphs.
    const olMatch = line.match(/^(\d+)\.\s+(.*)$/)
    if (olMatch) {
      const [, num, rest] = olMatch
      const boldOnly = rest.match(/^\*\*(.+)\*\*\s*$/)
      if (boldOnly) {
        flushOl()
        flushUl()
        blocks.push({ kind: 'h3', text: `${num}. ${boldOnly[1]}` })
        continue
      }
      flushUl()
      olBuf.push(rest)
      continue
    }
    if (line.startsWith('- ')) {
      flushOl()
      ulBuf.push(line.slice(2).trim())
      continue
    }
    // Lines that are just "***Subheader***" become italic-subheading
    // paragraphs — they're Luxury Presence's way of marking sub-sections
    // inside a numbered section.
    flushOl()
    flushUl()
    blocks.push({ kind: 'p', markup: renderInline(line.trim()) })
  }
  flushOl()
  flushUl()
  return blocks
}

export async function loadLegalBody(fileName: string): Promise<LegalBlock[]> {
  const src = await readFile(
    path.join(process.cwd(), 'content', 'legal', fileName),
    'utf8',
  )
  const { body } = splitFrontmatter(src)
  const cleaned = stripChrome(body)
  return parseBlocks(cleaned)
}
