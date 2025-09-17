import Card from '../../../components/Card'
import { Input, Label, Textarea, ErrorText } from '../../../components/FormField'
import type { Guide } from '../../../types'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

export default function Step1Info({ guide, onChange, schema }: { guide: Guide; onChange: (g: Guide) => void; schema: z.ZodTypeAny }) {
  const { register, formState: { errors }, watch } = useForm<any>({
    defaultValues: guide as any,
    resolver: zodResolver(schema as any),
    mode: 'onChange'
  })

  // Sync changes back to parent
  watch((values) => onChange({ ...guide, ...(values as any) }))

  return (
    <div className="space-y-4">
      {/* Ligne 1: Adresse | Contact (même ordre que le guide) */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card title={<span className="section-title !mb-0">🏠 Adresse</span>}>
          <div className="grid gap-3">
            <div>
              <Label>Titre du logement</Label>
              <Input placeholder="ex: Appartement cosy centre-ville" {...register('title')} />
              <ErrorText error={errors.title} />
            </div>
            <div>
              <Label>Adresse complète</Label>
              <Input placeholder="123 Rue de la Paix, 75001 Paris" {...register('address')} />
              <div className="text-xs text-gray-500 mt-1">Utilisée pour la carte et les directions</div>
            </div>
          </div>
        </Card>

        <Card title={<span className="flex items-center gap-2">👤 Contact</span>}>
          <div className="grid gap-3">
            <div>
              <Label>Nom</Label>
              <Input placeholder="Marie Dupont" {...register('contact.name' as const)} />
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input placeholder="+33 6 12 34 56 78" {...register('contact.phone' as const)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input placeholder="marie@example.com" {...register('contact.email' as const)} />
            </div>
          </div>
        </Card>
      </div>

      {/* Ligne 2: Arrivée | Départ */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card title={<span className="flex items-center gap-2">🕒 Arrivée</span>}>
          <div className="grid gap-3">
            <div>
              <Label>Heure d'arrivée</Label>
              <Input placeholder="15:00" {...register('stay.checkIn.time' as const)} />
            </div>
            <div>
              <Label>Instructions</Label>
              <Input placeholder="Comment récupérer les clés..." {...register('stay.checkIn.instructions' as const)} />
            </div>
            <div>
              <Label>Code d'accès</Label>
              <Input placeholder="1234" {...register('stay.checkIn.code' as const)} />
            </div>
          </div>
        </Card>

        <Card title={<span className="flex items-center gap-2">🏁 Départ</span>}>
          <div className="grid gap-3">
            <div>
              <Label>Heure de départ</Label>
              <Input placeholder="11:00" {...register('stay.checkOut.time' as const)} />
            </div>
            <div>
              <Label>Checklist départ</Label>
              <Input placeholder="Fermer les fenêtres, éteindre les lumières..." {...register('stay.checkOut.checklist' as const)} />
            </div>
          </div>
        </Card>
      </div>

      {/* Ligne 3: Wi‑Fi | Règles */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card title={<span className="flex items-center gap-2">📶 Wi‑Fi</span>}>
          <div className="grid gap-3">
            <div>
              <Label>Nom du réseau (SSID)</Label>
              <Input placeholder="MonWiFi_5G" {...register('wifi.ssid' as const)} />
            </div>
            <div>
              <Label>Mot de passe</Label>
              <Input placeholder="motdepasse123" {...register('wifi.password' as const)} />
            </div>
          </div>
        </Card>
        <Card title={<span className="flex items-center gap-2">📋 Règles</span>}>
          <div className="space-y-2">
            {(guide.rules ?? []).map((r, idx) => (
              <div key={r.id} className="flex gap-2 items-center">
                <Input value={r.text} onChange={(e) => {
                  const rules = [...guide.rules]
                  rules[idx] = { ...r, text: e.target.value }
                  onChange({ ...guide, rules })
                }} />
                <button type="button" className="text-sm text-red-600" onClick={() => {
                  const rules = guide.rules.filter((x) => x.id !== r.id)
                  onChange({ ...guide, rules })
                }}>Supprimer</button>
              </div>
            ))}
            <button type="button" className="text-sm text-[var(--accent)]" onClick={() => onChange({ ...guide, rules: [...(guide.rules || []), { id: crypto.randomUUID(), text: '' }] })}>
              + Ajouter une règle
            </button>
          </div>
        </Card>
      </div>

      <Card title="Équipements et notes">
        <Textarea placeholder="Décrivez les équipements disponibles, les particularités du logement..." {...register('equipmentNotes' as const)} />
      </Card>
    </div>
  )
}
