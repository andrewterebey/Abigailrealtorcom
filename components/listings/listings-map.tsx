'use client'

import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

export type MapMarker = {
  id: string
  lat: number
  lng: number
  /** Optional label rendered as the marker bubble (e.g. price). Defaults to a plain pin. */
  label?: string
  /** Optional click destination — sets cursor to pointer and pushes via window.location. */
  href?: string
}

type ListingsMapProps = {
  /** Initial center; if markers are provided we recenter to fit them on mount. */
  center: { lat: number; lng: number }
  zoom?: number
  markers?: MapMarker[]
  className?: string
  ariaLabel?: string
}

/**
 * Lightweight Leaflet + OpenStreetMap map. Used by both the IDX search
 * (`/home-search/listings`) for price-bubble markers and by neighborhood
 * detail pages for a single-pin "you are here" map. Loads Leaflet via raw
 * import inside useEffect so SSR doesn't hit `window`.
 */
export function ListingsMap({
  center,
  zoom = 11,
  markers = [],
  className,
  ariaLabel = 'Map',
}: ListingsMapProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let mounted = true
    let map: import('leaflet').Map | null = null

    void (async () => {
      const L = await import('leaflet')
      if (!mounted || !ref.current) return

      map = L.map(ref.current, {
        center: [center.lat, center.lng],
        zoom,
        scrollWheelZoom: false,
        // The default Leaflet attribution control puts a "Leaflet | ..." line
        // in the corner of the map. We render attribution as a small caption
        // below the map instead — still license-compliant, less visual noise.
        attributionControl: false,
      })

      // Carto Voyager — softer palette, gold-friendly cartography. Same OSM
      // data, prettier rendering. Free for non-commercial; for higher traffic
      // we'd swap to Stadia or Mapbox (see CLAUDE.md §2).
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        {
          subdomains: 'abcd',
          maxZoom: 20,
        },
      ).addTo(map)

      if (markers.length === 0) return

      const layer = L.layerGroup().addTo(map)
      const bounds = L.latLngBounds([])

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
        bounds.extend(point)

        const marker = m.label
          ? L.marker(point, {
              icon: L.divIcon({
                className: 'listings-map__price-bubble',
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

      if (markers.length > 1) {
        map.fitBounds(bounds.pad(0.15), { animate: false })
      }
    })()

    return () => {
      mounted = false
      map?.remove()
    }
  }, [center.lat, center.lng, zoom, markers])

  return (
    <div className="flex flex-col">
      <div
        ref={ref}
        role="region"
        aria-label={ariaLabel}
        className={className ?? 'h-[480px] w-full bg-neutral-100'}
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
        contributors &middot;{' '}
        <a
          href="https://carto.com/attributions"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-site-gold"
        >
          CARTO
        </a>
      </p>
    </div>
  )
}
