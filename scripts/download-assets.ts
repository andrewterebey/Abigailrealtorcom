import { chromium, type Browser, type Page } from 'playwright'
import { mkdir, writeFile, readdir, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'

const LIVE_BASE_URL = 'https://abigailrealtor.com'
const OUT_DIR = path.join(process.cwd(), 'public', 'images')
const MANIFEST_PATH = path.join(OUT_DIR, '_manifest.json')

type PageSpec = { name: string; path: string }

// Pages to crawl, per §9.4 + task brief. Listing-photo pages are intentionally
// NOT crawled (placeholder listings live in /data/listings.json per §7.8) —
// but we still crawl /properties and /home-search/listings to pick up chrome
// imagery (page heros etc) while filtering out listing photos via the URL
// heuristic in `isExcludedListingImage`.
const PAGES: PageSpec[] = [
  { name: 'home', path: '/' },
  { name: 'about', path: '/about' },
  { name: 'properties', path: '/properties' },
  { name: 'home-search', path: '/home-search/listings' },
  { name: 'home-valuation', path: '/home-valuation' },
  { name: 'neighborhoods', path: '/neighborhoods' },
  { name: 'testimonials', path: '/testimonials' },
  { name: 'buyers', path: '/buyers' },
  { name: 'sellers', path: '/sellers' },
  { name: 'options', path: '/options' },
  { name: 'blog', path: '/blog' },
  { name: 'contact', path: '/contact' },
  { name: 'dmca-notice', path: '/dmca-notice' },
  { name: 'terms-and-conditions', path: '/terms-and-conditions' },
  { name: 'neighborhoods-bellevue', path: '/neighborhoods/bellevue' },
  { name: 'neighborhoods-seattle', path: '/neighborhoods/seattle' },
  { name: 'neighborhoods-newcastle', path: '/neighborhoods/newcastle' },
  { name: 'neighborhoods-eastside', path: '/neighborhoods/eastside' },
  { name: 'neighborhoods-shoreline', path: '/neighborhoods/shoreline' },
  { name: 'neighborhoods-renton', path: '/neighborhoods/renton' },
  {
    name: 'blog-king-county-investment',
    path: '/blog/why-king-county-homes-are-a-smart-investment',
  },
  {
    name: 'blog-bellevue-investment-guide',
    path: '/blog/investing-in-bellevue-real-estate-an-essential-guide',
  },
  {
    name: 'blog-seattle-first-time-buyers',
    path: '/blog/seattle-real-estate-guide-buying-tips-for-first-time-homeowners',
  },
  {
    name: 'blog-kirkland-lakeside',
    path: '/blog/kirkland-real-estate-life-in-a-lakeside-retreat',
  },
]

type ImageSighting = {
  src: string
  alt: string
  role: string
  sectionHint: string
  width: number
  height: number
}

/**
 * Returns true if the URL looks like an MLS/IDX listing photo, a Luxury
 * Presence platform chrome asset, an analytics/tracking pixel, or otherwise
 * something we shouldn't download per the task brief exclusions list.
 */
function isExcludedImage(url: string, width: number, height: number): boolean {
  const u = url.toLowerCase()

  // Tracking pixels / 1x1 beacons.
  if (width === 1 && height === 1) return true
  if (u.includes('facebook.com/tr') || u.includes('google-analytics')) return true
  if (u.includes('googletagmanager')) return true
  if (u.includes('doubleclick')) return true
  if (u.includes('/pixel') || u.includes('beacon')) return true

  // MLS/IDX listing photos (heuristic list from task brief).
  if (u.includes('/idx/')) return true
  if (u.includes('/mls/') || u.includes('nwmls') || u.includes('realtyna')) return true
  if (u.includes('listing-photos') || u.includes('listing_photos')) return true
  if (u.includes('media.nwmlsimages')) return true
  if (u.includes('listhub')) return true
  if (u.includes('matrix.') && u.includes('mlsmatrix')) return true

  // S3 listing-photo buckets.
  if (u.includes('s3.amazonaws.com') && u.includes('listing')) return true
  if (u.includes('s3-us-west') && u.includes('listing')) return true

  // Luxury Presence platform chrome assets (their branding, not Abigail's).
  if (u.includes('lp-static.luxurypresence')) return true
  if (u.includes('luxurypresence.com/platform')) return true
  if (u.includes('luxurypresence.com/lp-assets')) return true

  // Third-party widgets embedded on neighborhood pages — their content, not
  // Abigail's. We re-embed the widget, we don't bake the snapshot.
  if (/s3-media\d*\.fl\.yelpcdn\.com/.test(u)) return true
  if (u.includes('maps.googleapis.com/maps/')) return true
  if (u.includes('maps.gstatic.com/')) return true

  return false
}

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/https?:\/\//g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/**
 * Extract the original-origin URL from a Cloudflare `/cdn-cgi/image/...` URL
 * if possible. Cloudflare's image-resizing URLs have the shape
 * `https://host/cdn-cgi/image/<options>/<origin-path-or-absolute-url>`.
 */
function unwrapCdnCgi(url: string): string {
  const marker = '/cdn-cgi/image/'
  const idx = url.indexOf(marker)
  if (idx === -1) return url
  const afterMarker = url.slice(idx + marker.length)
  // Skip past the options segment (up to the next `/`).
  const optionsEnd = afterMarker.indexOf('/')
  if (optionsEnd === -1) return url
  const rest = afterMarker.slice(optionsEnd + 1)
  if (rest.startsWith('http://') || rest.startsWith('https://')) {
    return rest
  }
  // Relative to the same host.
  const host = url.slice(0, idx)
  return `${host}/${rest}`
}

function extensionFromUrl(url: string): string {
  try {
    const u = new URL(url)
    const base = u.pathname.split('/').pop() ?? ''
    const dot = base.lastIndexOf('.')
    if (dot === -1) return '.jpg'
    const ext = base.slice(dot).toLowerCase()
    // Guard against querystring-y extensions.
    if (ext.length > 6) return '.jpg'
    if (
      ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif', '.avif', '.ico'].includes(
        ext,
      )
    ) {
      return ext
    }
    return '.jpg'
  } catch {
    return '.jpg'
  }
}

