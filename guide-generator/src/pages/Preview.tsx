import { useEffect, useMemo, useState } from 'react'
import Card from '../components/Card'
import type { Guide } from '../types'
import { loadDraft, publishGuide } from '../utils/storage'
import { useNavigate } from 'react-router-dom'
import QRCanvas from '../components/QRCanvas'
import LeafletMap from '../components/LeafletMap'
import { publicGuideUrl } from '../utils/url'

export default function Preview() {
  const [guide, setGuide] = useState<Guide | null>(null)
  const navigate = useNavigate()
  useEffect(() => setGuide(loadDraft()), [])

  useEffect(() => {
    if (guide) {
      document.documentElement.style.setProperty('--primary', guide.theme.primary)
      document.documentElement.style.setProperty('--accent', guide.theme.accent)
      document.documentElement.style.setProperty('--font-heading', guide.theme.fontHeading)
      document.documentElement.style.setProperty('--font-body', guide.theme.fontBody)
    }
  }, [guide])

  const isPublished = !!guide?.guideId
  const guideUrl = useMemo(() => guide?.guideId ? publicGuideUrl(guide.guideId) : '', [guide])
  const homeAddress = (guide?.map?.homeAddress || guide?.address || '')
  // Combine explicit map points with recommendations.
  // If explicit and recommendation share the same address, keep only the recommendation(s).
  const mapPoints = useMemo(() => {
    if (!guide) return [] as { id: string; label: string; address?: string; mapsUrl?: string }[]
    const explicit = guide.map?.points || []
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

    addrGroups.forEach(arr => {
      const anyPlace = arr.some(x => x.__src === 'place')
      const kept = anyPlace ? arr.filter(x => x.__src === 'place') : arr
      kept.forEach(x => res.push({ id: x.id, label: x.label, address: x.address, mapsUrl: x.mapsUrl }))
    })

    const seen = new Set<string>()
    noAddr.forEach(x => {
      const key = `${norm(x.label)}||${norm(x.mapsUrl)}`
      if (seen.has(key)) return
      seen.add(key)
      res.push({ id: x.id, label: x.label, address: x.address, mapsUrl: x.mapsUrl })
    })

    return res
  }, [guide])

  if (!guide) return <div className="max-w-5xl mx-auto px-4 py-6">Aucun brouillon trouvé.</div>

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 print-padded">
      <div className={`rounded border px-4 py-3 mb-4 no-print ${isPublished ? 'border-green-300 bg-green-50' : 'border-yellow-300 bg-yellow-50'}`}>
        {isPublished ? '✅ Guide publié – Mode lecture pour vos invités' : 'Brouillon non publié'}
      </div>

      {guide.theme?.welcomeMessage && (
        <div className="text-center text-2xl font-semibold mb-3" style={{ fontFamily: guide.theme.fontHeading }}>
          {guide.theme.welcomeMessage}
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4 print-block">
        <div className="sm:col-span-2 space-y-4">
          <Card>
            <div className="prose max-w-none">
              <h1 style={{ color: 'var(--primary)' }}>{guide.title || 'Sans titre'}</h1>
              {guide.address && <p className="text-gray-600">{guide.address}</p>}
            </div>
          </Card>

          {guide.stay?.checkIn && (
            <Card>
              <div className="section-title">🕒 Arrivée</div>
              <div className="space-y-1 text-sm">
                {guide.stay.checkIn.time && <div>Heure d'arrivée: {guide.stay.checkIn.time}</div>}
                {guide.stay.checkIn.instructions && <div>Instructions: {guide.stay.checkIn.instructions}</div>}
                {guide.stay.checkIn.code && <div>Code d'accès: {guide.stay.checkIn.code}</div>}
              </div>
            </Card>
          )}

          {guide.stay?.checkOut && (
            <Card>
              <div className="section-title">🏁 Départ</div>
              <div className="space-y-1 text-sm">
                {guide.stay.checkOut.time && <div>Heure de départ: {guide.stay.checkOut.time}</div>}
                {guide.stay.checkOut.checklist && <div>Checklist départ: {guide.stay.checkOut.checklist}</div>}
              </div>
            </Card>
          )}

          {(guide.contact?.name || guide.contact?.phone || guide.contact?.email) && (
            <Card>
              <div className="section-title">👤 Contact</div>
              <div className="space-y-1 text-sm">
                {guide.contact?.name && <div>Nom: {guide.contact.name}</div>}
                {guide.contact?.phone && <div>Téléphone: {guide.contact.phone}</div>}
                {guide.contact?.email && <div>Email: {guide.contact.email}</div>}
              </div>
            </Card>
          )}

          {(guide.wifi?.ssid || guide.wifi?.password) && (
            <Card>
              <div className="section-title">📶 Wi‑Fi</div>
              <div className="text-sm">
                <p>Nom du réseau (SSID): {guide.wifi?.ssid}</p>
                {guide.wifi?.password && <p>Mot de passe: {guide.wifi.password}</p>}
              </div>
            </Card>
          )}

          {guide.rules?.length ? (
            <div className="page-break-before">
            <Card>
              <div className="section-title">📋 Règles du logement</div>
              <ul className="list-disc pl-6 text-sm">{guide.rules.map(r => <li key={r.id}>{r.text}</li>)}</ul>
            </Card>
            </div>
          ) : null}

          {guide.equipmentNotes && (
            <Card>
              <div className="section-title">🧰 Équipements et notes</div>
              <div className="text-sm whitespace-pre-wrap">{guide.equipmentNotes}</div>
            </Card>
          )}

          {guide.places?.length ? (
            <Card>
              <div className="section-title">🍽️ Recommandations</div>
              <div className="space-y-3">
                {guide.places.map((p) => (
                  <div key={p.id} className="border rounded p-3 avoid-break">
                    <div className="font-medium">{p.name || '(Sans nom)'} <span className="text-xs text-gray-600">• {p.category}</span></div>
                    {p.subtype && <div className="text-sm text-gray-600">{p.subtype}</div>}
                    {p.description && <p className="text-sm mt-1">{p.description}</p>}
                    {p.address && <div className="text-sm text-gray-600 mt-1">{p.address}</div>}
                    <div className="text-sm mt-1 flex gap-3">
                      {p.mapsUrl && <a href={p.mapsUrl} target="_blank" rel="noreferrer" className="text-[var(--accent)]">Google Maps</a>}
                      {p.siteUrl && <a href={p.siteUrl} target="_blank" rel="noreferrer" className="text-[var(--accent)]">Site web</a>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {(homeAddress || mapPoints.length || guide.links.length) ? (
            <Card>
              <div className="section-title">🗺️ Carte & liens</div>
              <div className="space-y-2 text-sm">
                {homeAddress && (
                  <div>
                    <div className="no-print mb-2">
                      <LeafletMap homeAddress={homeAddress} points={mapPoints} height={220} />
                    </div>
                    <div className="no-print">Adresse du logement: {homeAddress}</div>
                  </div>
                )}
                {mapPoints.length ? (
                  <ul className="list-disc pl-6 no-print">
                    {mapPoints.map(p => <li key={p.id}>{p.label} – {p.address} {p.mapsUrl && (<a className="text-[var(--accent)]" href={p.mapsUrl} target="_blank">(Maps)</a>)}</li>)}
                  </ul>
                ) : null}
                {mapPoints.length ? (
                  <div className="text-xs text-gray-500 no-print">Astuce: cliquez sur « Ouvrir la carte avec tous les points » pour voir les marqueurs sur Google Maps.</div>
                ) : null}
                {guide.links.length ? (
                  <div className="flex flex-wrap gap-3">
                    {guide.links.map(l => <a key={l.id} href={l.url} target="_blank" className="text-[var(--accent)] underline">{l.label}</a>)}
                  </div>
                ) : null}
                {(homeAddress && mapPoints.length) ? (
                  <div className="no-print">
                    <a className="text-[var(--accent)] underline" href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(homeAddress)}&destination=${encodeURIComponent(homeAddress)}&waypoints=${encodeURIComponent(mapPoints.map(p=>p.address || p.label).filter(Boolean).join('|'))}`} target="_blank" rel="noreferrer">Ouvrir la carte avec tous les points</a>
                  </div>
                ) : null}
              </div>
            </Card>
          ) : null}

          <div className="page-break-before">
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
          </div>
          {/* Marque fixe en bas du guide (imprimable) */}
          <div className="mt-8 pt-4 border-t text-center text-xs text-gray-500 flex items-center justify-center gap-2">
            <span>Réalisé par</span>
            <img src="/logo-guide.svg" alt="Votre logo" className="h-5 w-5" />
          </div>
        </div>
        <div className="space-y-3 no-print">
          <Card>
            <div className="flex flex-col items-center gap-3">
              {isPublished && guideUrl && <QRCanvas url={guideUrl} size={192} />}
              <div className="flex gap-2">
                {/* Impression du guide retirée: conserver uniquement l'impression du QR Code */}
                <button
                  className="btn btn-primary"
                  onClick={() => guide?.guideId && navigate(`/print-qr/${guide.guideId}?auto=1`)}
                  disabled={!isPublished}
                >
                  🖨️ Imprimer le QR Code
                </button>
              </div>
            </div>
          </Card>
          {!isPublished && (
            <button className="btn btn-primary w-full" onClick={() => {
              const published = publishGuide(guide)
              setGuide(published)
              navigate(`/guide/${published.guideId}`)
            }}>Publier</button>
          )}
        </div>
      </div>
    </div>
  )
}
