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

const PAGES: PageSpec[] = [
  { name: 'home', path: '/' },
  { name: 'about', path: '/about' },
  { name: 'properties', path: '/properties' },
  { name: 'home-search', path: '/home-search' },
  { name: 'home-valuation', path: '/home-valuation' },
  { name: 'neighborhoods', path: '/neighborhoods' },
  { name: 'testimonials', path: '/testimonials' },
  { name: 'buyers', path: '/buyers' },
  { name: 'sellers', path: '/sellers' },
  { name: 'options', path: '/options' },
  { name: 'blog', path: '/blog' },
  { name: 'contact', path: '/contact' },
]

async function capture(browser: Browser, spec: PageSpec, viewport: Viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
  })
  const page: Page = await context.newPage()
  const url = `${LIVE_BASE_URL}${spec.path}`
  const outPath = path.join(OUT_DIR, `${spec.name}-${viewport.name}.png`)

  try {
    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 45000,
    })
    const status = response?.status() ?? 0
    if (status >= 400) {
      console.warn(`  [skip] ${spec.name} ${viewport.name}: HTTP ${status}`)
      return
    }
    // Let lazy-loaded carousels/images settle.
    await page.waitForTimeout(1500)
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
