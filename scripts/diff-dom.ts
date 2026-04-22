/**
 * Walks top-level <section>/<nav>/<footer>/etc. on both the live site and
 * our local home page, captures layout + typography + color metrics for
 * each, pairs them by order, and emits a report of the deltas that matter.
 *
 * Run with:
 *   npx tsx scripts/diff-dom.ts
 */
import { chromium, type Page } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

type Section = {
  index: number
  tag: string
  label: string
  rect: { x: number; y: number; width: number; height: number }
  bg: string
  color: string
  padding: string
  margin: string
  fontFamily: string
  firstHeading: null | {
    tag: string
    text: string
    fontSize: string
    fontWeight: string
    letterSpacing: string
    lineHeight: string
    textTransform: string
    color: string
  }
  firstButtonOrLink: null | {
    text: string
    fontSize: string
    fontWeight: string
    letterSpacing: string
    bg: string
    color: string
    paddingBlock: string
    paddingInline: string
    borderRadius: string
  }
  imgCount: number
}

const LIVE = process.env.LIVE_BASE ?? 'https://abigailrealtor.com'
const LOCAL = process.env.LOCAL_BASE ?? 'http://localhost:3000'
const OUT_DIR = path.join(process.cwd(), 'screenshots', 'diff-dom')

async function loadPage(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForLoadState('load', { timeout: 20000 }).catch(() => {})
  // Trigger lazy loads by scrolling through the page.
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let y = 0
      const step = () => {
        window.scrollTo(0, y)
        y += 400
        if (y < document.body.scrollHeight) setTimeout(step, 80)
        else resolve()
      }
      step()
    })
    window.scrollTo(0, 0)
    await new Promise((r) => setTimeout(r, 400))
  })
}

async function extractSections(page: Page): Promise<Section[]> {
  return page.evaluate(() => {
    const cs = (el: Element) => getComputedStyle(el)
    const rectOf = (el: Element) => {
      const r = el.getBoundingClientRect()
      return {
        x: Math.round(r.x),
        y: Math.round(r.y + window.scrollY),
        width: Math.round(r.width),
        height: Math.round(r.height),
      }
    }
    // Walk down from <body> until we find a node whose direct children look
    // like "top-level page sections" — i.e. multiple siblings each at least
    // ~200px tall that together cover most of the scroll height. That set
    // becomes our comparison unit.
    const vh = window.innerHeight
    const totalH = document.body.scrollHeight
    const bandRoot = (() => {
      let best: Element = document.body
      let bestCoverage = 0
      const visit = (el: Element, depth: number) => {
        if (depth > 6) return
        const kids = Array.from(el.children).filter((c) => {
          const r = c.getBoundingClientRect()
          return r.height >= 120 && r.width >= 300
        }) as HTMLElement[]
        if (kids.length >= 4) {
          const sum = kids.reduce(
            (a, c) => a + c.getBoundingClientRect().height,
            0
          )
          const coverage = sum / Math.max(totalH, 1)
          if (coverage > bestCoverage) {
            bestCoverage = coverage
            best = el
          }
        }
        for (const c of Array.from(el.children)) visit(c, depth + 1)
      }
      visit(document.body, 0)
      return best
    })()
    const kept = Array.from(bandRoot.children).filter((c) => {
      const r = c.getBoundingClientRect()
      return r.height >= 80 && r.width >= 300
    }) as HTMLElement[]
    void vh
    return kept.map((el, i) => {
      const c = cs(el)
      const heading = el.querySelector('h1, h2, h3')
      const button = el.querySelector('a[href], button')
      const h = heading
        ? (() => {
            const hc = cs(heading)
            return {
              tag: heading.tagName.toLowerCase(),
              text: (heading.textContent ?? '').trim().slice(0, 80),
              fontSize: hc.fontSize,
              fontWeight: hc.fontWeight,
              letterSpacing: hc.letterSpacing,
              lineHeight: hc.lineHeight,
              textTransform: hc.textTransform,
              color: hc.color,
            }
          })()
        : null
      const b = button
        ? (() => {
            const bc = cs(button)
            return {
              text: (button.textContent ?? '').trim().slice(0, 40),
              fontSize: bc.fontSize,
              fontWeight: bc.fontWeight,
              letterSpacing: bc.letterSpacing,
              bg: bc.backgroundColor,
              color: bc.color,
              paddingBlock: `${bc.paddingTop}/${bc.paddingBottom}`,
              paddingInline: `${bc.paddingLeft}/${bc.paddingRight}`,
              borderRadius: bc.borderRadius,
            }
          })()
        : null
      return {
        index: i,
        tag: el.tagName.toLowerCase(),
        label:
          el.getAttribute('aria-label') ??
          (heading ? (heading.textContent ?? '').trim().slice(0, 60) : ''),
        rect: rectOf(el),
        bg: c.backgroundColor,
        color: c.color,
        padding: `${c.paddingTop}/${c.paddingRight}/${c.paddingBottom}/${c.paddingLeft}`,
        margin: `${c.marginTop}/${c.marginRight}/${c.marginBottom}/${c.marginLeft}`,
        fontFamily: c.fontFamily,
        firstHeading: h,
        firstButtonOrLink: b,
        imgCount: el.querySelectorAll('img, video, picture').length,
      }
    })
  })
}

