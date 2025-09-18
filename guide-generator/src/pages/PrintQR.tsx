import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import QRCanvas from '../components/QRCanvas'
import { publicGuideUrl } from '../utils/url'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { loadPublished } from '../utils/storage'
import type { Guide } from '../types'

export default function PrintQR() {
  const { guideId } = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)
  const url = guideId ? publicGuideUrl(guideId) : ''
  const [guide, setGuide] = useState<Guide | null>(null)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')

  useEffect(() => { if (!guideId) navigate('/'); else setGuide(loadPublished(guideId)) }, [guideId])

  // If URL contains ?auto=1, open print dialog automatically once mounted
  useEffect(() => {
    if (search.get('auto') === '1') {
      const t = setTimeout(() => window.print(), 300)
      return () => clearTimeout(t)
    }
  }, [search])

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
            <QRCanvas url={url} size={512} />
          </div>
          {guide?.title && <h1 className="text-2xl font-bold no-print">{guide.title}</h1>}
          <p className="no-print">Scannez-moi pour accéder au guide du logement</p>
          {url && (
            <div className="no-print w-full max-w-lg mx-auto bg-gray-100 border border-gray-200 rounded px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <span className="text-xs text-gray-600 break-all sm:flex-1 sm:text-left">{url}</span>
              <button
                type="button"
                className="btn btn-outline mt-2 sm:mt-0"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(url)
                    setCopyState('copied')
                    setTimeout(() => setCopyState('idle'), 1500)
                  } catch (error) {
                    console.error('Impossible de copier le lien', error)
                    setCopyState('error')
                  }
                }}
              >
                {copyState === 'copied' ? 'Lien copié !' : copyState === 'error' ? 'Copie impossible' : 'Copier le lien'}
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="no-print mt-4 flex gap-2">
        <button className="px-4 py-2 rounded bg-[var(--accent)] text-white" onClick={onDownloadPdf}>Télécharger PDF</button>
        <button className="px-4 py-2 rounded border" onClick={() => window.print()}>Imprimer</button>
      </div>
    </div>
  )
}
