import { useEffect } from 'react'
import Card from '../../../components/Card'
import type { Guide, Place } from '../../../types'
import { Input, Label, Select, Textarea } from '../../../components/FormField'

export default function Step2Places({ guide, onChange }: { guide: Guide; onChange: (g: Guide) => void }) {
  const places = guide.places || []
  const update = (idx: number, patch: Partial<Place>) => {
    const next = [...places]
    next[idx] = { ...next[idx], ...patch }
    onChange({ ...guide, places: next })
  }

  // Ensure at least one recommendation exists so the owner sees "Reco 1" fields by default
  useEffect(() => {
    if (!guide.places || guide.places.length === 0) {
      onChange({
        ...guide,
        places: [{ id: crypto.randomUUID(), name: '', category: 'Restaurant' }],
      })
    }
    // We intentionally run this only on mount for this step
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className="space-y-4">
      {places.map((p: Place, idx: number) => (
        <Card key={p.id} title={<span className="flex items-center gap-2">🍽️ Recommandation {idx + 1}</span>}>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Nom</Label>
              <Input placeholder="Le Petit Bistrot" value={p.name} onChange={(e) => update(idx, { name: e.target.value })} />
            </div>
            <div>
              <Label>Catégorie</Label>
              <Select value={p.category} onChange={(e) => update(idx, { category: e.target.value as Place['category'] })}>
                {['Restaurant','Activité','Commerce essentiel'].map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Input placeholder="Cuisine française traditionnelle" value={p.subtype ?? ''} onChange={(e) => update(idx, { subtype: e.target.value })} />
            </div>
            <div>
              <Label>Adresse</Label>
              <Input placeholder="Adresse / distance (ex: 5 min à pied)" value={p.address ?? ''} onChange={(e) => update(idx, { address: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Description</Label>
              <Textarea placeholder="Description du lieu..." value={p.description ?? ''} onChange={(e) => update(idx, { description: e.target.value })} />
            </div>
            <div>
              <Label>Lien Google Maps</Label>
              <Input placeholder="https://maps.google.com/..." value={p.mapsUrl ?? ''} onChange={(e) => update(idx, { mapsUrl: e.target.value })} />
            </div>
            <div>
              <Label>Site web</Label>
              <Input placeholder="https://..." value={p.siteUrl ?? ''} onChange={(e) => update(idx, { siteUrl: e.target.value })} />
            </div>
          </div>
          <div className="mt-3 flex gap-3">
            <button type="button" className="text-sm text-red-600" onClick={() => onChange({ ...guide, places: places.filter((x: Place) => x.id !== p.id) })}>Supprimer</button>
          </div>
        </Card>
      ))}
      <div className="flex items-center gap-3">
        <button
          type="button"
          className={`text-sm text-[var(--accent)]`}
          onClick={() => {
            onChange({ ...guide, places: [...places, { id: crypto.randomUUID(), name: '', category: 'Restaurant' }] })
          }}
        >
          + Ajouter un lieu
        </button>
      </div>
    </div>
  )
}
