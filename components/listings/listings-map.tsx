'use client'

import { useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import type { MapBounds } from '@/types/listing'

export type MapMarker = {
  id: string
  lat: number
  lng: number
  /** Optional label rendered as the marker bubble (e.g. price). Defaults to a plain pin. */
  label?: string
  /** Optional click destination — sets cursor to pointer and pushes via window.location. */
  href?: string
  /** When true (Pending/Sold = "Non-Active"), render the marker in a distinct
   *  color, per NWMLS Data Use Policy §E.5 (the map must distinguish Non-Active
   *  listings from Active ones). Active/Contingent markers stay the default. */
  inactive?: boolean
}

export type { MapBounds }

// Read via the literal process.env member so Next inlines it at build time.
const CARTO_KEY = process.env.NEXT_PUBLIC_CARTO_API_KEY || ''

type ListingsMapProps = {
  /** Initial center; if markers are provided we recenter to fit them on mount. */
  center: { lat: number; lng: number }
  zoom?: number
  markers?: MapMarker[]
  className?: string
  ariaLabel?: string
  /** Viewport the map should open on. While set, the map stops auto-fitting to
   *  its markers (the user is driving). `null` = fit to markers. */
  bounds?: MapBounds | null
  /** Called (debounced) after the USER pans or zooms. Programmatic fits never
   *  trigger it, so a consumer can refetch for the new viewport without a
   *  fetch → markers → fit → fetch loop. */
  onBoundsChange?: (bounds: MapBounds) => void
}

type LeafletMap = import('leaflet').Map
type LeafletNS = typeof import('leaflet')

// How long the map must be still before a user move is reported.
const MOVE_DEBOUNCE_MS = 300

/**
 * Lightweight Leaflet map (CARTO Voyager tiles, OSM fallback). Used by the IDX
 * search (`/home-search/listings`) for price-bubble markers that follow the
 * viewport, and by neighborhood detail pages for a single-pin "you are here"
 * map. Loads Leaflet via raw import inside useEffect so SSR doesn't hit
 * `window`. The map instance is created once per mount; markers are swapped
 * in a separate effect so refetches never rebuild (or re-center) the map.
 */
export function ListingsMap({
  center,
  zoom = 11,
  markers = [],
  className,
  ariaLabel = 'Map',
  bounds = null,
  onBoundsChange,
}: ListingsMapProps) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const leafletRef = useRef<LeafletNS | null>(null)
  const layerRef = useRef<import('leaflet').LayerGroup | null>(null)
  const [ready, setReady] = useState(false)

  // Latest props, readable from the long-lived Leaflet event handler.
  const onBoundsChangeRef = useRef(onBoundsChange)
  onBoundsChangeRef.current = onBoundsChange
  const userDrivenRef = useRef(bounds !== null)
  userDrivenRef.current = bounds !== null
  const initialBoundsRef = useRef(bounds)
  // View we last set ourselves (fitBounds). A `moveend` that leaves the map on
  // exactly this view was ours, not the user's, and must not refetch.
  const programmaticViewRef = useRef<{ lat: number; lng: number; zoom: number } | null>(null)

  const recordProgrammaticView = (map: LeafletMap) => {
    const c = map.getCenter()
    programmaticViewRef.current = { lat: c.lat, lng: c.lng, zoom: map.getZoom() }
  }

  // Create the map once per mount.
  useEffect(() => {
    let mounted = true
    let resizeObserver: ResizeObserver | null = null
    let timer: number | undefined

    void (async () => {
      const L = await import('leaflet')
      if (!mounted || !ref.current) return
      leafletRef.current = L

      const map = L.map(ref.current, {
        center: [center.lat, center.lng],
        zoom,
        scrollWheelZoom: false,
        // The default Leaflet attribution control puts a "Leaflet | ..." line
        // in the corner of the map. We render attribution as a small caption
        // below the map instead — still license-compliant, less visual noise.
        attributionControl: false,
      })
      mapRef.current = map

      // Recompute the tile pyramid whenever the container resizes — without
      // this, opening the nav popout (or any other layout shift after init)
      // leaves Leaflet rendering tiles at stale dimensions, producing white
      // gridline gaps and a wrong-zoom view.
      resizeObserver = new ResizeObserver(() => {
        map.invalidateSize()
      })
      resizeObserver.observe(ref.current)

      // Basemap tiles. CARTO Voyager (softer palette, gold-friendly
      // cartography, same OSM data) requires an API key since 2026-09: a
      // keyless request still returns HTTP 200, but the PNG is an "API KEY
      // REQUIRED" watermark. The free commercial tier covers 1M requests per
      // month — request a key at https://carto.com/basemaps/apikey and set
      // NEXT_PUBLIC_CARTO_API_KEY (public by design; the key only identifies
      // the site). Without a key we fall back to the OSM standard tile layer:
      // best-effort, no SLA, acceptable for a low-traffic site but not a
      // production plan (https://operations.osmfoundation.org/policies/tiles/).
      const tiles = CARTO_KEY
        ? {
            url: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(CARTO_KEY)}`,
            options: { subdomains: 'abcd', maxZoom: 20 },
          }
        : {
            url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            options: { maxZoom: 19 },
          }
      L.tileLayer(tiles.url, tiles.options).addTo(map)

      layerRef.current = L.layerGroup().addTo(map)

      // Report user-driven moves (drag, zoom buttons, double-click, pinch).
      // `moveend` also fires after our own fitBounds calls; those are filtered
      // out by comparing against the view we recorded when we set it.
      map.on('moveend', () => {
        window.clearTimeout(timer)
        timer = window.setTimeout(() => {
          if (!mapRef.current) return
          const cb = onBoundsChangeRef.current
          if (!cb) return
          const p = programmaticViewRef.current
          const c = map.getCenter()
          if (
            p &&
            p.zoom === map.getZoom() &&
            Math.abs(p.lat - c.lat) < 1e-9 &&
            Math.abs(p.lng - c.lng) < 1e-9
          ) {
            return
          }
          const b = map.getBounds()
          cb({
            south: b.getSouth(),
            west: b.getWest(),
            north: b.getNorth(),
            east: b.getEast(),
          })
        }, MOVE_DEBOUNCE_MS)
      })

      // Re-mounting mid-search (e.g. toggling list/split/map view) reopens
      // the viewport the user was looking at.
      const ib = initialBoundsRef.current
      if (ib) {
        map.fitBounds(
          [
            [ib.south, ib.west],
            [ib.north, ib.east],
          ],
          { animate: false },
        )
        recordProgrammaticView(map)
      }

      setReady(true)
    })()

    return () => {
      mounted = false
      window.clearTimeout(timer)
      resizeObserver?.disconnect()
      mapRef.current?.remove()
      mapRef.current = null
      layerRef.current = null
      setReady(false)
    }
    // center/zoom only seed the initial view; later changes must not rebuild
    // the map (that would throw away the user's viewport).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Swap markers whenever they change. Auto-fit only while the user hasn't
  // taken over the viewport.
  useEffect(() => {
    const L = leafletRef.current
    const map = mapRef.current
    const layer = layerRef.current
    if (!ready || !L || !map || !layer) return

    layer.clearLayers()
    const fit = L.latLngBounds([])

    // Custom pin SVG used when no price-bubble label is provided. Built as
    // a divIcon so we don't rely on Leaflet's bundled marker images, which
    // don't resolve under Turbopack (404 on marker-icon.png + shadow).
    const pinHtml = `
      <svg viewBox="0 0 32 44" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M16 1c8.3 0 15 6.7 15 15 0 11-15 27-15 27S1 27 1 16C1 7.7 7.7 1 16 1Z"
              fill="#DEAB33" stroke="#7A5912" stroke-width="1.25"/>
        <circle cx="16" cy="16" r="5.5" fill="#fff"/>
      </svg>`

    for (const m of markers) {
      const point: import('leaflet').LatLngExpression = [m.lat, m.lng]
      fit.extend(point)

      const marker = m.label
        ? L.marker(point, {
            icon: L.divIcon({
              className: `listings-map__price-bubble${m.inactive ? ' listings-map__price-bubble--inactive' : ''}`,
              html: `<span>${m.label}</span>`,
              iconSize: [70, 28],
              iconAnchor: [35, 28],
            }),
          })
        : L.marker(point, {
            icon: L.divIcon({
              className: 'listings-map__pin',
              html: pinHtml,
              iconSize: [32, 44],
              iconAnchor: [16, 44],
            }),
          })

      marker.addTo(layer)
      if (m.href) {
        marker.on('click', () => {
          window.location.assign(m.href!)
        })
      }
    }

    if (!userDrivenRef.current && markers.length > 1) {
      map.fitBounds(fit.pad(0.15), { animate: false })
      recordProgrammaticView(map)
    }
  }, [markers, ready])

  return (
    // Outer wrapper inherits the consumer's sizing (e.g. h-full from
    // home-search's split pane, h-[400px] from the neighborhood detail).
    // Inner ref div is flex-1 so the map fills the available height after
    // the small attribution caption.
    <div className={`flex flex-col ${className ?? 'h-[480px] w-full'}`}>
      <div
        ref={ref}
        role="region"
        aria-label={ariaLabel}
        className="w-full min-h-0 flex-1 bg-neutral-100"
      />
      {/* License-required attribution. Kept small and below the map per
          CLAUDE.md §10 (legal text is non-negotiable, but presentation is). */}
      <p className="mt-2 text-right font-body text-[10px] leading-tight text-site-text-muted">
        Map data &copy;{' '}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-site-gold"
        >
          OpenStreetMap
        </a>{' '}
        contributors
        {CARTO_KEY && (
          <>
            {' '}
            &middot;{' '}
            <a
              href="https://carto.com/attributions"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-site-gold"
            >
              CARTO
            </a>
          </>
        )}
        {process.env.NEXT_PUBLIC_IDX_NWMLS === 'true' && (
          <> &middot; IDX data courtesy of NWMLS</>
        )}
      </p>
    </div>
  )
}
