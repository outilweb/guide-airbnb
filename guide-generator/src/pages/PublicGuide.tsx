import { useEffect, useMemo, useState } from 'react'
// emojis utilisés dans les titres de section
import { useParams, useSearchParams } from 'react-router-dom'
import { loadPublished, sanitizeGuide } from '../utils/storage'
import type { Guide } from '../types'
import LeafletMap from '../components/LeafletMap'
import Card from '../components/Card'
import { formatTimeDisplay, formatPhoneFR } from '../utils/format'
import { BRAND_URL } from '../config'
import { decodeGuideSharePayload, SHARE_QUERY_PARAM } from '../utils/share'

export default function PublicGuide() {
  const { guideId } = useParams()
  const [searchParams] = useSearchParams()
  const sharePayload = searchParams.get(SHARE_QUERY_PARAM)
  const [guide, setGuide] = useState<Guide | null>(null)
  useEffect(() => {
    if (!guideId) return
    if (sharePayload) {
      const decoded = decodeGuideSharePayload(sharePayload)
      if (decoded) {
        const normalized = sanitizeGuide({ ...decoded, guideId: decoded.guideId ?? guideId })
        try {
          localStorage.setItem(`guide:${normalized.guideId}`, JSON.stringify(normalized))
        } catch {
          /* ignore quota issues */
        }
        setGuide(normalized)
        return
      }
    }
    setGuide(loadPublished(guideId) || null)
  }, [guideId, sharePayload])

  const themeVars = useMemo(() => guide ? ({
    ['--primary' as any]: guide.theme.primary,
    ['--accent' as any]: guide.theme.accent,
    ['--font-heading' as any]: guide.theme.fontHeading,
    ['--font-body' as any]: guide.theme.fontBody,
  }) : undefined, [guide])

  const rules = useMemo(
    () => (guide?.rules ?? []).filter((rule) => typeof rule?.text === 'string' && rule.text.trim().length > 0),
    [guide],
  )

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

    return res.filter((point) => {
      const label = (point.label ?? '').trim()
      const address = (point.address ?? '').trim()
      return Boolean(label || address)
    })
  })()

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 print-padded" style={themeVars as any}>
      {guide.theme?.welcomeMessage && (
        <div className="text-center text-2xl font-semibold mb-3" style={{ fontFamily: guide.theme.fontHeading }}>
          {guide.theme.welcomeMessage}
        </div>
      )}

      {/* Ligne 1: Appartement & adresse | Contact */}
      <section className="mb-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Card>
            <div className="section-title">🏠 Adresse</div>
            <div className="prose max-w-none">
              <h1 className="text-gray-800">{guide.title}</h1>
              {guide.address && <p className="text-gray-600">{guide.address}</p>}
            </div>
          </Card>
          {(guide.contact?.name || guide.contact?.phone || guide.contact?.email) && (
            <Card>
              <div className="section-title">👤 Contact</div>
              <div className="space-y-1 text-sm">
                {guide.contact?.name && <div>Nom: {guide.contact.name}</div>}
                {guide.contact?.phone && <div>Téléphone: {formatPhoneFR(guide.contact.phone)}</div>}
                {guide.contact?.email && <div>Email: {guide.contact.email}</div>}
              </div>
            </Card>
          )}
        </div>
      </section>

      {/* Ligne 2: Arrivée | Départ */}
      {(guide.stay?.checkIn || guide.stay?.checkOut) && (
        <section className="mb-4">
          <div className="grid sm:grid-cols-2 gap-4">
            {guide.stay?.checkIn && (
              <Card>
                <div className="section-title">🕒 Arrivée</div>
                <div className="text-sm space-y-1">
                  <div>Heure d'arrivée: {formatTimeDisplay(guide.stay.checkIn.time)}</div>
                  {guide.stay.checkIn.instructions && <div>Instructions: {guide.stay.checkIn.instructions}</div>}
                  {guide.stay.checkIn.code && <div>Code d'accès: {guide.stay.checkIn.code}</div>}
                </div>
              </Card>
            )}
            {guide.stay?.checkOut && (
              <Card>
                <div className="section-title">🏁 Départ</div>
                <div className="text-sm space-y-1">
                  <div>Heure de départ: {formatTimeDisplay(guide.stay.checkOut.time)}</div>
                  {guide.stay.checkOut.checklist && <div>Checklist départ: {guide.stay.checkOut.checklist}</div>}
                </div>
              </Card>
            )}
          </div>
        </section>
      )}

      {/* Ligne 3: Wi‑Fi | Règles */}
      {(rules.length || (guide.wifi && (guide.wifi.ssid || guide.wifi.password))) && (
        <section className="mb-4">
          <div className="grid sm:grid-cols-2 gap-4">
            {guide.wifi && (guide.wifi.ssid || guide.wifi.password) && (
              <Card>
                <div className="section-title">📶 Wi‑Fi</div>
                <div className="text-sm">
                  <p>Nom du réseau (SSID): {guide.wifi.ssid}</p>
                  {guide.wifi.password && <p>Mot de passe: {guide.wifi.password}</p>}
                </div>
              </Card>
            )}
            {rules.length ? (
              <Card>
                <div className="section-title">📋 Règles</div>
                <ul className="list-disc pl-6">{rules.map(r => <li key={r.id}>{r.text}</li>)}</ul>
              </Card>
            ) : null}
          </div>
        </section>
      )}

      {guide.equipmentNotes && (
        <section className="mb-4">
          <Card>
            <div className="section-title">🧰 Équipements et notes</div>
            <div className="text-sm whitespace-pre-wrap">{guide.equipmentNotes}</div>
          </Card>
        </section>
      )}

      {guide.places?.length ? (
        <section className="mb-4">
          <Card>
            <div className="section-title">🍽️ Recommandations</div>
            <div className="space-y-3">
              {guide.places.map((p) => (
                <div key={p.id} className="border rounded p-3 avoid-break">
                  <div className="text-sm font-semibold text-gray-700">{p.category}</div>
                  <div className="font-medium">{p.name}</div>
                  {p.description && <p className="text-sm mt-1">{p.description}</p>}
                  <div className="text-sm text-gray-600 mt-1">{p.address}</div>
                  <div className="text-sm mt-1 flex gap-3">
                    {p.mapsUrl && <a href={p.mapsUrl} target="_blank" rel="noreferrer" className="text-[var(--accent)]">Google Maps</a>}
                    {p.siteUrl && <a href={p.siteUrl} target="_blank" rel="noreferrer" className="text-[var(--accent)]">Site web</a>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      ) : null}

      {(homeAddress || mapPoints.length) ? (
        <section className="mb-4">
          <Card>
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
          </Card>
        </section>
      ) : null}

      <section className="mb-4 page-break-before">
        <Card>
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
        </Card>
      </section>
      {/* Marque fixe en bas du guide (imprimable) */}
      <a
        href={BRAND_URL}
        target="_blank"
        rel="noreferrer"
        className="mt-8 pt-4 border-t text-center text-xs text-gray-500 flex items-center justify-center gap-2 hover:underline"
      >
        <span>Réalisé par</span>
        <img src="/logo-guide.svg" alt="Votre logo" className="h-5 w-5" />
      </a>
    </div>
  )
}
