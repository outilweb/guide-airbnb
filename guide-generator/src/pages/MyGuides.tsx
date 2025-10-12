import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import type { Guide } from '../types'
import { deletePublishedGuide, listPublishedGuides, saveDraft } from '../utils/storage'
import { guideShareInfo, downloadGuideHtml } from '../utils/exportGuide'

type GuideSummary = Guide & { guideId: string }

const formatDateTime = (timestamp?: number) => {
  if (!timestamp) return 'Date inconnue'
  return new Date(timestamp).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })
}

export default function MyGuides() {
  const navigate = useNavigate()
  const [guides, setGuides] = useState<GuideSummary[]>([])

  useEffect(() => {
    const load = () => {
      const all = listPublishedGuides().filter((guide): guide is GuideSummary => Boolean(guide.guideId))
      setGuides(all)
    }

    load()
    const handleStorage = () => load()
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const handleContinueEditing = (guide: GuideSummary) => {
    saveDraft(guide)
    navigate('/wizard')
  }

  const handleDownloadHtml = async (guide: GuideSummary) => {
    try {
      await downloadGuideHtml(guide)
    } catch (error) {
      console.error('Impossible de générer le fichier HTML', error)
    }
  }

  const handleDelete = (guideId: string, title?: string) => {
    const name = title?.trim() ? `« ${title.trim()} »` : 'ce guide'
    if (!window.confirm(`Supprimer définitivement ${name} ?`)) return
    deletePublishedGuide(guideId)
    setGuides((prev) => prev.filter((guide) => guide.guideId !== guideId))
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

      {guides.length === 0 ? (
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
          {guides.map((guide) => {
            const share = guideShareInfo(guide)
            return (
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
                    <span>Fichier HTML : <code>{share.fileName}</code></span>
                    <span>
                      URL publique :{' '}
                      <a href={share.shareUrl} target="_blank" rel="noreferrer" className="text-[var(--accent)] hover:underline break-all">
                        {share.shareUrl}
                      </a>
                    </span>
                    <span>Aperçu interne: <a href={`#/guide/${guide.guideId}`} className="text-[var(--accent)] hover:underline">Ouvrir</a></span>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to={`/guide/${guide.guideId}`} className="btn btn-outline">Voir le guide</Link>
                  <Link to={`/print-qr/${guide.guideId}`} className="btn btn-outline">Imprimer le QR code</Link>
                  <button type="button" className="btn btn-outline" onClick={() => handleDownloadHtml(guide)}>
                    💾 Télécharger le HTML
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => handleContinueEditing(guide)}>Modifier</button>
                  <button type="button" className="btn btn-ghost text-red-600" onClick={() => handleDelete(guide.guideId, guide.title)}>
                    Supprimer
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
