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
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      if (markers.length === 0) return

      const layer = L.layerGroup().addTo(map)
      const bounds = L.latLngBounds([])

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
          : L.marker(point)

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
    <div
      ref={ref}
      role="region"
      aria-label={ariaLabel}
      className={className ?? 'h-[480px] w-full bg-neutral-100'}
    />
  )
}
