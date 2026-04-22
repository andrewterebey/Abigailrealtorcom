'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useTransition } from 'react'

const CITIES = [
  'Bellevue',
  'Seattle',
  'Kirkland',
  'Newcastle',
  'Shoreline',
  'Renton',
] as const

const PROPERTY_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'single-family', label: 'Single Family' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'multi-family', label: 'Multi-family' },
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

const fieldClass =
  'h-11 w-full border border-black/15 bg-white px-3 font-body text-[13px] uppercase tracking-[0.08em] text-site-text focus:border-site-gold focus:outline-none'
const labelClass =
  'mb-1 block font-body text-[11px] font-bold uppercase tracking-[0.14em] text-site-text-muted'

export function ListingFilters() {
  const router = useRouter()
  const params = useSearchParams()
  const [isPending, startTransition] = useTransition()

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

  const onChange = (key: keyof typeof current) =>
    (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
      pushParams({ ...current, [key]: e.target.value })
    }

  const clearAll = () => {
    startTransition(() => {
      router.replace('?', { scroll: false })
    })
  }

  return (
    <form
      aria-label="Listing filters"
      className="grid grid-cols-2 gap-4 border border-black/10 bg-white p-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7"
      onSubmit={(e) => e.preventDefault()}
    >
      <div>
        <label htmlFor="f-city" className={labelClass}>City</label>
        <select
          id="f-city"
          name="city"
          value={current.city}
          onChange={onChange('city')}
          className={fieldClass}
        >
          <option value="">All Cities</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="f-min-price" className={labelClass}>Min Price</label>
        <input
          id="f-min-price"
          name="min_price"
          type="number"
          inputMode="numeric"
          min={0}
          step={50000}
          placeholder="Any"
          value={current.min_price}
          onChange={onChange('min_price')}
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="f-max-price" className={labelClass}>Max Price</label>
        <input
          id="f-max-price"
          name="max_price"
          type="number"
          inputMode="numeric"
          min={0}
          step={50000}
          placeholder="Any"
          value={current.max_price}
          onChange={onChange('max_price')}
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="f-beds" className={labelClass}>Min Beds</label>
        <select
          id="f-beds"
          name="min_beds"
          value={current.min_beds}
          onChange={onChange('min_beds')}
          className={fieldClass}
        >
          {BED_CHOICES.map((b) => (
            <option key={b || 'any'} value={b}>
              {b ? `${b}+` : 'Any'}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="f-baths" className={labelClass}>Min Baths</label>
        <select
          id="f-baths"
          name="min_baths"
          value={current.min_baths}
          onChange={onChange('min_baths')}
          className={fieldClass}
        >
          {BATH_CHOICES.map((b) => (
            <option key={b || 'any'} value={b}>
              {b ? `${b}+` : 'Any'}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="f-type" className={labelClass}>Type</label>
        <select
          id="f-type"
          name="property_type"
          value={current.property_type}
          onChange={onChange('property_type')}
          className={fieldClass}
        >
          {PROPERTY_TYPES.map((p) => (
            <option key={p.value || 'any'} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="f-status" className={labelClass}>Status</label>
        <select
          id="f-status"
          name="status"
          value={current.status}
          onChange={onChange('status')}
          className={fieldClass}
        >
          {STATUSES.map((s) => (
            <option key={s.value || 'any'} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="col-span-2 flex items-end md:col-span-3 lg:col-span-4 xl:col-span-7">
        <div className="ml-auto flex items-center gap-3">
          <span
            aria-live="polite"
            className="font-body text-[11px] uppercase tracking-[0.14em] text-site-text-muted"
          >
            {isPending ? 'Updating…' : ''}
          </span>
          <button
            type="button"
            onClick={clearAll}
            className="border border-black/15 bg-white px-5 py-2 font-body text-[12px] font-bold uppercase tracking-[0.14em] text-site-text hover:border-site-gold hover:text-site-gold"
          >
            Reset
          </button>
        </div>
      </div>
    </form>
  )
}
