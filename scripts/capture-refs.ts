/**
 * Targeted captures for specific UI work:
 *  - navbar at top + scrolled + popout-open
 *  - neighborhood detail page (bellevue) full page
 *
 * Outputs to screenshots/refs/ at high resolution so we can read pixel
 * detail.
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const OUT = path.join(process.cwd(), 'screenshots', 'refs')
const LIVE = 'https://abigailrealtor.com'

async function main() {
  await mkdir(OUT, { recursive: true })
  const browser = await chromium.launch()
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    })
    await context.addInitScript({
      content: 'window.__name = function(fn){return fn;};',
    })

    // 1. Live navbar at top (hero visible, transparent header)
    let page = await context.newPage()
    await page.goto(LIVE, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForLoadState('load', { timeout: 20000 }).catch(() => {})
    await page.waitForTimeout(1500)
    await page.screenshot({
      path: path.join(OUT, 'live-navbar-top.png'),
      clip: { x: 0, y: 0, width: 1440, height: 160 },
    })

    // 2. Live navbar scrolled (white bg)
    await page.evaluate(() => window.scrollTo(0, 1200))
    await page.waitForTimeout(800)
    await page.screenshot({
      path: path.join(OUT, 'live-navbar-scrolled.png'),
      clip: { x: 0, y: 0, width: 1440, height: 160 },
    })

    // 3. Open the popout menu (hamburger) and capture — try clicking the
    // last button-like element in the header.
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(500)
    // Hamburger is typically the last clickable icon in the nav.
    const hamburger = page.locator(
      'header button, header [role="button"]'
    ).last()
    try {
      await hamburger.click({ timeout: 3000 })
      await page.waitForTimeout(1200)
      await page.screenshot({
        path: path.join(OUT, 'live-navbar-menu-open.png'),
        fullPage: false,
      })
    } catch {
      console.log('menu click failed; trying role-based selector')
      try {
        await page
          .getByRole('button', { name: /menu/i })
          .first()
          .click({ timeout: 3000 })
        await page.waitForTimeout(1200)
        await page.screenshot({
          path: path.join(OUT, 'live-navbar-menu-open.png'),
          fullPage: false,
        })
      } catch {
        console.log('could not open menu; skipping')
      }
    }
    await page.close()

    // 4. Full neighborhoods/bellevue page
    page = await context.newPage()
    await page.goto(`${LIVE}/neighborhoods/bellevue`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })
    await page.waitForLoadState('load', { timeout: 20000 }).catch(() => {})
    await page.waitForTimeout(1000)
    // Scroll through to trigger lazy content
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
      await new Promise((r) => setTimeout(r, 600))
    })
    await page.screenshot({
      path: path.join(OUT, 'live-neighborhoods-bellevue.png'),
      fullPage: true,
    })

    // Also capture the "above-the-fold" to see hero treatment clearly
    await page.screenshot({
      path: path.join(OUT, 'live-neighborhoods-bellevue-fold.png'),
      clip: { x: 0, y: 0, width: 1440, height: 900 },
    })
    await page.close()
  } finally {
    await browser.close()
  }
  console.log('done — see', OUT)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
