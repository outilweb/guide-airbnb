import type { ReactNode } from 'react'

export default function ListRepeater({ items, onAdd, renderItem, addLabel }: { items: any[]; onAdd: () => void; renderItem: (idx: number) => ReactNode; addLabel: string }) {
  return (
    <div className="space-y-3">
      {items.map((_, idx) => (
        <div key={idx} className="bg-gray-50 border rounded p-3">{renderItem(idx)}</div>
      ))}
      <button type="button" onClick={onAdd} className="text-sm text-[var(--accent)]">{addLabel}</button>
    </div>
  )
}
