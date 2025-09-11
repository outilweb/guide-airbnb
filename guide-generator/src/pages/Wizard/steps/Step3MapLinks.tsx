import Card from '../../../components/Card'
import type { Guide } from '../../../types'
import { Input, Label } from '../../../components/FormField'

export default function Step3MapLinks({ guide, onChange }: { guide: Guide; onChange: (g: Guide) => void }) {
  const points = guide.map.points || []
  const links = guide.links || []
  return (
    <div className="space-y-4">
      <Card title="Carte">
        <div className="space-y-3">
          <div>
            <Label>Adresse du logement</Label>
            <Input placeholder="Adresse pour la carte Google Maps" value={guide.map.homeAddress ?? ''} onChange={(e) => onChange({ ...guide, map: { ...guide.map, homeAddress: e.target.value } })} />
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Points d’intérêt</div>
            {(points).map((p, idx) => (
              <div key={p.id} className="grid sm:grid-cols-3 gap-2">
                <Input placeholder="Label" value={p.label} onChange={(e) => {
                  const next = [...points]; next[idx] = { ...p, label: e.target.value }; onChange({ ...guide, map: { ...guide.map, points: next } })
                }} />
                <Input placeholder="Adresse" value={p.address ?? ''} onChange={(e) => {
                  const next = [...points]; next[idx] = { ...p, address: e.target.value }; onChange({ ...guide, map: { ...guide.map, points: next } })
                }} />
                <Input placeholder="URL Maps (facultative)" value={p.mapsUrl ?? ''} onChange={(e) => {
                  const next = [...points]; next[idx] = { ...p, mapsUrl: e.target.value }; onChange({ ...guide, map: { ...guide.map, points: next } })
                }} />
                <div className="sm:col-span-3">
                  <button type="button" className="text-xs text-red-600" onClick={() => onChange({ ...guide, map: { ...guide.map, points: points.filter((x) => x.id !== p.id) } })}>Supprimer</button>
                </div>
              </div>
            ))}
            <button type="button" className="text-sm text-[var(--accent)]" onClick={() => onChange({ ...guide, map: { ...guide.map, points: [...points, { id: crypto.randomUUID(), label: '', address: '', mapsUrl: '' }] } })}>+ Ajouter un point d'intérêt</button>
          </div>
        </div>
      </Card>

      <Card title="Liens utiles">
        <div className="space-y-2">
          {(links).map((l, idx) => (
            <div key={l.id} className="grid sm:grid-cols-2 gap-2">
              <Input placeholder="Label" value={l.label} onChange={(e) => { const next = [...links]; next[idx] = { ...l, label: e.target.value }; onChange({ ...guide, links: next }) }} />
              <Input placeholder="URL" value={l.url} onChange={(e) => { const next = [...links]; next[idx] = { ...l, url: e.target.value }; onChange({ ...guide, links: next }) }} />
              <div className="sm:col-span-2">
                <button type="button" className="text-xs text-red-600" onClick={() => onChange({ ...guide, links: links.filter((x) => x.id !== l.id) })}>Supprimer</button>
              </div>
            </div>
          ))}
          <button type="button" className="text-sm text-[var(--accent)]" onClick={() => onChange({ ...guide, links: [...links, { id: crypto.randomUUID(), label: '', url: '' }] })}>+ Ajouter un lien</button>
        </div>
      </Card>
    </div>
  )
}
