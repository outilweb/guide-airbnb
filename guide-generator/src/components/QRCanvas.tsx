import { QRCodeCanvas } from 'qrcode.react'

export default function QRCanvas({ url, size = 256 }: { url: string; size?: number }) {
  return (
    <div className="bg-white p-3 inline-block rounded">
      <QRCodeCanvas value={url} size={size} level="H" includeMargin={true} />
    </div>
  )
}

