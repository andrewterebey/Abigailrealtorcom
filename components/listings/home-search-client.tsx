'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { IdxSearchToolbar } from './idx-search-toolbar'
import { ListingGrid } from './listing-grid'
import { ListingsMap, type MapMarker } from './listings-map'
import type { ListingSummary } from '@/types/listing'

const ALLOWED_KEYS = [
  'city',
  'min_price',
  'max_price',
  'min_beds',
  'min_baths',
  'property_type',
  'status',
] as const

type ApiResponse = {
  items: ListingSummary[]
  total: number
  limit: number
  offset: number
}

type View = 'split' | 'list' | 'map'

// Default center over central King County so an empty/zoomed-out search
// still shows something recognisable. Markers will recenter via fitBounds.
const DEFAULT_CENTER = { lat: 47.6101, lng: -122.2015 } as const

function HomeSearchInner() {
  const searchParams = useSearchParams()
  const [items, setItems] = useState<ListingSummary[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>('split')

  const apiQuery = useMemo(() => {
    const p = new URLSearchParams()
    for (const key of ALLOWED_KEYS) {
      const v = searchParams.get(key)
      if (v) p.set(key, v)
    }
    p.set('limit', '50')
    return p.toString()
  }, [searchParams])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/listings?${apiQuery}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Search failed (${res.status})`)
        const data: ApiResponse = await res.json()
        if (cancelled) return
        setItems(data.items)
        setTotal(data.total)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Search failed')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [apiQuery])

  const markers: MapMarker[] = useMemo(
    () =>
      items.map((l) => ({
        id: l.id,
        lat: l.coordinates.lat,
        lng: l.coordinates.lng,
        label: formatPriceShort(l.price),
        href: `/properties/${l.slug}`,
      })),
    [items],
  )

  const showGrid = view !== 'map'
  const showMap = view !== 'list'

  return (
    <div className="flex flex-col">
      <IdxSearchToolbar
        view={view}
        onViewChange={setView}
        total={total}
        loading={loading}
      />

      <div
        className={`grid gap-0 ${
          showGrid && showMap
            ? 'lg:grid-cols-[minmax(0,1fr)_minmax(360px,520px)]'
            : 'grid-cols-1'
        }`}
      >
        {showGrid ? (
          <div className="px-5 py-6 lg:px-6 lg:py-8">
            <div className="mb-5 flex items-baseline justify-between">
              <h2 className="font-display text-[22px] leading-tight text-site-text md:text-[26px]">
                Real Estate &amp; Homes for Sale
              </h2>
              <p className="font-body text-[12px] uppercase tracking-[0.14em] text-site-text-muted">
                {loading ? 'Loading…' : `${total.toLocaleString()} results`}
              </p>
            </div>
            {error ? (
              <p className="py-16 text-center font-body text-[14px] uppercase tracking-[0.14em] text-red-600">
                {error}
              </p>
            ) : (
              <ListingGrid
                items={items}
                className="md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2"
                emptyMessage={
                  loading
                    ? 'Loading listings…'
                    : 'No listings match these filters. Try widening your search.'
                }
              />
            )}
          </div>
        ) : null}

        {showMap ? (
          <div
            className={`relative ${
              showGrid && showMap
                ? 'h-[520px] lg:sticky lg:top-[72px] lg:h-[calc(100vh-72px)]'
                : 'h-[640px]'
            }`}
          >
            <ListingsMap
              center={
                items[0]?.coordinates
                  ? items[0].coordinates
                  : DEFAULT_CENTER
              }
              zoom={11}
              markers={markers}
              className="h-full w-full"
              ariaLabel="Map of search results"
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function HomeSearchClient() {
  return (
    <Suspense
      fallback={
        <p className="py-16 text-center font-body text-[13px] uppercase tracking-[0.14em] text-site-text-muted">
          Loading search…
        </p>
      }
    >
      <HomeSearchInner />
    </Suspense>
  )
}

function formatPriceShort(price: number): string {
  if (price >= 1_000_000) {
    const m = price / 1_000_000
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(2).replace(/0$/, '')}M`
  }
  if (price >= 1_000) return `$${Math.round(price / 1_000)}k`
  return `$${price}`
}
