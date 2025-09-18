import { useEffect, useMemo, useState } from 'react'
import Stepper from '../../components/Stepper'
import SaveHint from '../../components/SaveHint'
import Step1Info from './steps/Step1Info'
import Step2Places from './steps/Step2Places'
import Step4Theme from './steps/Step4Theme'
import { z } from 'zod'
import type { Guide } from '../../types'
import { emptyGuide, defaultTheme } from '../../types'
import { loadDraft, publishGuide, saveDraft } from '../../utils/storage'
import { useNavigate } from 'react-router-dom'

const steps = ['Informations du logement', 'Recommandations', 'Style & publication']

const schema = z.object({
  title: z.string().min(3, 'Titre trop court (min 3 caractères)'),
})

export default function Wizard() {
  const [current, setCurrent] = useState(0)
  const [guide, setGuide] = useState<Guide>(() => loadDraft() ?? emptyGuide())
  const [saveTick, setSaveTick] = useState(0)
  const navigate = useNavigate()

  // Ensure the site (builder) keeps its default theme while editing
  useEffect(() => {
    document.documentElement.style.setProperty('--primary', defaultTheme.primary)
    document.documentElement.style.setProperty('--accent', defaultTheme.accent)
    document.documentElement.style.setProperty('--font-heading', defaultTheme.fontHeading)
    document.documentElement.style.setProperty('--font-body', defaultTheme.fontBody)
  }, [])

  // Auto-save effect
  useEffect(() => {
    saveDraft(guide)
    setSaveTick((t) => t + 1)
  }, [guide])

  const stepView = useMemo(() => {
    switch (current) {
      case 0: return <Step1Info guide={guide} onChange={setGuide} schema={schema} />
      case 1: return <Step2Places guide={guide} onChange={setGuide} />
      case 2: return <Step4Theme guide={guide} onChange={setGuide} />
      default: return null
    }
  }, [current, guide])

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Stepper steps={steps} current={current} />

      <div className="mt-4">
        {stepView}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button className="btn btn-outline" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>Retour</button>
        <button
          className="btn btn-primary"
          onClick={() => {
            if (current < 2) {
              setCurrent((c) => c + 1)
              return
            }
            const published = publishGuide(guide)
            setGuide(published)
            navigate('/preview')
          }}
        >
          {current < 2 ? 'Étape suivante' : 'Générer le guide'}
        </button>
      </div>

      <SaveHint trigger={saveTick} />
    </div>
  )
}