function extensionFromContentType(contentType: string | null): string | null {
  if (!contentType) return null
  const ct = contentType.toLowerCase()
  if (ct.includes('image/jpeg')) return '.jpg'
  if (ct.includes('image/png')) return '.png'
  if (ct.includes('image/webp')) return '.webp'
  if (ct.includes('image/svg')) return '.svg'
  if (ct.includes('image/gif')) return '.gif'
  if (ct.includes('image/avif')) return '.avif'
  if (ct.includes('image/x-icon') || ct.includes('image/vnd.microsoft.icon'))
    return '.ico'
  return null
}

/**
 * Build a descriptive filename base (without extension) for a sighting.
 * Examples produced: `home-hero`, `about-portrait-primary`,
 * `neighborhoods-seattle-hero`, `footer-jls-logo`, etc.
 */
function buildDescriptiveName(
  pageName: string,
  sighting: ImageSighting,
  url: string,
): string {
  const parts: string[] = [pageName]

  const hint = sighting.sectionHint && slugify(sighting.sectionHint)
  if (hint) parts.push(hint)

  const role = sighting.role && slugify(sighting.role)
  if (role && role !== hint) parts.push(role)

  const alt = sighting.alt && slugify(sighting.alt)
  if (alt && !parts.some((p) => p === alt) && alt.length > 0) {
    parts.push(alt)
  }

  let candidate = parts.filter(Boolean).join('-')

  // If we have almost nothing, fall back to the URL's basename.
  if (candidate === pageName || candidate.length < pageName.length + 2) {
    try {
      const u = new URL(url)
      const base = u.pathname.split('/').pop() ?? ''
      const withoutExt = base.replace(/\.[a-z0-9]+$/i, '')
      const urlSlug = slugify(withoutExt)
      if (urlSlug) candidate = `${pageName}-${urlSlug}`
    } catch {
      // ignore
    }
  }

  // Final guard: short-hash suffix when we still couldn't derive anything.
  if (!candidate || candidate === pageName) {
    const hash = createHash('sha1').update(url).digest('hex').slice(0, 8)
    candidate = `${pageName}-${hash}`
  }

  // Collapse accidental repeats like `home-home-hero`.
  candidate = candidate.replace(/(^|-)([a-z0-9]+)(?:-\2)+(?=-|$)/g, '$1$2')

  return candidate.slice(0, 120).replace(/-+$/g, '')
}

