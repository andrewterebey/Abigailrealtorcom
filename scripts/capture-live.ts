import { chromium, type Browser, type Page } from 'playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const LIVE_BASE_URL = 'https://abigailrealtor.com'
const OUT_DIR = path.join(process.cwd(), 'screenshots', 'live')

type Viewport = { name: string; width: number; height: number }

const VIEWPORTS: Viewport[] = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 812 },
]

type PageSpec = { name: string; path: string }

// Paths below were discovered from abigailrealtor.com's sitemap on 2026-04-21
// (sitemap-static.xml and sitemap-neighborhoods-dpages.xml). If the live site
// adds or renames routes, re-run the sitemap fetch and update this list.
const PAGES: PageSpec[] = [
  { name: 'home', path: '/' },
  { name: 'about', path: '/about' },
  { name: 'properties', path: '/properties' },
  { name: 'properties-sale', path: '/properties/sale' },
  { name: 'properties-sold', path: '/properties/sold' },
  { name: 'home-search', path: '/home-search/listings' },
  { name: 'home-valuation', path: '/home-valuation' },
  { name: 'neighborhoods', path: '/neighborhoods' },
  { name: 'neighborhoods-bellevue', path: '/neighborhoods/bellevue' },
  { name: 'neighborhoods-seattle', path: '/neighborhoods/seattle' },
  { name: 'neighborhoods-newcastle', path: '/neighborhoods/newcastle' },
  { name: 'neighborhoods-eastside', path: '/neighborhoods/eastside' },
  { name: 'neighborhoods-shoreline', path: '/neighborhoods/shoreline' },
  { name: 'neighborhoods-renton', path: '/neighborhoods/renton' },
  { name: 'testimonials', path: '/testimonials' },
  { name: 'buyers', path: '/buyers' },
  { name: 'sellers', path: '/sellers' },
  { name: 'options', path: '/options' },
  { name: 'blog', path: '/blog' },
  { name: 'contact', path: '/contact' },
  { name: 'dmca-notice', path: '/dmca-notice' },
  { name: 'terms-and-conditions', path: '/terms-and-conditions' },
]

async function capture(browser: Browser, spec: PageSpec, viewport: Viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
  })
  // tsx+esbuild inject a `__name` helper into transpiled page.evaluate bodies
  // which the browser context doesn't define; shim it so evaluates don't throw.
  await context.addInitScript({
    content: 'window.__name = function(fn){return fn;};',
  })
  const page: Page = await context.newPage()
  const url = `${LIVE_BASE_URL}${spec.path}`
  const outPath = path.join(OUT_DIR, `${spec.name}-${viewport.name}.png`)

  try {
    // `networkidle` hangs on this site due to long-poll analytics; use
    // `domcontentloaded` + load state as a best-effort settle.
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })
    const status = response?.status() ?? 0
    if (status >= 400) {
      console.warn(`  [skip] ${spec.name} ${viewport.name}: HTTP ${status}`)
      return
    }
    await page.waitForLoadState('load', { timeout: 20000 }).catch(() => {})
    // Scroll through to trigger lazy-loaded carousels/images, then reset.
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
      await new Promise((r) => setTimeout(r, 500))
    })
    await page.screenshot({ path: outPath, fullPage: true })
    console.log(`  [ok]   ${spec.name} ${viewport.name} -> ${outPath}`)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(`  [fail] ${spec.name} ${viewport.name}: ${message}`)
  } finally {
    await context.close()
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const argv = process.argv.slice(2)
  const selected = argv.length > 0
    ? PAGES.filter((p) => argv.includes(p.name))
    : PAGES
  if (selected.length === 0) {
    console.error(
      `No matching pages for args: ${argv.join(', ')}. Known pages: ${PAGES.map((p) => p.name).join(', ')}`,
    )
    process.exit(2)
  }

  const browser = await chromium.launch()
  try {
    for (const spec of selected) {
      console.log(`# ${spec.name} (${spec.path})`)
      for (const viewport of VIEWPORTS) {
        await capture(browser, spec, viewport)
      }
    }
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
