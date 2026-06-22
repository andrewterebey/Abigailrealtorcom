'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { IdxSearchToolbar } from './idx-search-toolbar'
import { ListingGrid } from './listing-grid'
import { ListingsMap, type MapMarker } from './listings-map'
import { ACTIVE_STATUSES, type ListingSummary } from '@/types/listing'

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

// NWMLS / MLS Grid IDX Rule 26 caps a single search RESPONSE at 2,500 listings
// (and forbids limiting it below 500 / 50%). We render one page of 75 listings
// per response — far under the 2,500 ceiling — and let the consumer page
// through the ENTIRE result set rather than capping at the first page. This
// satisfies Rule 26 (no single response exceeds 2,500; nothing is hidden below
// the minimum) AND the NWMLS reviewer requirement (idx@nwmls.com, 2026-06-22)
// that every listing in the demo feed be accessible for compliance evaluation.
// (Map pins are exempt from the 2,500 cap regardless: "This does not apply to
// displays showing mapping pins and no other listing data.")
const PAGE_SIZE = 75

function HomeSearchInner() {
  const searchParams = useSearchParams()
  const [items, setItems] = useState<ListingSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1) // 1-based
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>('split')

  // Filter query WITHOUT pagination params — a change resets to page 1.
  const baseQuery = useMemo(() => {
    const p = new URLSearchParams()
    for (const key of ALLOWED_KEYS) {
      const v = searchParams.get(key)
      if (v) p.set(key, v)
    }
    return p.toString()
  }, [searchParams])

  // Reset to page 1 whenever the filters change. Adjusting state during render
  // (the supported React pattern) means the fetch effect below sees page === 1
  // on the same render, avoiding a wasted fetch of the stale page number
  // against the new filters.
  const [trackedQuery, setTrackedQuery] = useState(baseQuery)
  if (baseQuery !== trackedQuery) {
    setTrackedQuery(baseQuery)
    setPage(1)
  }

  // Fetch the current page whenever the filters or page change. Each response
  // is a single page of PAGE_SIZE listings — see the Rule 26 note above.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const p = new URLSearchParams(baseQuery)
    p.set('limit', String(PAGE_SIZE))
    p.set('offset', String((page - 1) * PAGE_SIZE))
    fetch(`/api/listings?${p.toString()}`)
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
        setItems([])
        setTotal(0)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [baseQuery, page])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min((page - 1) * PAGE_SIZE + items.length, total)

  const goToPage = (next: number) => {
    const clamped = Math.min(Math.max(1, next), totalPages)
    if (clamped === page) return
    setPage(clamped)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const markers: MapMarker[] = useMemo(
    () =>
      items
        // NWMLS: listings with showOnMap === false (NWM_ShowMapLink) or a
        // withheld address must not be pinned, but still appear in the list
        // ([GUID #12/#13]). undefined = allowed (placeholder data). So the map
        // shows only the current page's mappable listings — not all listings.
        .filter((l) => l.showOnMap !== false)
        .map((l) => ({
          id: l.id,
          lat: l.coordinates.lat,
          lng: l.coordinates.lng,
          label: formatPriceShort(l.price),
          href: `/properties/${l.slug}`,
          // NWMLS §E.5: Pending/Sold ("Non-Active") pins must be visually
          // distinct from Active/Contingent on the map.
          inactive: !ACTIVE_STATUSES.includes(l.status),
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
                {loading
                  ? 'Loading…'
                  : total === 0
                  ? '0 results'
                  : `${rangeStart.toLocaleString()}–${rangeEnd.toLocaleString()} of ${total.toLocaleString()}`}
              </p>
            </div>
            {/* NWMLS/MLS Grid source identification ([GRID §23]) — must appear
                on the first page where listings are displayed. NOTE: §23 also
                requires the MLS GRID approved logo/icon here; that asset is
                still pending (see TODO.md) — text alone is not sufficient. */}
            {process.env.NEXT_PUBLIC_IDX_NWMLS === 'true' && (
              <p className="mb-2 font-body text-[12px] leading-[1.5] text-site-text-muted">
                Listings courtesy of the Northwest Multiple Listing Service, as
                distributed by MLS GRID.
              </p>
            )}
            {/* NWMLS exclusion disclosure ([GRID §9]). The bare mandated
                sentence was flagged twice by the NWMLS reviewer (idx@nwmls.com,
                2026-06-15 and again 2026-06-22) as insufficient: it must also
                explain WHICH listings are and are not displayed. The wording
                below enumerates the actual inclusion/suppression rules enforced
                in lib/idx/mlsgrid-map.ts (status eligibility, MlgCanView /
                MlgCanUse, seller internet-display opt-outs, withheld address)
                so the disclosure matches what the site truly shows. */}
            {process.env.NEXT_PUBLIC_IDX_NWMLS === 'true' && (
              <div className="mb-5 space-y-2 font-body text-[12px] leading-[1.6] text-site-text-muted">
                <p>
                  <strong className="font-semibold">
                    Some IDX listings have been excluded from this website.
                  </strong>{' '}
                  This site displays residential listings made available for
                  Internet Data Exchange (IDX) through the Northwest Multiple
                  Listing Service (NWMLS), as distributed by MLS GRID.
                </p>
                <p>
                  <span className="font-semibold text-site-text">
                    What is shown:
                  </span>{' '}
                  active, contingent (active-under-contract), pending, and sold
                  residential listings that the listing broker has authorized for
                  IDX display.
                </p>
                <p>
                  <span className="font-semibold text-site-text">
                    What is excluded:
                  </span>{' '}
                  listings a seller has directed not be displayed publicly online;
                  listings not authorized for IDX distribution (for example,
                  records designated for broker- or VOW-only display); and
                  listings whose NWMLS status is not eligible for public IDX
                  display — including expired, canceled, withdrawn, hold,
                  temporarily-off-market, coming-soon, and sale-fail listings.
                  Where a seller has withheld the street address, the listing is
                  shown without its address and is not pinned on the map. As a
                  result, this site may not include every listing in the NWMLS.
                </p>
              </div>
            )}
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
            {/* NWMLS IDX Rule 26: page through the FULL result set (75 per page,
                every page reachable) instead of capping the displayable set. */}
            {!error && !loading && totalPages > 1 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                onChange={goToPage}
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

/** Windowed page-number pagination: first, last, and a small range around the
 *  current page, with ellipses for the gaps. Keeps the control compact even at
 *  170+ pages (12,877 listings ÷ 75). */
function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (next: number) => void
}) {
  const tokens = pageWindow(page, totalPages)
  const btn =
    'inline-flex h-10 min-w-10 items-center justify-center border px-3 font-body text-[13px] font-bold uppercase tracking-[0.12em] transition-colors disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <nav
      aria-label="Search results pages"
      className="mt-10 flex flex-col items-center gap-3"
    >
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className={`${btn} border-black/15 bg-white text-site-text hover:border-site-gold hover:text-site-gold`}
        >
          Prev
        </button>
        {tokens.map((t, i) =>
          t === '…' ? (
            <span
              key={`gap-${i}`}
              aria-hidden
              className="px-1 font-body text-[13px] text-site-text-muted"
            >
              …
            </span>
          ) : (
            <button
              key={t}
              type="button"
              onClick={() => onChange(t)}
              aria-label={`Page ${t}`}
              aria-current={t === page ? 'page' : undefined}
              className={`${btn} ${
                t === page
                  ? 'border-site-gold bg-site-gold text-white'
                  : 'border-black/15 bg-white text-site-text hover:border-site-gold hover:text-site-gold'
              }`}
            >
              {t}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          className={`${btn} border-black/15 bg-white text-site-text hover:border-site-gold hover:text-site-gold`}
        >
          Next
        </button>
      </div>
      <p className="font-body text-[11px] uppercase tracking-[0.14em] text-site-text-muted">
        Page {page.toLocaleString()} of {totalPages.toLocaleString()}
      </p>
    </nav>
  )
}

/** Build the page-number tokens: always 1 and totalPages, plus current ±2,
 *  with '…' marking skipped ranges. */
function pageWindow(current: number, total: number): Array<number | '…'> {
  const span = 2
  const wanted = new Set<number>([1, total, current])
  for (let i = 1; i <= span; i++) {
    wanted.add(current - i)
    wanted.add(current + i)
  }
  const pages = [...wanted]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b)

  const out: Array<number | '…'> = []
  let prev = 0
  for (const p of pages) {
    if (prev && p - prev > 1) out.push('…')
    out.push(p)
    prev = p
  }
  return out
}

function formatPriceShort(price: number): string {
  if (price >= 1_000_000) {
    const m = price / 1_000_000
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(2).replace(/0$/, '')}M`
  }
  if (price >= 1_000) return `$${Math.round(price / 1_000)}k`
  return `$${price}`
}
