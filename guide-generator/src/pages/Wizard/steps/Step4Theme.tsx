import {} from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../../../components/Card'
import type { Guide } from '../../../types'
import { Input, Label, Select, Textarea } from '../../../components/FormField'

const FONT_OPTIONS = ['Inter','Montserrat','Poppins']

export default function Step4Theme({ guide, onChange }: { guide: Guide; onChange: (g: Guide) => void }) {
  const theme = guide.theme
  const navigate = useNavigate()
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
            <Label>Couleur d'accent</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={theme.accent} onChange={(e) => onChange({ ...guide, theme: { ...theme, accent: e.target.value } })} />
              <Input value={theme.accent} readOnly />
            </div>
          </div>
          <div>
            <Label>Police des titres</Label>
            <Select value={theme.fontHeading} onChange={(e) => onChange({ ...guide, theme: { ...theme, fontHeading: e.target.value } })}>
              {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
            </Select>
          </div>
          <div>
            <Label>Police du texte</Label>
            <Select value={theme.fontBody} onChange={(e) => onChange({ ...guide, theme: { ...theme, fontBody: e.target.value } })}>
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
        <div className="space-y-3" style={{ fontFamily: theme.fontBody }}>
          <h3 className="text-xl font-semibold" style={{ fontFamily: theme.fontHeading }}>{theme.welcomeMessage || 'Bienvenue chez vous'}</h3>
          <p>Ceci est un aperçu de votre thème personnalisé.</p>
          <button className="px-4 py-2 rounded text-white" style={{ backgroundColor: theme.accent }} onClick={() => navigate('/preview')}>Bouton d’exemple</button>
        </div>
      </Card>
    </div>
  )
}