function diffField<T extends object>(
  label: string,
  a: T | null,
  b: T | null,
  skip: (keyof T)[] = []
): string[] {
  if (!a && !b) return []
  if (!a) return [`  ${label}: only on LOCAL`]
  if (!b) return [`  ${label}: only on LIVE`]
  const out: string[] = []
  for (const key of Object.keys(a) as (keyof T)[]) {
    if (skip.includes(key)) continue
    const av = String(a[key] ?? '')
    const bv = String(b[key] ?? '')
    if (av !== bv) out.push(`    ${String(key)}: live="${av}" | local="${bv}"`)
  }
  return out
}

function heightDelta(liveH: number, localH: number): string {
  const diff = localH - liveH
  const pct = liveH > 0 ? ((diff / liveH) * 100).toFixed(1) : 'n/a'
  return `Δ ${diff >= 0 ? '+' : ''}${diff}px (${pct}%)`
}

function pairAndReport(live: Section[], local: Section[]): string {
  const lines: string[] = []
  lines.push(
    `LIVE  sections: ${live.length}\nLOCAL sections: ${local.length}\n`
  )
  const n = Math.max(live.length, local.length)
  for (let i = 0; i < n; i++) {
    const l = live[i]
    const m = local[i]
    lines.push(
      `\n==== Section ${i} ====\n  live : ${l ? `<${l.tag}> "${l.label}" h=${l.rect.height}px` : '—'}\n  local: ${m ? `<${m.tag}> "${m.label}" h=${m.rect.height}px` : '—'}`
    )
    if (l && m) {
      lines.push(`  height ${heightDelta(l.rect.height, m.rect.height)}`)
      if (Math.abs((l.rect.height ?? 0) - (m.rect.height ?? 0)) > 24) {
        lines.push(`  ! HEIGHT MISMATCH > 24px`)
      }
      if (l.bg !== m.bg) lines.push(`  bg: live=${l.bg} local=${m.bg}`)
      if (l.padding !== m.padding)
        lines.push(`  padding: live=${l.padding} local=${m.padding}`)
      if (l.imgCount !== m.imgCount)
        lines.push(`  imgCount: live=${l.imgCount} local=${m.imgCount}`)
      const hd = diffField('heading', l.firstHeading, m.firstHeading)
      if (hd.length) lines.push('  heading deltas:', ...hd)
      const bd = diffField('button/link', l.firstButtonOrLink, m.firstButtonOrLink)
      if (bd.length) lines.push('  button deltas:', ...bd)
    }
  }
  return lines.join('\n')
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const browser = await chromium.launch()
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    })
    await context.addInitScript({
      content: 'window.__name = function(fn){return fn;};',
    })

    console.log('[live] loading…')
    const livePage = await context.newPage()
    await loadPage(livePage, LIVE)
    const liveSections = await extractSections(livePage)
    await livePage.screenshot({
      path: path.join(OUT_DIR, 'live-home.png'),
      fullPage: true,
    })
    await livePage.close()

    console.log('[local] loading…')
    const localPage = await context.newPage()
    await loadPage(localPage, LOCAL)
    const localSections = await extractSections(localPage)
    await localPage.screenshot({
      path: path.join(OUT_DIR, 'local-home.png'),
      fullPage: true,
    })
    await localPage.close()

    const report = pairAndReport(liveSections, localSections)
    const jsonPath = path.join(OUT_DIR, 'sections.json')
    const txtPath = path.join(OUT_DIR, 'report.txt')
    await writeFile(
      jsonPath,
      JSON.stringify({ live: liveSections, local: localSections }, null, 2)
    )
    await writeFile(txtPath, report)
    console.log(`\nwrote ${jsonPath}\nwrote ${txtPath}\n`)
    console.log(report)
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
