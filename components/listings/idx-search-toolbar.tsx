'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useState, useTransition } from 'react'
import { Popover } from '@base-ui/react/popover'
import { ChevronDown, Search } from 'lucide-react'

const CITIES = [
  'Bellevue',
  'Seattle',
  'Kirkland',
  'Newcastle',
  'Shoreline',
  'Renton',
] as const

const PROPERTY_TYPES = [
  { value: '', label: 'All Property Types' },
  { value: 'single-family', label: 'Single Family' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'multi-family', label: 'Multi-Family' },
  { value: 'land', label: 'Land' },
] as const

const STATUSES = [
  { value: '', label: 'Any Status' },
  { value: 'for-sale', label: 'For Sale' },
  { value: 'pending', label: 'Pending' },
  { value: 'sold', label: 'Sold' },
] as const

const BED_CHOICES = ['', '1', '2', '3', '4', '5'] as const
const BATH_CHOICES = ['', '1', '2', '3', '4'] as const

type View = 'split' | 'list' | 'map'

type ToolbarProps = {
  view: View
  onViewChange: (v: View) => void
  /** Total result count, rendered as feedback under the toolbar.
   *  Owned by the parent so the toolbar doesn't refetch on its own. */
  total?: number
  loading?: boolean
}

export function IdxSearchToolbar({
  view,
  onViewChange,
  total,
  loading,
}: ToolbarProps) {
  const router = useRouter()
  const params = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [searchInput, setSearchInput] = useState(() => params.get('city') ?? '')
  const [savedFlash, setSavedFlash] = useState(false)

  const current = useMemo(
    () => ({
      city: params.get('city') ?? '',
      min_price: params.get('min_price') ?? '',
      max_price: params.get('max_price') ?? '',
      min_beds: params.get('min_beds') ?? '',
      min_baths: params.get('min_baths') ?? '',
      property_type: params.get('property_type') ?? '',
      status: params.get('status') ?? '',
    }),
    [params],
  )

  const pushParams = useCallback(
    (next: Record<string, string>) => {
      const usp = new URLSearchParams()
      for (const [k, v] of Object.entries(next)) {
        if (v) usp.set(k, v)
      }
      const qs = usp.toString()
      startTransition(() => {
        router.replace(qs ? `?${qs}` : '?', { scroll: false })
      })
    },
    [router],
  )

  const set = (key: keyof typeof current, value: string) =>
    pushParams({ ...current, [key]: value })

  const clearAll = () => {
    setSearchInput('')
    startTransition(() => router.replace('?', { scroll: false }))
  }

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const v = searchInput.trim()
    // Heuristic: if the user typed one of our known cities verbatim, treat
    // it as a city filter; otherwise leave the filters alone (free-text
    // search over address/zip is a real-IDX feature we don't model yet).
    const hit = CITIES.find((c) => c.toLowerCase() === v.toLowerCase())
    pushParams({ ...current, city: hit ?? '' })
  }

  const onSaveSearch = () => {
    // Without auth there's nowhere to persist a saved search yet, so we
    // just flash the URL into clipboard so the agent can paste/share it.
    // Real IDX wiring will swap this for a POST to /api/saved-searches.
    if (typeof window !== 'undefined') {
      void navigator.clipboard?.writeText(window.location.href)
      setSavedFlash(true)
      window.setTimeout(() => setSavedFlash(false), 1800)
    }
  }

  const statusLabel =
    STATUSES.find((s) => s.value === current.status)?.label ?? 'Any Status'
  const typeLabel =
    PROPERTY_TYPES.find((p) => p.value === current.property_type)?.label ??
    'All Property Types'
  const priceLabel = formatPriceRange(current.min_price, current.max_price)
  const bedsLabel = current.min_beds ? `${current.min_beds}+ beds` : 'All Beds'
  const bathsLabel = current.min_baths
    ? `${current.min_baths}+ baths`
    : 'All Baths'

  return (
    <div className="border-b border-black/10 bg-white">
      <div className="flex flex-wrap items-center gap-3 px-5 py-3 lg:gap-4 lg:px-6 lg:py-4">
        <form
          onSubmit={onSearchSubmit}
          className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-black/15 bg-white px-4 lg:max-w-sm"
        >
          <Search aria-hidden className="size-4 shrink-0 text-site-text-muted" />
          <input
            type="search"
            placeholder="City, neighborhood, ZIP code…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-transparent font-body text-[13px] text-site-text placeholder:text-site-text-muted focus:outline-none"
            aria-label="Search by city, neighborhood, or ZIP"
          />
        </form>

        <ChipFilter active={!!current.status} label={statusLabel}>
          <RadioList
            name="status"
            value={current.status}
            options={STATUSES}
            onChange={(v) => set('status', v)}
          />
        </ChipFilter>

        <ChipFilter
          active={!!(current.min_price || current.max_price)}
          label={priceLabel}
        >
          <PriceRange
            min={current.min_price}
            max={current.max_price}
            onApply={(min, max) =>
              pushParams({ ...current, min_price: min, max_price: max })
            }
          />
        </ChipFilter>

        <ChipFilter active={!!current.property_type} label={typeLabel}>
          <RadioList
            name="property_type"
            value={current.property_type}
            options={PROPERTY_TYPES}
            onChange={(v) => set('property_type', v)}
          />
        </ChipFilter>

        <ChipFilter active={!!current.min_beds} label={bedsLabel}>
          <PlusList
            value={current.min_beds}
            options={BED_CHOICES}
            onChange={(v) => set('min_beds', v)}
            unit="beds"
          />
        </ChipFilter>

        <ChipFilter active={!!current.min_baths} label={bathsLabel}>
          <PlusList
            value={current.min_baths}
            options={BATH_CHOICES}
            onChange={(v) => set('min_baths', v)}
            unit="baths"
          />
        </ChipFilter>

        <div className="ml-auto flex items-center gap-2">
          <ViewToggle view={view} onChange={onViewChange} />
          <button
            type="button"
            onClick={clearAll}
            className="hidden h-10 items-center justify-center rounded-full border border-black/15 px-4 font-body text-[12px] font-bold uppercase tracking-[0.14em] text-site-text hover:border-site-gold hover:text-site-gold lg:inline-flex"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onSaveSearch}
            className="inline-flex h-10 items-center justify-center rounded-full bg-black px-5 font-body text-[12px] font-bold uppercase tracking-[0.14em] text-white hover:bg-site-gold"
          >
            {savedFlash ? 'Link Copied' : 'Save Search'}
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-black/5 px-5 py-2.5 lg:px-6">
        <p className="font-body text-[12px] uppercase tracking-[0.14em] text-site-text-muted">
          {loading || isPending
            ? 'Searching…'
            : typeof total === 'number'
            ? `${total} result${total === 1 ? '' : 's'}`
            : ''}
        </p>
        {hasAnyFilter(current) ? (
          <button
            type="button"
            onClick={clearAll}
            className="font-body text-[11px] font-bold uppercase tracking-[0.14em] text-site-text-muted underline-offset-4 hover:text-site-gold hover:underline"
          >
            Reset filters
          </button>
        ) : null}
      </div>
    </div>
  )
}

