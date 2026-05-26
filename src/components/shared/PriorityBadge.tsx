import type { PrioridadeCard } from '@/types/database'

const CONFIG: Record<
  PrioridadeCard,
  { label: string; className: string; dot: string }
> = {
  urgente: {
    label: 'Urgente',
    className: 'bg-red-100 text-red-700 border-red-200',
    dot: 'bg-red-500',
  },
  alta: {
    label: 'Alta',
    className: 'bg-orange-100 text-orange-700 border-orange-200',
    dot: 'bg-orange-500',
  },
  normal: {
    label: 'Normal',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  baixa: {
    label: 'Baixa',
    className: 'bg-zinc-100 text-zinc-500 border-zinc-200',
    dot: 'bg-zinc-400',
  },
}

export function PriorityBadge({
  prioridade,
  size = 'sm',
}: {
  prioridade: PrioridadeCard
  size?: 'xs' | 'sm'
}) {
  const { label, className, dot } = CONFIG[prioridade]

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium ${
        size === 'xs' ? 'text-[10px]' : 'text-xs'
      } ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  )
}
