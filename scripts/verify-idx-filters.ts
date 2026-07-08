/**
 * Contract verification for IDXProvider filtering — precursor to the full
 * contract suite planned in TODO.md ("npm run test:idx").
 *
 * Added for the NWMLS review round of 2026-07-06, which flagged that entering
 * a City or ZIP did not limit search results. Asserts that both providers
 * genuinely filter by city (case-insensitive) and by 5-digit ZIP.
 *
 * Run: npx tsx scripts/verify-idx-filters.ts
 * Exits non-zero on any failure.
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { MLSGridProvider } from '../lib/idx/mlsgrid-provider'
import { PlaceholderProvider } from '../lib/idx/placeholder-provider'
import type { IDXProvider, ListingFilter } from '../lib/idx/provider'
import type { ListingDetail } from '../types/listing'

const PAGE = { limit: 75, offset: 0 }

let failures = 0

function check(label: string, ok: boolean, detail: string) {
  if (ok) {
    console.log(`  ✓ ${label}`)
  } else {
    failures++
    console.error(`  ✗ ${label} — ${detail}`)
  }
}

async function loadSnapshot(file: string): Promise<ListingDetail[] | null> {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), 'data', file), 'utf8')
    return JSON.parse(raw) as ListingDetail[]
  } catch {
    return null
  }
}

async function verifyProvider(
  name: string,
  provider: IDXProvider,
  all: ListingDetail[],
) {
  console.log(`\n${name} (${all.length} listings in source data)`)

  // Pick a city and a zip that actually exist in the data, preferring ones
  // with a result count below the source total so "no filtering" is
  // distinguishable from "filtering".
  const cityCounts = new Map<string, number>()
  const zipCounts = new Map<string, number>()
  for (const l of all) {
    cityCounts.set(l.city, (cityCounts.get(l.city) ?? 0) + 1)
    const zip5 = l.zip.slice(0, 5)
    zipCounts.set(zip5, (zipCounts.get(zip5) ?? 0) + 1)
  }
  const city = [...cityCounts.entries()]
    .filter(([, n]) => n < all.length)
    .sort((a, b) => b[1] - a[1])[0]
  const zip = [...zipCounts.entries()]
    .filter(([, n]) => n < all.length)
    .sort((a, b) => b[1] - a[1])[0]

  if (!city || !zip) {
    check(`${name}: test data has multiple cities and zips`, false,
      'source data too uniform to verify filtering')
    return
  }

  const [cityName, cityCount] = city
  const [zipCode, zipCount] = zip

  // City filter, exact case.
  {
    const { items, total } = await provider.list({ city: cityName }, PAGE)
    check(
      `city="${cityName}" limits results (${total}/${all.length})`,
      total === cityCount && items.every((i) => i.city === cityName),
      `expected total ${cityCount}, got ${total}`,
    )
  }

  // City filter must be case-insensitive (a consumer types "tacoma").
  {
    const { total } = await provider.list({ city: cityName.toUpperCase() }, PAGE)
    check(
      `city="${cityName.toUpperCase()}" is case-insensitive`,
      total === cityCount,
      `expected total ${cityCount}, got ${total}`,
    )
  }

  // ZIP filter.
  {
    const filter = { zip: zipCode } as ListingFilter
    const { items, total } = await provider.list(filter, PAGE)
    check(
      `zip="${zipCode}" limits results (${total}/${all.length})`,
      total === zipCount && items.every((i) => i.zip.slice(0, 5) === zipCode),
      `expected total ${zipCount}, got ${total}`,
    )
  }

  // A city that matches nothing must return zero, not everything.
  {
    const { total } = await provider.list({ city: 'Nowheresville' }, PAGE)
    check(
      'unknown city returns 0 results',
      total === 0,
      `expected 0, got ${total}`,
    )
  }
}

async function main() {
  const placeholder = await loadSnapshot('listings.json')
  if (placeholder) {
    await verifyProvider('PlaceholderProvider', new PlaceholderProvider(), placeholder)
  }

  const mlsgrid = await loadSnapshot('mlsgrid-demo.json')
  if (mlsgrid) {
    await verifyProvider('MLSGridProvider', new MLSGridProvider(), mlsgrid)
  } else {
    console.log('\nMLSGridProvider: data/mlsgrid-demo.json not present — skipped')
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) FAILED`)
    process.exit(1)
  }
  console.log('\nAll filter checks passed')
}

void main()