function hasAnyFilter(c: Record<string, string>) {
  return Object.values(c).some(Boolean)
}

function formatPriceRange(min: string, max: string) {
  if (!min && !max) return 'Any Price'
  const fmt = (v: string) => {
    const n = Number.parseInt(v, 10)
    if (!Number.isFinite(n) || n <= 0) return ''
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
    if (n >= 1_000) return `$${Math.round(n / 1_000)}k`
    return `$${n}`
  }
  if (min && max) return `${fmt(min)} – ${fmt(max)}`
  if (min) return `${fmt(min)}+`
  return `Up to ${fmt(max)}`
}

function ChipFilter({
  active,
  label,
  children,
}: {
  active: boolean
  label: string
  children: React.ReactNode
}) {
  return (
    <Popover.Root>
      <Popover.Trigger
        className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-4 font-body text-[12px] font-bold uppercase tracking-[0.12em] transition-colors ${
          active
            ? 'border-site-gold bg-site-gold/10 text-site-text'
            : 'border-black/15 bg-white text-site-text hover:border-site-gold hover:text-site-gold'
        }`}
      >
        <span className="truncate">{label}</span>
        <ChevronDown aria-hidden className="size-3.5" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8}>
          <Popover.Popup className="z-50 min-w-[220px] origin-top rounded-md border border-black/10 bg-white p-3 text-site-text shadow-xl">
            {children}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

function RadioList({
  name,
  value,
  options,
  onChange,
}: {
  name: string
  value: string
  options: ReadonlyArray<{ value: string; label: string }>
  onChange: (v: string) => void
}) {
  return (
    <ul className="flex flex-col gap-1">
      {options.map((o) => {
        const id = `${name}-${o.value || 'any'}`
        return (
          <li key={id}>
            <label
              htmlFor={id}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 font-body text-[13px] hover:bg-site-gold/10"
            >
              <input
                id={id}
                type="radio"
                name={name}
                value={o.value}
                checked={value === o.value}
                onChange={() => onChange(o.value)}
                className="accent-site-gold"
              />
              {o.label}
            </label>
          </li>
        )
      })}
    </ul>
  )
}

function PlusList({
  value,
  options,
  onChange,
  unit,
}: {
  value: string
  options: ReadonlyArray<string>
  onChange: (v: string) => void
  unit: string
}) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const isAny = opt === ''
        const isSelected = value === opt
        return (
          <li key={opt || 'any'}>
            <button
              type="button"
              onClick={() => onChange(opt)}
              className={`inline-flex h-9 min-w-[44px] items-center justify-center rounded-full border px-3 font-body text-[12px] font-bold uppercase tracking-[0.1em] ${
                isSelected
                  ? 'border-site-gold bg-site-gold text-white'
                  : 'border-black/15 bg-white text-site-text hover:border-site-gold'
              }`}
              aria-label={isAny ? `Any ${unit}` : `${opt} or more ${unit}`}
            >
              {isAny ? 'Any' : `${opt}+`}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function PriceRange({
  min,
  max,
  onApply,
}: {
  min: string
  max: string
  onApply: (min: string, max: string) => void
}) {
  const [draftMin, setDraftMin] = useState(min)
  const [draftMax, setDraftMax] = useState(max)
  const cls =
    'h-10 w-full rounded border border-black/15 bg-white px-3 font-body text-[13px] focus:border-site-gold focus:outline-none'
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onApply(draftMin, draftMax)
      }}
      className="flex w-[260px] flex-col gap-3"
    >
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={50000}
          placeholder="Min"
          value={draftMin}
          onChange={(e) => setDraftMin(e.target.value)}
          className={cls}
          aria-label="Minimum price"
        />
        <span aria-hidden className="text-site-text-muted">–</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={50000}
          placeholder="Max"
          value={draftMax}
          onChange={(e) => setDraftMax(e.target.value)}
          className={cls}
          aria-label="Maximum price"
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            setDraftMin('')
            setDraftMax('')
            onApply('', '')
          }}
          className="font-body text-[12px] font-bold uppercase tracking-[0.14em] text-site-text-muted hover:text-site-gold"
        >
          Reset
        </button>
        <button
          type="submit"
          className="h-9 rounded-full bg-site-gold px-4 font-body text-[12px] font-bold uppercase tracking-[0.14em] text-white hover:bg-site-gold-dim"
        >
          Apply
        </button>
      </div>
    </form>
  )
}

function ViewToggle({
  view,
  onChange,
}: {
  view: View
  onChange: (v: View) => void
}) {
  const segs: Array<{ value: View; label: string }> = [
    { value: 'list', label: 'List' },
    { value: 'split', label: 'Split' },
    { value: 'map', label: 'Map' },
  ]
  return (
    <div
      role="tablist"
      aria-label="View mode"
      className="hidden h-10 items-center rounded-full border border-black/15 bg-white p-1 md:inline-flex"
    >
      {segs.map((s) => (
        <button
          key={s.value}
          role="tab"
          aria-selected={view === s.value}
          type="button"
          onClick={() => onChange(s.value)}
          className={`h-8 rounded-full px-3 font-body text-[11px] font-bold uppercase tracking-[0.14em] transition-colors ${
            view === s.value
              ? 'bg-black text-white'
              : 'text-site-text-muted hover:text-site-text'
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}
