import { promises as fs } from 'node:fs'
import path from 'node:path'
import { matchesFilter } from './filter'
import type {
  IDXProvider,
  ListingDetail,
  ListingFilter,
  ListingSummary,
  Pagination,
} from './provider'

const DATA_PATH = path.join(process.cwd(), 'data', 'listings.json')

let cache: ListingDetail[] | null = null

async function loadAll(): Promise<ListingDetail[]> {
  if (cache) return cache
  const raw = await fs.readFile(DATA_PATH, 'utf8')
  cache = JSON.parse(raw) as ListingDetail[]
  return cache
}

function toSummary(d: ListingDetail): ListingSummary {
  const {
    id,
    mlsNumber,
    slug,
    address,
    city,
    state,
    zip,
    price,
    beds,
    baths,
    sqft,
    status,
    primaryImage,
    coordinates,
  } = d
  return {
    id,
    mlsNumber,
    slug,
    address,
    city,
    state,
    zip,
    price,
    beds,
    baths,
    sqft,
    status,
    primaryImage,
    coordinates,
  }
}

export class PlaceholderProvider implements IDXProvider {
  async list(filter: ListingFilter, page: Pagination) {
    const all = await loadAll()
    const filtered = all.filter((l) => matchesFilter(l, filter))
    const items = filtered
      .slice(page.offset, page.offset + page.limit)
      .map(toSummary)
    return { items, total: filtered.length }
  }

  async get(id: string): Promise<ListingDetail | null> {
    const all = await loadAll()
    return all.find((l) => l.id === id || l.slug === id) ?? null
  }
}
