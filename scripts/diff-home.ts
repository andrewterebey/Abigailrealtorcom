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

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const browser = await chromium.launch()
  try {
    for (const v of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: v.width, height: v.height },
        deviceScaleFactor: 1,
      })
      await context.addInitScript({
        content: 'window.__name = function(fn){return fn;};',
      })
      const page = await context.newPage()
      const url = `${LOCAL_BASE}/`
      const outPath = path.join(OUT_DIR, `home-${v.name}.png`)
      console.log(`# home ${v.name}`)
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
        await new Promise((r) => setTimeout(r, 500))
        window.scrollTo(0, 0)
        await new Promise((r) => setTimeout(r, 500))
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
