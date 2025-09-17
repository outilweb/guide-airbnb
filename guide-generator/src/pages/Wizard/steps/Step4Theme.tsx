import { useMemo } from 'react'
import Card from '../../../components/Card'
import type { Guide } from '../../../types'
import { Input, Label, Select, Textarea } from '../../../components/FormField'
import LeafletMap from '../../../components/LeafletMap'
import { formatPhoneFR, formatTimeDisplay } from '../../../utils/format'

const FONT_OPTIONS = ['Inter','Montserrat','Poppins']

export default function Step4Theme({ guide, onChange }: { guide: Guide; onChange: (g: Guide) => void }) {
  const theme = guide.theme
  const themeVars = useMemo(() => ({
    ['--primary' as any]: theme.primary,
    ['--accent' as any]: theme.accent,
    ['--font-heading' as any]: theme.fontHeading,
    ['--font-body' as any]: theme.fontBody,
  }), [theme])

  const homeAddress = (guide?.map?.homeAddress || guide?.address || '')
  const mapPoints = useMemo(() => {
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
  return (
    <div className="space-y-4">
      <Card title={<span className="section-title !mb-0">🎨 Personnalisation</span>}>
        <div className="grid sm:grid-cols-2 gap-4 items-end">
          <div>
            <Label>Couleur principale</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={theme.primary} onChange={(e) => onChange({ ...guide, theme: { ...theme, primary: e.target.value } })} />
              <Input value={theme.primary} readOnly />
            </div>
          </div>
          <div>
            <Label>Police des titres</Label>
            <Select value={theme.fontHeading} onChange={(e) => onChange({ ...guide, theme: { ...theme, fontHeading: e.target.value } })}>
              {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
            </Select>
          </div>
          {/* Contrôle du logo retiré pour empêcher la modification par le propriétaire */}
          <div className="sm:col-span-2">
            <Label>Message d’accueil</Label>
            <Textarea placeholder="Bienvenue chez vous" value={theme.welcomeMessage ?? ''} onChange={(e) => onChange({ ...guide, theme: { ...theme, welcomeMessage: e.target.value } })} />
            <div className="text-xs text-gray-500 mt-1">Ce message s’affichera en tête du guide.</div>
          </div>
        </div>
      </Card>

      <Card title={<span className="section-title !mb-0">👀 Aperçu du thème</span>}>
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Aperçu rapide du rendu visuel de votre guide.</p>
        </div>
      </Card>

      {/* Aperçu complet du guide avec les informations remplies */}
      <div className="space-y-4" style={themeVars as any}>
        {guide.theme?.welcomeMessage && (
          <div className="text-center text-2xl font-semibold" style={{ fontFamily: theme.fontHeading }}>
            {guide.theme.welcomeMessage}
          </div>
        )}

        {/* Ligne 1: Adresse | Contact */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Card>
            <div className="section-title">🏠 Adresse</div>
            <div className="prose max-w-none">
              <h1 style={{ color: 'var(--primary)' }}>{guide.title || 'Sans titre'}</h1>
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
        {(guide.rules?.length || guide.wifi?.ssid || guide.wifi?.password) ? (
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
            {guide.rules?.length ? (
              <Card>
                <div className="section-title">📋 Règles</div>
                <ul className="list-disc pl-6 text-sm">{guide.rules.map(r => <li key={r.id}>{r.text}</li>)}</ul>
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

        {(homeAddress || mapPoints.length) ? (
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
            </div>
          </Card>
        ) : null}

        {/* Urgences */}
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
    </div>
  )
}