type CollectResult = {
  sightings: ImageSighting[]
}

/**
 * Collect image URLs from the current page. Grabs <img currentSrc> so we pick
 * the specific srcset candidate the browser fetched at the desktop viewport,
 * plus CSS background-image URLs from computed styles of all elements.
 */
async function collectImagesOnPage(page: Page): Promise<CollectResult> {
  const sightings = await page.evaluate((): ImageSighting[] => {
    function cleanUrl(u: string): string {
      return u.trim().replace(/^['"]|['"]$/g, '')
    }

    function describeRole(el: Element): { role: string; section: string } {
      // Walk up the DOM looking for an identifying class/section hint.
      let role = ''
      let section = ''
      let node: Element | null = el
      let depth = 0
      while (node && depth < 8) {
        const tag = node.tagName.toLowerCase()
        const classes = (node.className && typeof node.className === 'string'
          ? node.className
          : ''
        )
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean)
        const id = (node.id || '').toLowerCase()

        const roleHints = [
          'hero',
          'headshot',
          'portrait',
          'avatar',
          'logo',
          'banner',
          'cta',
          'card',
          'thumbnail',
          'testimonial',
          'signature',
        ]
        const sectionHints = [
          'footer',
          'header',
          'nav',
          'navigation',
          'hero',
          'about',
          'neighborhoods',
          'neighborhood',
          'testimonials',
          'reviews',
          'spotlight',
          'featured',
          'blog',
          'contact',
          'bio',
          'team',
          'stats',
          'cta',
          'gallery',
        ]

        for (const h of roleHints) {
          if (!role && (classes.some((c) => c.includes(h)) || id.includes(h))) {
            role = h
          }
        }
        for (const h of sectionHints) {
          if (!section && (tag === h || classes.some((c) => c.includes(h)) || id.includes(h))) {
            section = h
          }
        }

        if (role && section) break
        node = node.parentElement
        depth += 1
      }
      return { role, section }
    }

    const results: ImageSighting[] = []
    const seen = new Set<string>()

    // <img currentSrc>.
    const imgs = Array.from(document.querySelectorAll('img'))
    for (const img of imgs) {
      const current = img.currentSrc || img.src
      if (!current) continue
      const abs = (() => {
        try {
          return new URL(current, document.baseURI).toString()
        } catch {
          return current
        }
      })()
      if (!abs.startsWith('http')) continue
      const key = `img::${abs}`
      if (seen.has(key)) continue
      seen.add(key)

      const { role, section } = describeRole(img)
      const finalRole = role || 'image'
      const rect = img.getBoundingClientRect()
      results.push({
        src: abs,
        alt: img.getAttribute('alt') || '',
        role: finalRole,
        sectionHint: section,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      })
    }

    // CSS background-image URLs.
    const all = Array.from(document.querySelectorAll<HTMLElement>('*'))
    for (const el of all) {
      const bg = window.getComputedStyle(el).backgroundImage
      if (!bg || bg === 'none') continue
      // May contain multiple url()s.
      const matches = bg.match(/url\((["']?)(.*?)\1\)/g)
      if (!matches) continue
      for (const m of matches) {
        const inner = m.replace(/^url\(/, '').replace(/\)$/, '')
        const raw = cleanUrl(inner)
        if (!raw) continue
        if (raw.startsWith('data:')) continue
        let abs: string
        try {
          abs = new URL(raw, document.baseURI).toString()
        } catch {
          continue
        }
        if (!abs.startsWith('http')) continue
        const key = `bg::${abs}`
        if (seen.has(key)) continue
        seen.add(key)
        const { role, section } = describeRole(el)
        const rect = el.getBoundingClientRect()
        results.push({
          src: abs,
          alt: el.getAttribute('aria-label') || '',
          role: role || 'background',
          sectionHint: section,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        })
      }
    }

    return results
  })

  return { sightings }
}

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

type ManifestEntry = {
  pages: string[]
  sourceUrl: string
  alt: string
  bytes: number
}

type Manifest = Record<string, ManifestEntry>

async function downloadOne(
  url: string,
): Promise<{ bytes: Uint8Array; contentType: string | null } | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (abigailrealtor-rebuild asset-downloader; +local-dev)',
        Accept: 'image/avif,image/webp,image/*,*/*;q=0.8',
      },
      redirect: 'follow',
    })
    if (!res.ok) {
      console.warn(`  [dl-fail] ${res.status} ${url}`)
      return null
    }
    const ct = res.headers.get('content-type')
    const buf = new Uint8Array(await res.arrayBuffer())
    if (buf.byteLength === 0) {
      console.warn(`  [dl-empty] ${url}`)
      return null
    }
    return { bytes: buf, contentType: ct }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(`  [dl-err] ${url}: ${message}`)
    return null
  }
}

