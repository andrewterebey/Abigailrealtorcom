'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ListingFilters } from './listing-filters'
import { ListingGrid } from './listing-grid'
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

function HomeSearchInner() {
  const searchParams = useSearchParams()
  const [items, setItems] = useState<ListingSummary[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        if (!res.ok) {
          throw new Error(`Search failed (${res.status})`)
        }
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

  return (
    <div className="space-y-10">
      <ListingFilters />
      <div className="flex items-baseline justify-between">
        <p className="font-body text-[13px] uppercase tracking-[0.14em] text-site-text-muted">
          {loading ? 'Searching…' : `${total} result${total === 1 ? '' : 's'}`}
        </p>
      </div>
      {error ? (
        <p className="py-16 text-center font-body text-[14px] uppercase tracking-[0.14em] text-red-600">
          {error}
        </p>
      ) : (
        <ListingGrid
          items={items}
          emptyMessage={
            loading
              ? 'Loading listings…'
              : 'No listings match these filters. Try widening your search.'
          }
        />
      )}
    </div>
  )
}

export function HomeSearchClient() {
  // useSearchParams requires a Suspense boundary in the App Router.
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
