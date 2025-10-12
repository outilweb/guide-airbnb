import { useEffect, useMemo, useState } from 'react'
import Card from '../components/Card'
import type { Guide } from '../types'
import { loadDraft, publishGuide } from '../utils/storage'
import { useNavigate } from 'react-router-dom'
import QRCanvas from '../components/QRCanvas'
import LeafletMap from '../components/LeafletMap'
import { downloadGuideHtml, guideShareInfo } from '../utils/exportGuide'
import { formatPhoneFR, formatTimeDisplay } from '../utils/format'
import { BRAND_URL } from '../config'

export default function Preview() {
  const [guide, setGuide] = useState<Guide | null>(null)
  const navigate = useNavigate()
  useEffect(() => setGuide(loadDraft()), [])

  const themeVars = useMemo(() => guide ? ({
    ['--primary' as any]: guide.theme.primary,
    ['--accent' as any]: guide.theme.accent,
    ['--font-heading' as any]: guide.theme.fontHeading,
    ['--font-body' as any]: guide.theme.fontBody,
  }) : undefined, [guide])

  const isPublished = !!guide?.guideId
  const shareInfo = useMemo(() => (guide && guide.guideId ? guideShareInfo(guide) : null), [guide])
  const [downloadState, setDownloadState] = useState<'idle' | 'success' | 'error'>('idle')
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

    return res.filter((point) => {
      const label = (point.label ?? '').trim()
      const address = (point.address ?? '').trim()
      return Boolean(label || address)
    })
  }, [guide])

  const rules = useMemo(
    () => (guide?.rules ?? []).filter((rule) => typeof rule?.text === 'string' && rule.text.trim().length > 0),
    [guide],
  )

  const handleDownload = async () => {
    if (!guide || !isPublished) return
    try {
      await downloadGuideHtml(guide)
      setDownloadState('success')
      setTimeout(() => setDownloadState('idle'), 2000)
    } catch (error) {
      console.error('Impossible de générer le guide HTML', error)
      setDownloadState('error')
      setTimeout(() => setDownloadState('idle'), 2500)
    }
  }

  if (!guide) return <div className="max-w-5xl mx-auto px-4 py-6">Aucun brouillon trouvé.</div>

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 print-padded" style={themeVars as any}>
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
          {/* Ligne 1: Appartement & adresse | Contact */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <div className="section-title">🏠 Adresse</div>
                <div className="prose max-w-none">
                  <h1 className="text-gray-800">{guide.title || 'Sans titre'}</h1>
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

          {/* Ligne 2: Arrivée | Départ */}
          {(guide.stay?.checkIn || guide.stay?.checkOut) && (
            <div className="grid sm:grid-cols-2 gap-4">
              {guide.stay?.checkIn && (
                <Card>
                  <div className="section-title">🕒 Arrivée</div>
                  <div className="space-y-1 text-sm">
                    {guide.stay.checkIn.time && <div>Heure d'arrivée: {formatTimeDisplay(guide.stay.checkIn.time)}</div>}
                    {guide.stay.checkIn.instructions && <div>Instructions: {guide.stay.checkIn.instructions}</div>}
                    {guide.stay.checkIn.code && <div>Code d'accès: {guide.stay.checkIn.code}</div>}
                  </div>
                </Card>
              )}
              {guide.stay?.checkOut && (
                <Card>
                  <div className="section-title">🏁 Départ</div>
                  <div className="space-y-1 text-sm">
                    {guide.stay.checkOut.time && <div>Heure de départ: {formatTimeDisplay(guide.stay.checkOut.time)}</div>}
                    {guide.stay.checkOut.checklist && <div>Checklist départ: {guide.stay.checkOut.checklist}</div>}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Ligne 3: Wi‑Fi | Règles */}
          {(rules.length || guide.wifi?.ssid || guide.wifi?.password) ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {(guide.wifi?.ssid || guide.wifi?.password) && (
                <Card>
                  <div className="section-title">📶 Wi‑Fi</div>
                  <div className="text-sm">
                    <p>Nom du réseau (SSID): {guide.wifi?.ssid}</p>
                    {guide.wifi?.password && <p>Mot de passe: {guide.wifi.password}</p>}
                  </div>
                </Card>
              )}
              {rules.length ? (
                <Card>
                  <div className="section-title">📋 Règles</div>
                  <ul className="list-disc pl-6 text-sm">{rules.map(r => <li key={r.id}>{r.text}</li>)}</ul>
                </Card>
              ) : null}
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
                    <div className="text-sm font-semibold text-gray-700">{p.category}</div>
                    <div className="font-medium">{p.name || '(Sans nom)'}</div>
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
        <div className="space-y-3 no-print">
          <Card>
            <div className="flex flex-col items-center gap-4 text-center">
              {isPublished && shareInfo ? (
                <>
                  <QRCanvas url={shareInfo.shareUrl} size={192} />
                  <p className="text-sm text-gray-600">
                    Scannez ce QR code pour ouvrir le guide en ligne sur votre téléphone.
                  </p>
                  <div className="w-full max-w-md bg-gray-100 border border-gray-200 rounded px-3 py-3 text-left space-y-1">
                    <div className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Lien du guide</div>
                    <a
                      href={shareInfo.shareUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-[var(--accent)] break-all hover:underline"
                    >
                      {shareInfo.shareUrl}
                    </a>
                    <p className="text-xs text-gray-500">Partagez ou imprimez ce lien: vos invités y trouveront le guide à jour.</p>
                  </div>
                  <div className="w-full max-w-md bg-gray-100 border border-gray-200 rounded px-3 py-3 text-left space-y-1">
                    <div className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Fichier HTML téléchargé</div>
                    <span className="text-sm text-gray-700 break-all">{shareInfo.fileName}</span>
                    <p className="text-xs text-gray-500">
                      Conservez ce nom si vous envoyez le fichier par email ou en pièce jointe.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      className="btn btn-primary"
                      type="button"
                      onClick={handleDownload}
                    >
                      {downloadState === 'success' ? 'Fichier téléchargé !' : '💾 Télécharger le guide (HTML)'}
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={() => guide?.guideId && navigate(`/print-qr/${guide.guideId}?auto=1`)}
                    >
                      🖨️ Imprimer le QR Code
                    </button>
                  </div>
                  {downloadState === 'error' && (
                    <p className="text-xs text-red-600 text-center">
                      Impossible de générer le fichier HTML. Réessayez ou utilisez un autre navigateur.
                    </p>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Publiez le guide pour générer automatiquement le QR code et le lien à partager avec vos invités.
                  </p>
                  <button className="btn btn-primary" onClick={() => {
                    if (!guide) return
                    const published = publishGuide(guide)
                    setGuide(published)
                  }}>Publier maintenant</button>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
