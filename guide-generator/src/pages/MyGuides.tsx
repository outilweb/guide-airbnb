import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import type { PublishedGuide } from '../types'
import { listPublishedGuides, saveDraft } from '../utils/storage'
import { publicGuideUrl } from '../utils/url'
import { useAuth } from '../contexts/AuthContext'

const formatDateTime = (timestamp?: number) => {
  if (!timestamp) return 'Date inconnue'
  return new Date(timestamp).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })
}

export default function MyGuides() {
  const navigate = useNavigate()
  const { owner, loading: authLoading, login, register, logout } = useAuth()
  const [guides, setGuides] = useState<PublishedGuide[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const load = () => {
      if (!owner?.id) {
        setGuides([])
        return
      }
      const all = listPublishedGuides({ ownerId: owner.id, ownerEmail: owner.email })
      setGuides(all)
    }

    load()
    const handleStorage = () => load()
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [owner])

  const handleContinueEditing = (guide: PublishedGuide) => {
    saveDraft(guide)
    navigate('/wizard')
  }

  const handleCopyLink = async (guide: PublishedGuide) => {
    try {
      const shareUrl = publicGuideUrl(guide, { includeShare: true })
      await navigator.clipboard.writeText(shareUrl)
      setCopiedId(guide.guideId)
      setTimeout(() => setCopiedId((prev) => (prev === guide.guideId ? null : prev)), 1500)
    } catch (error) {
      console.error('Impossible de copier le lien', error)
      setCopiedId(null)
    }
  }

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAuthError(null)
    setSubmitting(true)
    try {
      if (authMode === 'register') {
        await register(email, password)
      } else {
        await login(email, password)
      }
      setEmail('')
      setPassword('')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Action impossible'
      setAuthError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--primary)' }}>Mes guides</h1>
          <p className="text-sm text-gray-600">Retrouvez l'historique des guides que vous avez publiés.</p>
        </div>
        <Link to="/wizard" className="btn btn-primary">Créer un nouveau guide</Link>
      </div>

      {authLoading ? (
        <Card>
          <div className="py-6 text-center text-sm text-gray-600">Chargement de votre session...</div>
        </Card>
      ) : null}

      {!authLoading && !owner ? (
        <Card>
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Créez votre espace hôte</h2>
              <p className="text-sm text-gray-600">Enregistrez votre email et un mot de passe pour retrouver vos guides à tout moment.</p>
            </div>
            <form className="space-y-3" onSubmit={handleAuthSubmit}>
              <div className="grid gap-2">
                <label className="text-xs uppercase text-gray-500" htmlFor="owner-email">Email</label>
                <input
                  id="owner-email"
                  type="email"
                  className="input"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs uppercase text-gray-500" htmlFor="owner-password">Mot de passe</label>
                <input
                  id="owner-password"
                  type="password"
                  className="input"
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              {authError && <div className="text-sm text-red-600">{authError}</div>}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Patientez...' : authMode === 'register' ? 'Créer mon espace' : 'Se connecter'}
                </button>
                <button
                  type="button"
                  className="text-sm text-[var(--accent)] hover:underline"
                  onClick={() => {
                    setAuthMode((prev) => (prev === 'register' ? 'login' : 'register'))
                    setAuthError(null)
                  }}
                >
                  {authMode === 'register' ? 'Déjà un compte ? Se connecter' : 'Créer un compte hôte'}
                </button>
              </div>
            </form>
            <p className="text-xs text-gray-500">Les comptes sont stockés dans votre navigateur. Pensez à conserver ces informations pour retrouver vos guides.</p>
          </div>
        </Card>
      ) : null}

      {owner ? (
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm text-gray-600">
              Connecté en tant que <span className="font-medium text-gray-800">{owner.email}</span>
            </div>
            <button type="button" className="btn btn-ghost" onClick={logout}>Se déconnecter</button>
          </div>
        </Card>
      ) : null}

      {owner && guides.length === 0 ? (
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Aucun guide pour l'instant</h2>
              <p className="text-sm text-gray-600">Publiez votre premier guide pour le retrouver facilement ici.</p>
            </div>
            <Link to="/wizard" className="btn btn-outline">Créer mon premier guide</Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {guides.map((guide) => (
            <Card key={guide.guideId}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">{guide.title || 'Guide sans titre'}</h2>
                  {guide.address && <p className="text-sm text-gray-600">{guide.address}</p>}
                  <p className="text-xs text-gray-500 mt-2">Mis à jour le {formatDateTime(guide.updatedAt)}</p>
                  <p className="text-xs text-gray-500">Identifiant: <code>{guide.guideId}</code></p>
                </div>
                <div className="text-sm text-gray-500 flex flex-col items-start sm:items-end gap-1">
                  <span>Créé le {formatDateTime(guide.createdAt)}</span>
                  <span>Liens partagés: <a href={publicGuideUrl(guide, { includeShare: true })} className="text-[var(--accent)] hover:underline" target="_blank" rel="noreferrer">Ouvrir</a></span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to={`/guide/${guide.guideId}`} className="btn btn-outline">Voir le guide</Link>
                <Link to={`/print-qr/${guide.guideId}`} className="btn btn-outline">Imprimer le QR code</Link>
                <button type="button" className="btn btn-ghost" onClick={() => handleContinueEditing(guide)}>Modifier</button>
                <button type="button" className="btn btn-ghost" onClick={() => handleCopyLink(guide)}>
                  {copiedId === guide.guideId ? 'Lien copié !' : 'Copier le lien'}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
