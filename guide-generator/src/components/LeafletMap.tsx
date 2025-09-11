import { useEffect, useRef } from 'react'
import { loadLeaflet } from '../utils/leafletLoader'
import type { PointInput } from '../utils/geocode'
import { geocodePoints } from '../utils/geocode'

export default function LeafletMap({ homeAddress, points, height = 320 }: { homeAddress?: string; points: PointInput[]; height?: number }) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let map: any
    let cancelled = false
    const run = async () => {
      const L = await loadLeaflet()
      const entries: PointInput[] = []
      if (homeAddress) entries.push({ id: 'home', label: homeAddress, address: homeAddress })
      entries.push(...points)
      const geocoded = await geocodePoints(entries, { contextAddress: homeAddress })
      if (cancelled) return
      if (!containerRef.current || !geocoded.length) return
      map = L.map(containerRef.current)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map)

      const bounds = L.latLngBounds([])
      // Group identical coordinates to avoid overlap, then spread them slightly around the center
      const groups = new Map<string, any[]>()
      geocoded.forEach((p) => {
        const key = `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`
        const arr = groups.get(key) || []
        arr.push(p)
        groups.set(key, arr)
      })

      const jitter = 0.00025
      const placed: Array<{ lat: number; lng: number; p: any }> = []
      groups.forEach((arr) => {
        if (arr.length === 1) {
          placed.push({ lat: arr[0].lat, lng: arr[0].lng, p: arr[0] })
        } else {
          arr.forEach((p, i) => {
            const angle = (2 * Math.PI * i) / arr.length
            placed.push({ lat: p.lat + Math.sin(angle) * jitter, lng: p.lng + Math.cos(angle) * jitter, p })
          })
        }
      })

      placed.forEach(({ lat, lng, p }) => {
        const isHome = p.id === 'home'
        const m = isHome
          ? L.marker([lat, lng], { icon: L.icon({
              iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
              iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
            }) }).addTo(map)
          : L.marker([lat, lng]).addTo(map)
        const content = `<div style=\"font-weight:600\">${p.label}</div>${p.url ? `<a href=\"${p.url}\" target=\"_blank\" rel=\"noreferrer\" style=\"color: var(--accent)\">Ouvrir dans Maps</a>` : ''}`
        m.bindPopup(content)
        bounds.extend([lat, lng])
      })

      if (bounds.isValid()) {
        if (geocoded.length === 1) map.setView(bounds.getCenter(), 15)
        else map.fitBounds(bounds.pad(0.2))
      }
      // map ready
    }
    run()

    return () => {
      cancelled = true
      try { map && map.remove() } catch { /* ignore */ }
    }
  }, [homeAddress, JSON.stringify(points)])

  return <div ref={containerRef} style={{ width: '100%', height }} className="rounded border overflow-hidden" aria-label="Carte" />
}
