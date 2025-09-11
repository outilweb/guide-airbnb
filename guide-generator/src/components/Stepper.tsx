export default function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <ol className="flex items-center justify-between gap-2">
        {steps.map((s, i) => (
          <li key={s} className="flex-1 flex items-center">
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold border ${i <= current ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-gray-100 text-gray-600 border-gray-300'}`}>{i + 1}</div>
              <span className={`ml-2 text-xs sm:text-sm ${i === current ? 'text-gray-900' : 'text-gray-600'}`}>{s}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px flex-1 mx-3 ${i < current ? 'bg-[var(--accent)]' : 'bg-gray-200'}`}></div>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
