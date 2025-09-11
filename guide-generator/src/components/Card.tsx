import type { ReactNode } from 'react'

export default function Card({ title, children, className = '' }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`card avoid-break ${className}`}>
      {title && <div className="px-4 py-3 border-b text-sm font-medium text-gray-700 flex items-center gap-2">{title}</div>}
      <div className="p-4">{children}</div>
    </div>
  )
}
