import type { StatusCard } from '@/types/database'
import { STATUS_CONFIG } from '@/lib/cards/status'

// Reexportado por compatibilidade: a definição vive em @/lib/cards/status,
// junto das regras de transição, para que rótulo, cor e fluxo não divirjam.
export { STATUS_CONFIG }

export function StatusChip({ status }: { status: StatusCard }) {
  const { label, className } = STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  )
}