async function fileExistsWithSize(p: string): Promise<number | null> {
  try {
    const s = await stat(p)
    return s.size
  } catch {
    return null
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  type UrlRecord = {
    canonicalUrl: string
    originalUrl: string
    firstPage: string
    pages: Set<string>
    firstSighting: ImageSighting
  }
  const urlRecords = new Map<string, UrlRecord>()

  const crawlErrors: { page: string; message: string }[] = []

  const browser: Browser = await chromium.launch()
  try {
    for (const spec of PAGES) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      })
      // Shim esbuild's __name helper into the page context. tsx transpiles this
      // script with esbuild, which wraps named functions with `__name(fn, ...)`
      // — that helper isn't defined in the browser, so every page.evaluate()
      // throws "ReferenceError: __name is not defined". Injecting an identity
      // implementation as an init-script makes evaluate() work.
      await context.addInitScript({
        content: 'window.__name = function(fn){return fn;};',
      })
      const page = await context.newPage()
      const url = `${LIVE_BASE_URL}${spec.path}`
      console.log(`# ${spec.name} (${url})`)
      try {
        // `networkidle` hangs on this site because of long-poll analytics; use
        // `domcontentloaded` + an explicit settle wait for imagery to render.
        const response = await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 60000,
        })
        const status = response?.status() ?? 0
        if (status >= 400) {
          console.warn(`  [skip] ${spec.name}: HTTP ${status}`)
          continue
        }
        await page.waitForLoadState('load', { timeout: 20000 }).catch(() => {})
        await scrollPageToBottom(page)
        const { sightings } = await collectImagesOnPage(page)
        console.log(`  collected ${sightings.length} raw sightings`)
        let added = 0
        for (const s of sightings) {
          if (isExcludedImage(s.src, s.width, s.height)) continue
          const canonical = unwrapCdnCgi(s.src)
          if (isExcludedImage(canonical, s.width, s.height)) continue
          const existing = urlRecords.get(canonical)
          if (existing) {
            existing.pages.add(spec.name)
          } else {
            urlRecords.set(canonical, {
              canonicalUrl: canonical,
              originalUrl: s.src,
              firstPage: spec.name,
              pages: new Set([spec.name]),
              firstSighting: s,
            })
            added += 1
          }
        }
        console.log(`  +${added} new unique URLs after exclusions`)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.warn(`  [page-fail] ${spec.name}: ${message}`)
        crawlErrors.push({ page: spec.name, message })
      } finally {
        await context.close()
      }
    }
  } finally {
    await browser.close()
  }

  console.log(`\nTotal unique URLs collected (post-exclusions): ${urlRecords.size}`)

  // Assign filenames. Resolve collisions by appending -a, -b, ...
  const nameToUrl = new Map<string, string>()
  const urlToName = new Map<string, string>()

  for (const [canonical, rec] of urlRecords) {
    const baseName = buildDescriptiveName(rec.firstPage, rec.firstSighting, canonical)
    const ext = extensionFromUrl(canonical)
    let fullName = `${baseName}${ext}`
    if (nameToUrl.has(fullName)) {
      // Disambiguate.
      let suffixCode = 'a'.charCodeAt(0)
      while (nameToUrl.has(`${baseName}-${String.fromCharCode(suffixCode)}${ext}`)) {
        suffixCode += 1
        if (suffixCode > 'z'.charCodeAt(0)) {
          const hash = createHash('sha1').update(canonical).digest('hex').slice(0, 6)
          fullName = `${baseName}-${hash}${ext}`
          break
        }
      }
      if (!nameToUrl.has(fullName)) {
        fullName = `${baseName}-${String.fromCharCode(suffixCode)}${ext}`
      }
    }
    nameToUrl.set(fullName, canonical)
    urlToName.set(canonical, fullName)
  }

  // Load prior manifest (if any) so we stay idempotent across reruns.
  let manifest: Manifest = {}
  try {
    const existing = await readdir(OUT_DIR)
    if (existing.includes('_manifest.json')) {
      const raw = await (await import('node:fs/promises')).readFile(MANIFEST_PATH, 'utf8')
      manifest = JSON.parse(raw) as Manifest
    }
  } catch {
    // ignore
  }

  let downloaded = 0
  let skipped = 0
  let failed = 0
  let totalBytes = 0

  for (const [canonical, rec] of urlRecords) {
    const fullName = urlToName.get(canonical)
    if (!fullName) continue
    const outPath = path.join(OUT_DIR, fullName)

    const existingSize = await fileExistsWithSize(outPath)
    if (existingSize && existingSize > 0) {
      // Already present; just refresh manifest metadata.
      const pages = Array.from(
        new Set([...(manifest[fullName]?.pages ?? []), ...Array.from(rec.pages)]),
      )
      manifest[fullName] = {
        pages,
        sourceUrl: canonical,
        alt: rec.firstSighting.alt,
        bytes: existingSize,
      }
      totalBytes += existingSize
      skipped += 1
      continue
    }

    // Try canonical URL first, then original (e.g. CDN variant) as fallback.
    let dl = await downloadOne(canonical)
    if (!dl && rec.originalUrl !== canonical) {
      dl = await downloadOne(rec.originalUrl)
    }
    if (!dl) {
      failed += 1
      continue
    }

    // If we guessed the extension wrong from the URL, fix it up from the
    // response content-type — keeps SVGs out of .jpg files, etc.
    const ctExt = extensionFromContentType(dl.contentType)
    let finalName = fullName
    if (ctExt && !fullName.toLowerCase().endsWith(ctExt)) {
      const baseNoExt = fullName.replace(/\.[a-z0-9]+$/i, '')
      const corrected = `${baseNoExt}${ctExt}`
      if (!nameToUrl.has(corrected) || nameToUrl.get(corrected) === canonical) {
        finalName = corrected
        nameToUrl.delete(fullName)
        nameToUrl.set(finalName, canonical)
        urlToName.set(canonical, finalName)
      }
    }

    const finalPath = path.join(OUT_DIR, finalName)
    await writeFile(finalPath, dl.bytes)
    downloaded += 1
    totalBytes += dl.bytes.byteLength

    manifest[finalName] = {
      pages: Array.from(rec.pages),
      sourceUrl: canonical,
      alt: rec.firstSighting.alt,
      bytes: dl.bytes.byteLength,
    }

    console.log(
      `  [ok] ${finalName} (${dl.bytes.byteLength} B) <- ${canonical.slice(0, 90)}`,
    )
  }

  // Write manifest sorted by filename for stable diffs.
  const sortedManifest: Manifest = {}
  for (const key of Object.keys(manifest).sort()) {
    sortedManifest[key] = manifest[key]
  }
  await writeFile(MANIFEST_PATH, JSON.stringify(sortedManifest, null, 2) + '\n')

  console.log('\n=== SUMMARY ===')
  console.log(`Pages crawled: ${PAGES.length}`)
  console.log(`Unique URLs (post-exclusions): ${urlRecords.size}`)
  console.log(`Downloaded this run: ${downloaded}`)
  console.log(`Already on disk (skipped): ${skipped}`)
  console.log(`Failed: ${failed}`)
  console.log(`Total bytes: ${totalBytes}`)
  console.log(`Manifest entries: ${Object.keys(sortedManifest).length}`)
  if (crawlErrors.length > 0) {
    console.log('\nPage errors:')
    for (const e of crawlErrors) console.log(`  - ${e.page}: ${e.message}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
