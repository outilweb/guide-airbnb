import type { Guide } from '../types'
import { formatPhoneFR, formatTimeDisplay } from './format'
import { GUIDE_SHARE_BASE, BRAND_URL } from '../config'
import type { GeocodedPoint, PointInput } from './geocode'
import { geocodePoints } from './geocode'

type MapPoint = { id: string; label: string; address?: string; mapsUrl?: string }

const HEX_COLOR = /^#[0-9a-f]{3,8}$/i
const MAX_FILENAME_LENGTH = 80

const removeDiacritics = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const slugify = (value: string) => removeDiacritics(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '')

const sanitizeColor = (value: string | undefined, fallback: string) => {
  if (!value) return fallback
  const trimmed = value.trim()
  return HEX_COLOR.test(trimmed) ? trimmed : fallback
}

const sanitizeFont = (value: string | undefined, fallback: string) => {
  if (!value) return fallback
  const cleaned = value.replace(/["<>]/g, '').trim()
  return cleaned.length > 0 ? cleaned : fallback
}

const escapeHtml = (value: string | undefined | null) => {
  if (!value) return ''
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const escapeForScript = (json: string) => json.replace(/</g, '\\u003c')

const computeMapPoints = (guide: Guide): MapPoint[] => {
  const explicit = guide.map?.points || []
  const fromPlaces = (guide.places || []).map((p) => ({
    id: `place-${p.id}`,
    label: p.name,
    address: p.address,
    mapsUrl: p.mapsUrl,
  }))

  const norm = (s?: string) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ')
  const withSrc = [
    ...explicit.map((p) => ({ ...p, __src: 'explicit' as const })),
    ...fromPlaces.map((p) => ({ ...p, __src: 'place' as const })),
  ]

  const result: MapPoint[] = []
  const groupedByAddr = new Map<string, typeof withSrc>()
  const withoutAddr: typeof withSrc = []

  withSrc.forEach((point) => {
    const addr = norm(point.address)
    if (addr) {
      const list = groupedByAddr.get(addr) || []
      list.push(point)
      groupedByAddr.set(addr, list)
    } else {
      withoutAddr.push(point)
    }
  })

  groupedByAddr.forEach((points) => {
    const hasPlace = points.some((p) => p.__src === 'place')
    const kept = hasPlace ? points.filter((p) => p.__src === 'place') : points
    kept.forEach((p) => result.push({ id: p.id, label: p.label, address: p.address, mapsUrl: p.mapsUrl }))
  })

  const seen = new Set<string>()
  withoutAddr.forEach((p) => {
    const key = `${norm(p.label)}||${norm(p.mapsUrl)}`
    if (seen.has(key)) return
    seen.add(key)
    result.push({ id: p.id, label: p.label, address: p.address, mapsUrl: p.mapsUrl })
  })

  return result.filter((point) => {
    const label = (point.label ?? '').trim()
    const address = (point.address ?? '').trim()
    return Boolean(label || address)
  })
}

const STATIC_MAP_MAX_POINTS = 6
const STATIC_MAP_BASE_URL = 'https://staticmap.openstreetmap.de/staticmap.php'

const toDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onloadend = () => {
    if (typeof reader.result === 'string') resolve(reader.result)
    else reject(new Error('Impossible de lire la carte statique'))
  }
  reader.onerror = () => reject(reader.error ?? new Error('Lecture de la carte statique échouée'))
  reader.readAsDataURL(blob)
})

const estimateZoom = (points: GeocodedPoint[]) => {
  if (points.length <= 1) return 15
  let minLat = points[0].lat
  let maxLat = points[0].lat
  let minLng = points[0].lng
  let maxLng = points[0].lng
  points.forEach((point) => {
    if (point.lat < minLat) minLat = point.lat
    if (point.lat > maxLat) maxLat = point.lat
    if (point.lng < minLng) minLng = point.lng
    if (point.lng > maxLng) maxLng = point.lng
  })
  const avgLat = (minLat + maxLat) / 2
  const latSpan = maxLat - minLat
  const lngSpan = (maxLng - minLng) * Math.cos((avgLat * Math.PI) / 180)
  const span = Math.max(latSpan, Math.abs(lngSpan))
  if (span > 5) return 8
  if (span > 2) return 9
  if (span > 1) return 10
  if (span > 0.5) return 11
  if (span > 0.2) return 12
  if (span > 0.08) return 13
  if (span > 0.03) return 14
  return 15
}

const buildStaticMapUrl = (points: GeocodedPoint[]) => {
  if (points.length === 0) return ''
  const subset = points.slice(0, STATIC_MAP_MAX_POINTS)
  const homePoint = points.find((point) => point.id === 'home') ?? points[0]
  const zoom = estimateZoom(points)
  const params = new URLSearchParams({
    center: `${homePoint.lat.toFixed(6)},${homePoint.lng.toFixed(6)}`,
    zoom: String(zoom),
    size: '720x360',
    maptype: 'mapnik',
  })
  subset.forEach((point) => {
    const marker = `${point.lat.toFixed(6)},${point.lng.toFixed(6)},${point.id === 'home' ? 'red-pushpin' : 'lightblue1'}`
    params.append('markers', marker)
  })
  return `${STATIC_MAP_BASE_URL}?${params.toString()}`
}

const fetchStaticMapDataUrl = async (points: GeocodedPoint[]): Promise<string | null> => {
  try {
    if (typeof fetch !== 'function') return null
    const url = buildStaticMapUrl(points)
    if (!url) return null
    const response = await fetch(url, { mode: 'cors' })
    if (!response.ok) return null
    const blob = await response.blob()
    return await toDataUrl(blob)
  } catch (error) {
    console.warn('Capture de la carte statique impossible', error)
    return null
  }
}

const makeFileStem = (meta: { guideId?: string; title?: string }) => {
  const slug = meta.title ? slugify(meta.title) : ''
  const idSegment = meta.guideId ? meta.guideId.slice(0, 8).toLowerCase() : ''
  const parts = [slug, idSegment].filter(Boolean)
  const base = parts.length > 0 ? parts.join('-') : 'guide'
  return base.length > MAX_FILENAME_LENGTH
    ? base.slice(0, MAX_FILENAME_LENGTH)
    : base
}

export function guideFileName(meta: { guideId?: string; title?: string }): string {
  const stem = makeFileStem(meta)
  return `${stem}.html`
}

const resolveShareOrigin = () => {
  if (GUIDE_SHARE_BASE && GUIDE_SHARE_BASE.length > 0) return GUIDE_SHARE_BASE.replace(/\/+$/, '')
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin.replace(/\/+$/, '')
  if (BRAND_URL && BRAND_URL.length > 0) return BRAND_URL.replace(/\/+$/, '')
  return ''
}

export function guideShareUrl(meta: { guideId?: string }) {
  const origin = resolveShareOrigin()
  if (!meta.guideId) return origin
  const normalized = origin.replace(/\/+$/, '')
  if (!normalized) return `#/guide/${meta.guideId}`
  if (normalized.includes('#')) {
    return `${normalized}${normalized.endsWith('/') ? '' : '/'}${meta.guideId}`
  }
  return `${normalized}/#/guide/${meta.guideId}`
}

export function guideShareInfo(meta: { guideId?: string; title?: string }) {
  const fileName = guideFileName(meta)
  const shareUrl = guideShareUrl(meta)
  return { fileName, shareUrl }
}

export function renderGuideHtml(guide: Guide, options?: { geocodedPoints?: GeocodedPoint[]; staticMapDataUrl?: string | null }): string {
  const primary = sanitizeColor(guide.theme?.primary, '#2c3e50')
  const accent = sanitizeColor(guide.theme?.accent, '#3498db')
  const fontHeading = sanitizeFont(guide.theme?.fontHeading, 'Inter')
  const fontBody = sanitizeFont(guide.theme?.fontBody, 'Inter')

  const welcome = guide.theme?.welcomeMessage || ''
  const title = guide.title || 'Guide du logement'
  const address = guide.address || ''
  const homeAddress = (guide.map?.homeAddress || guide.address || '').trim()
  const mapPoints = computeMapPoints(guide)
  const rules = guide.rules || []
  const places = guide.places || []
  const links = guide.links || []

  const geocodedPoints = (options?.geocodedPoints ?? []).filter((point) => typeof point.lat === 'number' && typeof point.lng === 'number')
  const mapData = geocodedPoints.map((point) => ({
    id: point.id,
    label: point.label,
    lat: Number(point.lat.toFixed(6)),
    lng: Number(point.lng.toFixed(6)),
    url: point.url,
    isHome: point.id === 'home'
  }))
  const hasInteractiveMap = mapData.length > 0
  const mapJson = hasInteractiveMap ? escapeForScript(JSON.stringify(mapData)) : ''
  const staticMapDataUrl = options?.staticMapDataUrl || ''
  const hasStaticMapImage = staticMapDataUrl.length > 0
  const googleMapsDirectionsUrl = homeAddress && mapPoints.length > 0
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(homeAddress)}&destination=${encodeURIComponent(homeAddress)}&waypoints=${encodeURIComponent(mapPoints.map((point) => point.address || point.label || '').filter((value) => value && value.trim().length > 0).join('|'))}`
    : ''

  const contactBlocks: string[] = []
  if (guide.contact?.name) contactBlocks.push(`<div><span class="label">Nom</span><span>${escapeHtml(guide.contact.name)}</span></div>`) 
  if (guide.contact?.phone) contactBlocks.push(`<div><span class="label">Téléphone</span><span>${escapeHtml(formatPhoneFR(guide.contact.phone) || guide.contact.phone)}</span></div>`) 
  if (guide.contact?.email) contactBlocks.push(`<div><span class="label">Email</span><span>${escapeHtml(guide.contact.email)}</span></div>`) 

  const stayBlocks: string[] = []
  if (guide.stay?.checkIn && (guide.stay.checkIn.time || guide.stay.checkIn.instructions || guide.stay.checkIn.code)) {
    stayBlocks.push(`
      <div class="card">
        <div class="section-title">🕒 Arrivée</div>
        <div class="stack">
          ${guide.stay.checkIn.time ? `<div><span class="label">Heure</span><span>${escapeHtml(formatTimeDisplay(guide.stay.checkIn.time) || guide.stay.checkIn.time)}</span></div>` : ''}
          ${guide.stay.checkIn.instructions ? `<div><span class="label">Instructions</span><span>${escapeHtml(guide.stay.checkIn.instructions)}</span></div>` : ''}
          ${guide.stay.checkIn.code ? `<div><span class="label">Code d'accès</span><span>${escapeHtml(guide.stay.checkIn.code)}</span></div>` : ''}
        </div>
      </div>
    `)
  }
  if (guide.stay?.checkOut && (guide.stay.checkOut.time || guide.stay.checkOut.checklist)) {
    stayBlocks.push(`
      <div class="card">
        <div class="section-title">🏁 Départ</div>
        <div class="stack">
          ${guide.stay.checkOut.time ? `<div><span class="label">Heure</span><span>${escapeHtml(formatTimeDisplay(guide.stay.checkOut.time) || guide.stay.checkOut.time)}</span></div>` : ''}
          ${guide.stay.checkOut.checklist ? `<div><span class="label">Checklist</span><span>${escapeHtml(guide.stay.checkOut.checklist)}</span></div>` : ''}
        </div>
      </div>
    `)
  }

  const wifiBlock = guide.wifi && (guide.wifi.ssid || guide.wifi.password)
    ? `
      <div class="card">
        <div class="section-title">📶 Wi‑Fi</div>
        <div class="stack">
          ${guide.wifi.ssid ? `<div><span class="label">Nom du réseau</span><span>${escapeHtml(guide.wifi.ssid)}</span></div>` : ''}
          ${guide.wifi.password ? `<div><span class="label">Mot de passe</span><span>${escapeHtml(guide.wifi.password)}</span></div>` : ''}
        </div>
      </div>
    `
    : ''

  const rulesBlock = rules.length > 0
    ? `
      <div class="card">
        <div class="section-title">📋 Règles</div>
        <ul class="list">
          ${rules.map((rule) => `<li>${escapeHtml(rule.text)}</li>`).join('')}
        </ul>
      </div>
    `
    : ''

  const equipmentBlock = guide.equipmentNotes
    ? `
      <section class="block">
        <div class="card">
          <div class="section-title">🧰 Équipements & notes</div>
          <p class="rich">${escapeHtml(guide.equipmentNotes).replace(/\n/g, '<br />')}</p>
        </div>
      </section>
    `
    : ''

  const placesBlock = places.length > 0
    ? `
      <section class="block">
        <div class="card">
          <div class="section-title">🍽️ Recommandations</div>
          <div class="place-stack">
            ${places.map((place) => `
              <article class="place">
                <div class="place-category">${escapeHtml(place.category)}</div>
                <h3 class="place-name">${escapeHtml(place.name || '(Sans nom)')}</h3>
                ${place.description ? `<p class="rich">${escapeHtml(place.description)}</p>` : ''}
                ${place.address ? `<p class="muted">${escapeHtml(place.address)}</p>` : ''}
                ${(place.mapsUrl || place.siteUrl) ? `
                  <p class="links">
                    ${place.mapsUrl ? `<a href="${escapeHtml(place.mapsUrl)}" target="_blank" rel="noreferrer">Google Maps</a>` : ''}
                    ${place.siteUrl ? `<a href="${escapeHtml(place.siteUrl)}" target="_blank" rel="noreferrer">Site web</a>` : ''}
                  </p>
                ` : ''}
              </article>
            `).join('')}
          </div>
        </div>
      </section>
    `
    : ''

  const mapBlock = mapPoints.length > 0 || homeAddress || links.length > 0
    ? `
      <section class="block">
        <div class="card">
          <div class="section-title">🗺️ Carte & liens</div>
          ${(hasInteractiveMap || hasStaticMapImage) ? `
            <div class="map-shell${hasInteractiveMap ? ' map-shell--interactive' : ''}${hasStaticMapImage ? ' map-shell--has-static' : ''}"${hasInteractiveMap ? ' id="guide-map-shell"' : ''}>
              ${hasStaticMapImage ? `<img src="${escapeHtml(staticMapDataUrl)}" alt="Carte des environs" class="map-static" id="guide-map-static" />` : ''}
              ${hasInteractiveMap ? `<div id="guide-map" aria-label="Carte interactive des environs"></div>` : ''}
            </div>
          ` : ''}
          ${homeAddress ? `<p class="map-address">Adresse du logement&nbsp;: ${escapeHtml(homeAddress)}</p>` : ''}
          ${mapPoints.length > 0 ? `
            <ul class="list map-list">
              ${mapPoints.map((point) => `
                <li>
                  <span class="bold">${escapeHtml(point.label || '')}</span>
                  ${point.address ? ` – ${escapeHtml(point.address)}` : ''}
                  ${point.mapsUrl ? ` <a href="${escapeHtml(point.mapsUrl)}" target="_blank" rel="noreferrer">(Maps)</a>` : ''}
                </li>
              `).join('')}
            </ul>
          ` : ''}
          ${(!hasInteractiveMap && hasStaticMapImage) ? `<p class="map-fallback">La carte interactive n'est pas disponible hors connexion. L'image ci-dessus montre l'emplacement des points clés.</p>` : ''}
          ${googleMapsDirectionsUrl ? `<p class="map-tip">Astuce&nbsp;: cliquez sur «&nbsp;Ouvrir la carte avec tous les points&nbsp;» pour voir les marqueurs sur Google Maps.</p>` : ''}
          ${googleMapsDirectionsUrl ? `<a class="map-open" href="${escapeHtml(googleMapsDirectionsUrl)}" target="_blank" rel="noreferrer">Ouvrir la carte avec tous les points</a>` : ''}
          ${links.length > 0 ? `
            <div class="map-links">
              ${links.map((link) => `<a class="map-link" href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label || link.url)}</a>`).join('')}
            </div>
          ` : ''}
        </div>
      </section>
    `
    : ''

  const mapScript = hasInteractiveMap ? `
    <script>
      (function() {
        var DATA = ${mapJson};
        var TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        var started = false;
        function initialiseMap() {
          if (started) return;
          if (typeof window.L === 'undefined') {
            window.setTimeout(initialiseMap, 80);
            return;
          }
          var container = document.getElementById('guide-map');
          if (!container) return;
          started = true;
          var map = window.L.map(container, { scrollWheelZoom: false });
          window.L.tileLayer(TILE_URL, { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
          var bounds = window.L.latLngBounds([]);
          DATA.forEach(function(point) {
            var marker = window.L.marker([point.lat, point.lng]).addTo(map);
            var content = '<strong>' + point.label + '</strong>' + (point.url ? '<br/><a href="' + point.url + '" target="_blank" rel="noreferrer">Ouvrir dans Maps</a>' : '');
            marker.bindPopup(content);
            bounds.extend([point.lat, point.lng]);
          });
          if (bounds.isValid()) {
            if (DATA.length === 1) map.setView(bounds.getCenter(), 15);
            else map.fitBounds(bounds.pad(0.2));
          }
          window.setTimeout(function() { map.invalidateSize(); }, 120);
          var shell = container.parentElement;
          if (shell && shell.classList) shell.classList.add('map-shell--ready');
          var staticImage = document.getElementById('guide-map-static');
          if (staticImage) staticImage.setAttribute('aria-hidden', 'true');
        }
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
          initialiseMap();
        } else {
          window.addEventListener('DOMContentLoaded', initialiseMap, { once: true });
        }
      })();
    </script>
  ` : ''

  const emergenciesBlock = `
    <section class="block">
      <div class="card">
        <div class="section-title">☎️ Urgences</div>
        <div class="emergency-grid">
          ${[
            { code: '112', label: 'Urgences', tone: 'red' },
            { code: '15', label: 'SAMU', tone: 'blue' },
            { code: '18', label: 'Pompiers', tone: 'red' },
            { code: '17', label: 'Police', tone: 'blue' },
          ].map((item) => `
            <div class="emergency-card emergency-card--${item.tone}">
              <div class="emergency-code">${item.code}</div>
              <div class="emergency-label">${item.label}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `

  const nowLabel = new Date(guide.updatedAt || guide.createdAt || Date.now()).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const logo = guide.theme?.logoDataUrl ? `<img class="brand" src="${guide.theme.logoDataUrl}" alt="Logo" />` : ''

  return `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    ${hasInteractiveMap ? `
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-o9N1j7kG61Xf9AKFZ4YkP82LPvfAvX8+bD1t1f0z0SY="
      crossorigin=""
    />
    <script
      defer
      src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      integrity="sha256-o9N1j7kG61Xf9AKFZ4YkP82LPvfAvX8+bD1t1f0z0SY="
      crossorigin=""
    ></script>
    ` : ''}
    <style>
      :root {
        --primary: ${primary};
        --accent: ${accent};
        --font-heading: ${escapeHtml(fontHeading)};
        --font-body: ${escapeHtml(fontBody)};
      }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; font-family: var(--font-body), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1f2937; background: #f9fafb; }
      body { line-height: 1.6; }
      a { color: var(--accent); }
      header { text-align: center; margin-bottom: 32px; }
      header h1 { margin: 0 0 8px; font-family: var(--font-heading), 'Segoe UI', sans-serif; font-size: 2rem; color: var(--primary); }
      header p { margin: 0; color: #4b5563; }
      main { max-width: 960px; margin: 0 auto; padding: 32px 16px 48px; }
      .meta { text-align: center; font-size: 0.85rem; color: #6b7280; margin-bottom: 24px; }
      .block { margin-bottom: 24px; }
      .grid-2 { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
      .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 18px; padding: 24px; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08); }
      .section-title { display: flex; align-items: center; gap: 12px; font-size: 1.125rem; font-weight: 600; color: var(--primary); margin-bottom: 16px; }
      .section-title::after { content: ''; height: 1px; flex: 1; background: rgba(15, 23, 42, 0.1); margin-left: 8px; }
      .stack { display: grid; gap: 8px; font-size: 0.95rem; }
      .stack .label { display: block; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; color: #6b7280; }
      .lead { font-size: 1.1rem; color: #374151; }
      .muted { color: #6b7280; }
      .bold { font-weight: 600; color: #111827; }
      .list { list-style: disc; padding-left: 20px; margin: 0; display: grid; gap: 8px; }
      .map-shell { margin: 16px 0; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.02); background: #f8fafc; position: relative; }
      .map-shell--interactive { height: 320px; }
      .map-shell--interactive #guide-map { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; transition: opacity 0.3s ease; }
      .map-shell--ready #guide-map { opacity: 1; }
      .map-static { display: block; width: 100%; height: auto; }
      .map-shell--interactive .map-static { height: 100%; object-fit: cover; }
      .map-shell--has-static .map-static { transition: opacity 0.3s ease; }
      .map-shell--ready.map-shell--has-static .map-static { opacity: 0; pointer-events: none; }
      #guide-map { width: 100%; height: 100%; min-height: 200px; }
      .map-address { margin: 8px 0 0; font-size: 0.95rem; color: #374151; }
      .map-list { margin-top: 12px; }
      .map-list li { font-size: 0.95rem; color: #1f2937; }
      .map-fallback { margin-top: 12px; font-size: 0.85rem; color: #6b7280; }
      .map-tip { margin-top: 12px; font-size: 0.8rem; color: #6b7280; }
      .map-open { display: inline-block; margin-top: 4px; font-size: 0.9rem; font-weight: 600; text-decoration: underline; color: var(--accent); }
      .map-links { margin-top: 16px; display: flex; flex-wrap: wrap; gap: 12px; }
      .map-link { font-size: 0.9rem; text-decoration: underline; color: var(--accent); }
      .place-stack { display: grid; gap: 16px; }
      .place { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
      .place-category { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; color: var(--accent); }
      .place-name { margin: 4px 0 8px; font-size: 1.05rem; color: #111827; }
      .links { display: flex; flex-wrap: wrap; gap: 12px; font-size: 0.9rem; margin-top: 8px; }
      .rich { white-space: pre-line; }
      .brand { display: block; margin: 0 auto 16px; max-width: 140px; }
      .emergency-grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
      .emergency-card { border-radius: 18px; padding: 28px 20px; text-align: center; border: 1px solid transparent; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4); display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 180px; }
      .emergency-card--red { border-color: rgba(239, 68, 68, 0.25); background: #fef2f2; }
      .emergency-card--blue { border-color: rgba(59, 130, 246, 0.25); background: #eff6ff; }
      .emergency-card--red .emergency-code,
      .emergency-card--red .emergency-label { color: #dc2626; }
      .emergency-card--blue .emergency-code,
      .emergency-card--blue .emergency-label { color: #2563eb; }
      .emergency-code { font-size: 3rem; font-weight: 700; line-height: 1; }
      .emergency-label { margin-top: 8px; font-size: 1.1rem; font-weight: 600; color: #1f2937; }
      footer { text-align: center; font-size: 0.75rem; color: #6b7280; margin-top: 40px; }
      footer a { color: inherit; text-decoration: none; }
      footer a:hover { text-decoration: underline; }
      @media (max-width: 640px) {
        header h1 { font-size: 1.6rem; }
        .card { padding: 20px; border-radius: 16px; }
      }
    </style>
  </head>
  <body>
    <main>
      ${logo}
      <header>
        <h1>${escapeHtml(welcome || title)}</h1>
        ${welcome ? `<p>${escapeHtml(title)}</p>` : address ? `<p>${escapeHtml(address)}</p>` : ''}
      </header>
      <p class="meta">Dernière mise à jour : ${escapeHtml(nowLabel)}</p>
      <section class="block">
        <div class="grid-2">
          <div class="card">
            <div class="section-title">🏠 Adresse</div>
            <p class="lead">${escapeHtml(title)}</p>
            ${address ? `<p class="muted">${escapeHtml(address)}</p>` : ''}
          </div>
          ${contactBlocks.length > 0 ? `
            <div class="card">
              <div class="section-title">👤 Contact</div>
              <div class="stack">${contactBlocks.join('')}</div>
            </div>
          ` : ''}
        </div>
      </section>
      ${stayBlocks.length > 0 ? `<section class="block"><div class="grid-2">${stayBlocks.join('')}</div></section>` : ''}
      ${wifiBlock || rulesBlock ? `<section class="block"><div class="grid-2">${wifiBlock}${rulesBlock}</div></section>` : ''}
      ${equipmentBlock}
      ${placesBlock}
      ${mapBlock}
      ${emergenciesBlock}
      <footer>
        Guide exporté depuis l'application Guide Airbnb.
      </footer>
    </main>
    ${mapScript}
  </body>
</html>`
}

export async function createGuideHtmlBlob(guide: Guide) {
  const fileName = guideFileName({ guideId: guide.guideId, title: guide.title })
  let geocoded: GeocodedPoint[] = []
  let staticMapDataUrl: string | null = null
  try {
    const inputs: PointInput[] = []
    const homeAddress = guide.map?.homeAddress || guide.address || ''
    if (homeAddress.trim().length > 0) {
      inputs.push({ id: 'home', label: guide.title || 'Logement', address: homeAddress })
    }
    computeMapPoints(guide).forEach((point) => {
      const label = point.label && point.label.trim().length > 0 ? point.label : (point.address || "Point d'intérêt")
      inputs.push({ id: point.id, label, address: point.address, mapsUrl: point.mapsUrl })
    })
    if (inputs.length > 0) {
      geocoded = await geocodePoints(inputs, { contextAddress: homeAddress })
      if (geocoded.length > 0) {
        staticMapDataUrl = await fetchStaticMapDataUrl(geocoded)
      }
    }
  } catch (error) {
    console.error('Impossible de géocoder les points du guide exporté', error)
  }

  const html = renderGuideHtml(guide, { geocodedPoints: geocoded, staticMapDataUrl })
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  return { fileName, blob }
}

export async function downloadGuideHtml(guide: Guide): Promise<string> {
  const { fileName, blob } = await createGuideHtmlBlob(guide)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return fileName
}
