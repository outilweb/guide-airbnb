import { useEffect, useState } from 'react'

export default function SaveHint({ trigger }: { trigger: any }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 1200)
    return () => clearTimeout(t)
  }, [trigger])
  return (
    <div className={`fixed right-4 bottom-4 transition-opacity no-print ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded shadow">Sauvegardé automatiquement</div>
    </div>
  )
}

