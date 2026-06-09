'use client'

import { useDroppable } from '@dnd-kit/core'
import { KanbanCard } from './KanbanCard'
import type { StatusCard } from '@/types/database'
import type { BoardCard } from '@/app/(dashboard)/board/actions'

const COLUMN_CONFIG: Record<
  StatusCard,
  { label: string; headerClass: string; countClass: string; izziEmpty: string }
> = {
  aguardando_info: {
    label: 'Aguardando Info',
    headerClass: 'border-t-amber-400',
    countClass: 'bg-amber-100 text-amber-700',
    izziEmpty: 'Nenhuma demanda aguardando informações.',
  },
  a_fazer: {
    label: 'A Fazer',
    headerClass: 'border-t-zinc-300',
    countClass: 'bg-zinc-100 text-zinc-600',
    izziEmpty: 'Tudo certo por aqui.',
  },
  em_andamento: {
    label: 'Em Andamento',
    headerClass: 'border-t-blue-400',
    countClass: 'bg-blue-100 text-blue-700',
    izziEmpty: 'Nada em produção no momento.',
  },
  para_aprovacao: {
    label: 'Para Aprovação',
    headerClass: 'border-t-violet-400',
    countClass: 'bg-violet-100 text-violet-700',
    izziEmpty: 'Sem aprovações pendentes.',
  },
  necessita_ajustes: {
    label: 'Necessita Ajustes',
    headerClass: 'border-t-orange-400',
    countClass: 'bg-orange-100 text-orange-700',
    izziEmpty: 'Sem ajustes pendentes!',
  },
  concluido: {
    label: 'Concluído',
    headerClass: 'border-t-green-400',
    countClass: 'bg-green-100 text-green-700',
    izziEmpty: 'As entregas concluídas aparecem aqui.',
  },
  cancelado: {
    label: 'Cancelado',
    headerClass: 'border-t-red-400',
    countClass: 'bg-red-100 text-red-600',
    izziEmpty: 'Nenhum card cancelado.',
  },
}

interface KanbanColumnProps {
  status: StatusCard
  cards: BoardCard[]
  onNovaDemanada?: () => void
  onCardDetalhes?: (card: BoardCard) => void
  selectedIds?: Set<string>
  modoSelecao?: boolean
  onSelecionar?: (cardId: string) => void
}

export function KanbanColumn({ status, cards, onNovaDemanada, onCardDetalhes, selectedIds, modoSelecao, onSelecionar }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const config = COLUMN_CONFIG[status]

  return (
    <div className="flex w-72 flex-none flex-col rounded-2xl bg-zinc-50">
      {/* Cabeçalho da coluna — borda top 3px colorida */}
      <div
        className={`flex items-center justify-between rounded-t-2xl border-t-[3px] bg-white px-4 py-3 shadow-sm ${config.headerClass}`}
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
          isOver ? 'bg-brand-light/40' : ''
        }`}
        style={{ minHeight: 80 }}
      >
        {cards.map((card) => (
          <KanbanCard
            key={card.id}
            card={card}
            onDetalhes={() => onCardDetalhes?.(card)}
            isSelected={selectedIds?.has(card.id)}
            modoSelecao={modoSelecao}
            onSelecionar={onSelecionar ? () => onSelecionar(card.id) : undefined}
          />
        ))}

        {cards.length === 0 && !isOver && (
          <div className="rounded-xl border-2 border-dashed border-zinc-200 px-3 py-5 text-center">
            <p className="text-[11px] text-zinc-400">
              <span className="font-medium text-brand">Izzi</span>
              {' · '}
              {config.izziEmpty}
            </p>
          </div>
        )}
      </div>

      {/* Botão nova demanda (só na primeira coluna) */}
      {status === 'aguardando_info' && onNovaDemanada && (
        <div className="p-3 pt-0">
          <button
            onClick={onNovaDemanada}
            className="w-full rounded-xl border border-dashed border-zinc-300 py-2 text-xs font-medium text-zinc-500 transition hover:border-brand/40 hover:text-brand"
          >
            + Nova demanda
          </button>
        </div>
      )}
    </div>
  )
}
