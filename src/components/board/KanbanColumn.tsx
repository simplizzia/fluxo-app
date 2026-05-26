'use client'

import { useDroppable } from '@dnd-kit/core'
import { KanbanCard } from './KanbanCard'
import type { StatusCard } from '@/types/database'
import type { BoardCard } from '@/app/(dashboard)/board/actions'

const COLUMN_CONFIG: Record<
  StatusCard,
  { label: string; headerClass: string; countClass: string }
> = {
  aguardando_info: {
    label: 'Aguardando Info',
    headerClass: 'border-b-amber-400',
    countClass: 'bg-amber-100 text-amber-700',
  },
  a_fazer: {
    label: 'A Fazer',
    headerClass: 'border-b-zinc-400',
    countClass: 'bg-zinc-100 text-zinc-600',
  },
  em_andamento: {
    label: 'Em Andamento',
    headerClass: 'border-b-blue-400',
    countClass: 'bg-blue-100 text-blue-700',
  },
  para_aprovacao: {
    label: 'Para Aprovação',
    headerClass: 'border-b-violet-400',
    countClass: 'bg-violet-100 text-violet-700',
  },
  necessita_ajustes: {
    label: 'Necessita Ajustes',
    headerClass: 'border-b-orange-400',
    countClass: 'bg-orange-100 text-orange-700',
  },
  concluido: {
    label: 'Concluído',
    headerClass: 'border-b-green-400',
    countClass: 'bg-green-100 text-green-700',
  },
  cancelado: {
    label: 'Cancelado',
    headerClass: 'border-b-red-400',
    countClass: 'bg-red-100 text-red-600',
  },
}

interface KanbanColumnProps {
  status: StatusCard
  cards: BoardCard[]
  onNovaDemanada?: () => void
}

export function KanbanColumn({ status, cards, onNovaDemanada }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const config = COLUMN_CONFIG[status]

  return (
    <div className="flex w-72 flex-none flex-col rounded-2xl bg-zinc-50">
      {/* Cabeçalho da coluna */}
      <div
        className={`flex items-center justify-between border-b-2 px-4 py-3 ${config.headerClass}`}
      >
        <span className="text-sm font-semibold text-zinc-700">{config.label}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-bold ${config.countClass}`}
        >
          {cards.length}
        </span>
      </div>

      {/* Lista de cards */}
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2.5 overflow-y-auto p-3 transition-colors ${
          isOver ? 'bg-zinc-100' : ''
        }`}
        style={{ minHeight: 80 }}
      >
        {cards.map((card) => (
          <KanbanCard key={card.id} card={card} />
        ))}

        {cards.length === 0 && !isOver && (
          <div className="rounded-lg border-2 border-dashed border-zinc-200 py-6 text-center">
            <p className="text-xs text-zinc-400">Sem demandas</p>
          </div>
        )}
      </div>

      {/* Botão nova demanda (só na primeira coluna) */}
      {status === 'aguardando_info' && onNovaDemanada && (
        <div className="p-3 pt-0">
          <button
            onClick={onNovaDemanada}
            className="w-full rounded-lg border border-dashed border-zinc-300 py-2 text-xs font-medium text-zinc-500 transition hover:border-zinc-400 hover:text-zinc-700"
          >
            + Nova demanda
          </button>
        </div>
      )}
    </div>
  )
}
