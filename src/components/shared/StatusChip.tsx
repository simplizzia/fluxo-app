import type { StatusCard } from '@/types/database'

export const STATUS_CONFIG: Record<
  StatusCard,
  { label: string; className: string; bg: string }
> = {
  aguardando_info: {
    label: 'Aguardando Info',
    className: 'text-amber-700 bg-amber-50 border-amber-200',
    bg: 'bg-amber-50',
  },
  a_fazer: {
    label: 'A Fazer',
    className: 'text-zinc-600 bg-zinc-100 border-zinc-200',
    bg: 'bg-zinc-50',
  },
  em_andamento: {
    label: 'Em Andamento',
    className: 'text-blue-700 bg-blue-50 border-blue-200',
    bg: 'bg-blue-50',
  },
  para_aprovacao: {
    label: 'Para Aprovação',
    className: 'text-violet-700 bg-violet-50 border-violet-200',
    bg: 'bg-violet-50',
  },
  necessita_ajustes: {
    label: 'Necessita Ajustes',
    className: 'text-orange-700 bg-orange-50 border-orange-200',
    bg: 'bg-orange-50',
  },
  concluido: {
    label: 'Concluído',
    className: 'text-green-700 bg-green-50 border-green-200',
    bg: 'bg-green-50',
  },
  cancelado: {
    label: 'Cancelado',
    className: 'text-red-600 bg-red-50 border-red-200',
    bg: 'bg-red-50',
  },
}

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
