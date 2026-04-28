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
      // Accepted forms:
      //   - slug or path WITHOUT leading slash: "about", "neighborhoods/bellevue"   (preferred)
      //   - full URL: "http://localhost:3000/about"
      //   - leading-slash path: "/about"  -- works on Linux/macOS; on MSYS bash this
      //     is silently rewritten to e.g. "C:/Program Files/Git/about" before the
      //     script ever sees it. We try to undo the mangling but the safer habit
      //     is to drop the leading slash.
      let rooted = rawPath
      if (/^[A-Z]:[\\/]/.test(rooted)) {
        // MSYS-mangled. Known mount roots, longest first so /usr/ doesn't shadow /usr/bin/.
        const msysRoots = [
          'C:/Program Files/Git/usr',
          'C:/Program Files/Git',
          'C:\\Program Files\\Git\\usr',
          'C:\\Program Files\\Git',
          'C:/msys64',
          'C:\\msys64',
          process.cwd(),
        ]
        const norm = rooted.replace(/\\/g, '/')
        const matched = msysRoots
          .map((r) => r.replace(/\\/g, '/').replace(/\/+$/, ''))
          .find((r) => norm.toLowerCase().startsWith(r.toLowerCase() + '/'))
        if (matched) {
          rooted = norm.slice(matched.length)
          console.warn(
            `  [warn] MSYS-mangled path detected; recovered as ${rooted}. ` +
              `Prefer dropping the leading slash next time.`,
          )
        } else {
          throw new Error(
            `Path "${rooted}" looks MSYS-mangled but no known mount root matched. ` +
              `Pass without leading slash (e.g. "neighborhoods/bellevue") or as full URL.`,
          )
        }
      }
      const url = /^https?:\/\//.test(rooted)
        ? rooted
        : `${LOCAL_BASE}${rooted.startsWith('/') ? '' : '/'}${rooted}`
      const outPath = path.join(OUT_DIR, `${rawSlug}-${v.name}.png`)
      console.log(`# ${rawSlug} ${v.name} -> ${url}`)
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
      console.log(`  status=${resp?.status()} title=${await page.title()}`)
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
