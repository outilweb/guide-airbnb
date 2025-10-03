import type { Guide } from '../types'
import { formatPhoneFR, formatTimeDisplay } from './format'
import { GUIDE_SHARE_BASE } from '../config'

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

export function guideShareUrlFromFileName(fileName: string): string {
  if (!fileName) return ''
  const base = GUIDE_SHARE_BASE && GUIDE_SHARE_BASE.length > 0
    ? GUIDE_SHARE_BASE
    : (typeof window !== 'undefined' && window.location?.origin ? window.location.origin.replace(/\/+$/, '') : '')
  return base ? `${base}/${fileName}` : fileName
}

export function guideShareInfo(meta: { guideId?: string; title?: string }) {
  const fileName = guideFileName(meta)
  const shareUrl = guideShareUrlFromFileName(fileName)
  return { fileName, shareUrl }
}

export function renderGuideHtml(guide: Guide): string {
  const primary = sanitizeColor(guide.theme?.primary, '#2c3e50')
  const accent = sanitizeColor(guide.theme?.accent, '#3498db')
  const fontHeading = sanitizeFont(guide.theme?.fontHeading, 'Inter')
  const fontBody = sanitizeFont(guide.theme?.fontBody, 'Inter')

  const welcome = guide.theme?.welcomeMessage || ''
  const title = guide.title || 'Guide du logement'
  const address = guide.address || ''
  const mapPoints = computeMapPoints(guide)
  const rules = guide.rules || []
  const places = guide.places || []
  const links = guide.links || []

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

  const mapBlock = mapPoints.length > 0 || guide.map?.homeAddress || links.length > 0
    ? `
      <section class="block">
        <div class="card">
          <div class="section-title">🗺️ Accès & environs</div>
          ${guide.map?.homeAddress ? `<p class="muted">Adresse du logement : ${escapeHtml(guide.map.homeAddress)}</p>` : ''}
          ${mapPoints.length > 0 ? `
            <ul class="list">
              ${mapPoints.map((point) => `
                <li>
                  <span class="bold">${escapeHtml(point.label || '')}</span>
                  ${point.address ? ` – ${escapeHtml(point.address)}` : ''}
                  ${point.mapsUrl ? ` <a href="${escapeHtml(point.mapsUrl)}" target="_blank" rel="noreferrer">(Itinéraire)</a>` : ''}
                </li>
              `).join('')}
            </ul>
          ` : ''}
          ${links.length > 0 ? `
            <div class="badge-row">
              ${links.map((link) => `<a class="badge" href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label || link.url)}</a>`).join('')}
            </div>
          ` : ''}
        </div>
      </section>
    `
    : ''

  const emergenciesBlock = `
    <section class="block">
      <div class="card">
        <div class="section-title">☎️ Numéros d'urgence</div>
        <div class="emergency-grid">
          ${[
            { code: '112', label: 'Urgences européennes' },
            { code: '15', label: 'SAMU' },
            { code: '18', label: 'Pompiers' },
            { code: '17', label: 'Police' },
          ].map((item) => `
            <div class="emergency-card">
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
      .badge-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
      .badge { display: inline-flex; align-items: center; padding: 6px 12px; background: rgba(52, 152, 219, 0.12); border-radius: 999px; font-size: 0.8rem; text-decoration: none; }
      .place-stack { display: grid; gap: 16px; }
      .place { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
      .place-category { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; color: var(--accent); }
      .place-name { margin: 4px 0 8px; font-size: 1.05rem; color: #111827; }
      .links { display: flex; flex-wrap: wrap; gap: 12px; font-size: 0.9rem; margin-top: 8px; }
      .rich { white-space: pre-line; }
      .brand { display: block; margin: 0 auto 16px; max-width: 140px; }
      .emergency-grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
      .emergency-card { border: 1px solid rgba(239, 68, 68, 0.2); background: rgba(254, 242, 242, 0.8); border-radius: 14px; padding: 20px; text-align: center; }
      .emergency-code { font-size: 2.5rem; font-weight: 700; color: #dc2626; }
      .emergency-label { margin-top: 4px; font-weight: 600; color: #991b1b; }
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
  </body>
</html>`
}

export function createGuideHtmlBlob(guide: Guide) {
  const html = renderGuideHtml(guide)
  const fileName = guideFileName({ guideId: guide.guideId, title: guide.title })
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  return { fileName, blob }
}

export function downloadGuideHtml(guide: Guide): string {
  const { fileName, blob } = createGuideHtmlBlob(guide)
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
