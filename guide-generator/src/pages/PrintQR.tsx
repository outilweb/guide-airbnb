import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import QRCanvas from '../components/QRCanvas'
import { guideShareInfo, downloadGuideHtml } from '../utils/exportGuide'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { loadPublished } from '../utils/storage'
import type { Guide } from '../types'

export default function PrintQR() {
  const { guideId } = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)
  const [guide, setGuide] = useState<Guide | null>(null)
  const shareInfo = useMemo(() => (guide?.guideId ? guideShareInfo(guide) : null), [guide])
  const [downloadState, setDownloadState] = useState<'idle' | 'success' | 'error'>('idle')

  useEffect(() => { if (!guideId) navigate('/'); else setGuide(loadPublished(guideId)) }, [guideId])

  // If URL contains ?auto=1, open print dialog automatically once mounted
  useEffect(() => {
    if (search.get('auto') === '1') {
      const t = setTimeout(() => window.print(), 300)
      return () => clearTimeout(t)
    }
  }, [search])

  const handleDownload = async () => {
    if (!guide?.guideId) return
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

  const onDownloadPdf = async () => {
    if (!ref.current) return
    const canvas = await html2canvas(ref.current, { scale: 2 })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight)
    pdf.save('qr.pdf')
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div ref={ref} className="bg-white shadow rounded p-8 print-padded qr-print">
        <div className="text-center space-y-4">
          <div className="mx-auto" style={{ width: 512 }}>
            <QRCanvas url={shareInfo?.shareUrl || ''} size={512} />
          </div>
          {guide?.title && <h1 className="text-2xl font-bold no-print">{guide.title}</h1>}
          <p className="text-base text-gray-700">Scannez ce QR code pour ouvrir le guide en ligne immédiatement.</p>
          {shareInfo && (
            <div className="no-print w-full max-w-lg mx-auto bg-gray-100 border border-gray-200 rounded px-3 py-3 space-y-3 text-left">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Lien en ligne</div>
                <a
                  href={shareInfo.shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-[var(--accent)] break-all hover:underline"
                >
                  {shareInfo.shareUrl}
                </a>
                <p className="mt-1 text-xs text-gray-500">
                  Ce lien dirige toujours vers la version publiée du guide.
                </p>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Fichier HTML</div>
                <span className="text-sm text-gray-700 break-all">{shareInfo.fileName}</span>
                <p className="mt-1 text-xs text-gray-500">
                  Téléchargez ce fichier si vous souhaitez diffuser le guide hors connexion.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="no-print mt-4 flex flex-wrap gap-2">
        <button className="btn btn-primary" type="button" onClick={handleDownload}>
          {downloadState === 'success' ? 'HTML téléchargé !' : '💾 Télécharger le guide (HTML)'}
        </button>
        <button className="btn btn-outline" type="button" onClick={onDownloadPdf}>Télécharger PDF</button>
        <button className="btn btn-outline" type="button" onClick={() => window.print()}>Imprimer</button>
      </div>
      {downloadState === 'error' && (
        <p className="no-print mt-2 text-xs text-red-600">Impossible de générer le fichier HTML. Réessayez plus tard.</p>
      )}
    </div>
  )
}
