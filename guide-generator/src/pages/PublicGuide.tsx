import { useEffect, useState } from 'react'
// emojis utilisés dans les titres de section
import { useParams } from 'react-router-dom'
import { loadPublished } from '../utils/storage'
import type { Guide } from '../types'
import LeafletMap from '../components/LeafletMap'

export default function PublicGuide() {
  const { guideId } = useParams()
  const [guide, setGuide] = useState<Guide | null>(null)
  useEffect(() => { if (guideId) setGuide(loadPublished(guideId) || null) }, [guideId])

  useEffect(() => {
    if (guide) {
      document.documentElement.style.setProperty('--primary', guide.theme.primary)
      document.documentElement.style.setProperty('--accent', guide.theme.accent)
      document.documentElement.style.setProperty('--font-heading', guide.theme.fontHeading)
      document.documentElement.style.setProperty('--font-body', guide.theme.fontBody)
    }
  }, [guide])

  if (!guide) return <div className="max-w-5xl mx-auto px-4 py-6">Guide introuvable.</div>

  const homeAddress = guide.map.homeAddress || guide.address || ''
  // Combine explicit map points with recommendations.
  // If explicit and recommendation share the same address, keep only the recommendation(s).
  const mapPoints = (() => {
    const explicit = guide.map.points || []
    const fromPlaces = (guide.places || []).map(p => ({ id: `place-${p.id}`, label: p.name, address: p.address, mapsUrl: p.mapsUrl }))

    const norm = (s?: string) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ')
    const withSrc = [
      ...explicit.map(p => ({ ...p, __src: 'explicit' as const })),
      ...fromPlaces.map(p => ({ ...p, __src: 'place' as const })),
    ]

    const res: { id: string; label: string; address?: string; mapsUrl?: string }[] = []
    const addrGroups = new Map<string, typeof withSrc>()
    const noAddr: typeof withSrc = []
    withSrc.forEach(p => {
      const a = norm(p.address)
      if (a) {
        const arr = addrGroups.get(a) || []
        arr.push(p)
        addrGroups.set(a, arr)
      } else {
        noAddr.push(p)
      }
    })

    // For same address: if any recommendation exists, drop explicit ones, keep all recommendations
    addrGroups.forEach(arr => {
      const anyPlace = arr.some(x => x.__src === 'place')
      const kept = anyPlace ? arr.filter(x => x.__src === 'place') : arr
      kept.forEach(x => res.push({ id: x.id, label: x.label, address: x.address, mapsUrl: x.mapsUrl }))
    })

    // For entries without address: dedupe by label+url
    const seen = new Set<string>()
    noAddr.forEach(x => {
      const key = `${norm(x.label)}||${norm(x.mapsUrl)}`
      if (seen.has(key)) return
      seen.add(key)
      res.push({ id: x.id, label: x.label, address: x.address, mapsUrl: x.mapsUrl })
    })

    return res
  })()

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 print-padded">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-3xl font-bold" style={{ color: guide.theme.primary, fontFamily: guide.theme.fontHeading }}>{guide.title}</h1>
        {/* Impression du guide retirée: impression uniquement via la fiche QR */}
      </div>

      {guide.theme?.welcomeMessage && (
        <div className="text-center text-2xl font-semibold mb-3" style={{ fontFamily: guide.theme.fontHeading }}>
          {guide.theme.welcomeMessage}
        </div>
      )}
      {guide.address && <p className="text-gray-600 mb-4">{guide.address}</p>}

      {guide.stay?.checkIn && (
        <section className="mb-4">
          <div className="section-title">🕒 Arrivée</div>
          <p>Heure d'arrivée: {guide.stay.checkIn.time}</p>
          {guide.stay.checkIn.instructions && <p>Instructions: {guide.stay.checkIn.instructions}</p>}
          {guide.stay.checkIn.code && <p>Code d'accès: {guide.stay.checkIn.code}</p>}
        </section>
      )}

      {guide.stay?.checkOut && (
        <section className="mb-4">
          <div className="section-title">🏁 Départ</div>
          <p>Heure de départ: {guide.stay.checkOut.time}</p>
          {guide.stay.checkOut.checklist && <p>Checklist départ: {guide.stay.checkOut.checklist}</p>}
        </section>
      )}

      {guide.wifi && (guide.wifi.ssid || guide.wifi.password) && (
        <section className="mb-4">
          <div className="section-title">📶 Wi‑Fi</div>
          <p>Nom du réseau (SSID): {guide.wifi.ssid}</p>
          {guide.wifi.password && <p>Mot de passe: {guide.wifi.password}</p>}
        </section>
      )}

      {guide.rules?.length ? (
        <section className="mb-4 page-break-before">
          <div className="section-title">📋 Règles du logement</div>
          <ul className="list-disc pl-6">{guide.rules.map(r => <li key={r.id}>{r.text}</li>)}</ul>
        </section>
      ) : null}

      {guide.equipmentNotes && (
        <section className="mb-4">
          <div className="section-title">🧰 Équipements et notes</div>
          <p>{guide.equipmentNotes}</p>
        </section>
      )}

      {guide.places?.length ? (
        <section className="mb-4">
          <div className="section-title">🍽️ Recommandations</div>
          <div className="space-y-3">
            {guide.places.map((p) => (
              <div key={p.id} className="border rounded p-3 avoid-break">
                <div className="font-medium">{p.name} <span className="text-xs text-gray-600">• {p.category}</span></div>
                {p.subtype && <div className="text-sm text-gray-600">{p.subtype}</div>}
                {p.description && <p className="text-sm mt-1">{p.description}</p>}
                <div className="text-sm text-gray-600 mt-1">{p.address}</div>
                <div className="text-sm mt-1 flex gap-3">
                  {p.mapsUrl && <a href={p.mapsUrl} target="_blank" rel="noreferrer" className="text-[var(--accent)]">Google Maps</a>}
                  {p.siteUrl && <a href={p.siteUrl} target="_blank" rel="noreferrer" className="text-[var(--accent)]">Site web</a>}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {(homeAddress || mapPoints.length) ? (
        <section className="mb-4">
          <div className="section-title">🗺️ Carte & liens</div>
          {homeAddress && (
            <div className="my-3">
              <div className="no-print">
                <LeafletMap homeAddress={homeAddress} points={mapPoints} height={320} />
              </div>
              <div className="text-sm text-gray-600 no-print">Adresse du logement: {homeAddress}</div>
            </div>
          )}
          {mapPoints.length ? (
            <ul className="list-disc pl-6 no-print">
              {mapPoints.map((p) => (
                <li key={p.id}>{p.label} – {p.address} {p.mapsUrl && (<a className="text-[var(--accent)]" href={p.mapsUrl} target="_blank">(Maps)</a>)}</li>
              ))}
            </ul>
          ) : null}
          {(homeAddress && mapPoints.length) ? (
            <div className="mt-2 no-print">
              <a className="text-[var(--accent)] underline" href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(homeAddress)}&destination=${encodeURIComponent(homeAddress)}&waypoints=${encodeURIComponent(mapPoints.map(p=>p.address || p.label).filter(Boolean).join('|'))}`} target="_blank" rel="noreferrer">Ouvrir la carte avec tous les points</a>
            </div>
          ) : null}
          {guide.links?.length ? (
            <div className="mt-2 flex flex-wrap gap-3">
              {guide.links.map((l) => <a key={l.id} href={l.url} className="text-[var(--accent)] underline" target="_blank">{l.label}</a>)}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="mb-4 page-break-before">
        <div className="section-title">☎️ Urgences</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-red-100 bg-red-50 text-center px-6 py-10 avoid-break">
            <div className="text-5xl font-bold text-red-600">112</div>
            <div className="mt-2 text-xl font-semibold text-red-600">Urgences</div>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50 text-center px-6 py-10 avoid-break">
            <div className="text-5xl font-bold text-blue-600">15</div>
            <div className="mt-2 text-xl font-semibold text-blue-600">SAMU</div>
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50 text-center px-6 py-10 avoid-break">
            <div className="text-5xl font-bold text-red-600">18</div>
            <div className="mt-2 text-xl font-semibold text-red-600">Pompiers</div>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50 text-center px-6 py-10 avoid-break">
            <div className="text-5xl font-bold text-blue-600">17</div>
            <div className="mt-2 text-xl font-semibold text-blue-600">Police</div>
          </div>
        </div>
      </section>
      {/* Marque fixe en bas du guide (imprimable) */}
      <div className="mt-8 pt-4 border-t text-center text-xs text-gray-500 flex items-center justify-center gap-2">
        <span>Réalisé par</span>
        <img src="/logo-guide.svg" alt="Votre logo" className="h-5 w-5" />
      </div>
    </div>
  )
}
