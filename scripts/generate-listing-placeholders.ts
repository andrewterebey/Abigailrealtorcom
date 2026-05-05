// Regenerates the placeholder listing photos under /public/listings/.
// Each frame is a flat-gray SVG with a stylised house icon and a label like
// "PLACEHOLDER LISTING #03 — FRAME B" so it reads as obviously fake at a
// glance. Run with `tsx scripts/generate-listing-placeholders.ts`.

import { promises as fs } from 'node:fs'
import path from 'node:path'

type Frame = { id: number; suffix: '' | 'a' | 'b' | 'c' | 'd' }

// Every listing gets 5 frames (primary + a/b/c/d) so the detail-page hero
// always renders a full row of 4 thumbnails on desktop.
const SUFFIXES: Frame['suffix'][] = ['', 'a', 'b', 'c', 'd']
const FRAMES: Frame[] = Array.from({ length: 12 }, (_, i) => i + 1).flatMap(
  (id) => SUFFIXES.map((suffix) => ({ id, suffix }) satisfies Frame),
)

const OUT_DIR = path.join(process.cwd(), 'public', 'listings')

function svg({ id, suffix }: Frame): string {
  const idLabel = String(id).padStart(2, '0')
  const frameLabel = suffix ? `Frame ${suffix.toUpperCase()}` : 'Primary'
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900" role="img" aria-label="Placeholder listing ${idLabel} ${frameLabel}">
  <rect width="1200" height="900" fill="#e5e7eb"/>
  <rect x="40" y="40" width="1120" height="820" fill="none" stroke="#9ca3af" stroke-width="3" stroke-dasharray="14 10"/>
  <g transform="translate(540 280)" fill="none" stroke="#6b7280" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M0 90 L60 25 L120 90 L120 175 L0 175 Z"/>
    <path d="M44 175 L44 120 L76 120 L76 175"/>
    <path d="M75 25 L75 10 L100 10 L100 50"/>
  </g>
  <text x="600" y="600" text-anchor="middle" fill="#374151" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif" font-size="60" font-weight="800" letter-spacing="4">PLACEHOLDER LISTING #${idLabel}</text>
  <text x="600" y="660" text-anchor="middle" fill="#6b7280" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif" font-size="30" font-weight="500" letter-spacing="3">${frameLabel.toUpperCase()}</text>
  <text x="600" y="820" text-anchor="middle" fill="#9ca3af" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif" font-size="20" font-weight="500" letter-spacing="2">NOT A REAL PROPERTY</text>
</svg>
`
}

function fileName({ id, suffix }: Frame): string {
  const idLabel = String(id).padStart(2, '0')
  return suffix
    ? `placeholder-${idLabel}-${suffix}.svg`
    : `placeholder-${idLabel}.svg`
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })
  for (const frame of FRAMES) {
    const out = path.join(OUT_DIR, fileName(frame))
    await fs.writeFile(out, svg(frame), 'utf8')
    console.log(`wrote ${path.relative(process.cwd(), out)}`)
  }
  console.log(`\n${FRAMES.length} placeholder SVGs written to ${path.relative(process.cwd(), OUT_DIR)}/`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
