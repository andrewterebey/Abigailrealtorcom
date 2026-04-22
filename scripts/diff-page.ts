import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

type Viewport = { name: string; width: number; height: number }

const VIEWPORTS: Viewport[] = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 812 },
]

const LOCAL_BASE = process.env.LOCAL_BASE ?? 'http://localhost:3000'
const OUT_DIR = path.join(process.cwd(), 'screenshots', 'local')

// Args format: `tsx scripts/diff-page.ts <slug> <urlPath> [...moreViewports]`
// Examples:
//   tsx scripts/diff-page.ts about /about
//   tsx scripts/diff-page.ts contact /contact desktop
async function main() {
  const [rawSlug, rawPath, ...rest] = process.argv.slice(2)
  if (!rawSlug || !rawPath) {
    console.error(
      'usage: tsx scripts/diff-page.ts <slug> <urlPath> [viewport ...]',
    )
    process.exit(1)
  }
  const wanted = rest.length
    ? VIEWPORTS.filter((v) => rest.includes(v.name))
    : VIEWPORTS

  await mkdir(OUT_DIR, { recursive: true })
  const browser = await chromium.launch()
  try {
    for (const v of wanted) {
      const context = await browser.newContext({
        viewport: { width: v.width, height: v.height },
        deviceScaleFactor: 1,
      })
      await context.addInitScript({
        content: 'window.__name = function(fn){return fn;};',
      })
      const page = await context.newPage()
      // Accept either a full URL, a /path, or a slug ("about"). On MSYS bash
      // a leading `/` gets mangled to a filesystem path, so we also strip any
      // leading drive-prefix junk.
      let rooted = rawPath
      if (/^[A-Z]:\\|^[A-Z]:\//.test(rooted) || rooted.startsWith('C:/')) {
        rooted = '/' + rooted.split(/[\\/]/).pop()!
      }
      const url = /^https?:\/\//.test(rooted)
        ? rooted
        : `${LOCAL_BASE}${rooted.startsWith('/') ? '' : '/'}${rooted}`
      const outPath = path.join(OUT_DIR, `${rawSlug}-${v.name}.png`)
      console.log(`# ${rawSlug} ${v.name}`)
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await page.waitForLoadState('load', { timeout: 20000 }).catch(() => {})
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
        await new Promise((r) => setTimeout(r, 400))
        window.scrollTo(0, 0)
        await new Promise((r) => setTimeout(r, 400))
      })
      await page.screenshot({ path: outPath, fullPage: true })
      console.log(`  [ok] ${outPath}`)
      await context.close()
    }
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
