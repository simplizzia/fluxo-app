'use client'

import { useDroppable } from '@dnd-kit/core'
import { KanbanCard } from './KanbanCard'
import type { StatusCard } from '@/types/database'
import type { BoardCard } from '@/app/(dashboard)/board/actions'
import { STATUS_CONFIG, podeMover } from '@/lib/cards/status'

interface KanbanColumnProps {
  status: StatusCard
  cards: BoardCard[]
  onNovaDemanada?: () => void
  onCardDetalhes?: (card: BoardCard) => void
  selectedIds?: Set<string>
  modoSelecao?: boolean
  onSelecionar?: (cardId: string) => void
  /** Status do card sendo arrastado, quando há um arraste em curso. */
  statusArrastado?: StatusCard | null
}

export function KanbanColumn({ status, cards, onNovaDemanada, onCardDetalhes, selectedIds, modoSelecao, onSelecionar, statusArrastado }: KanbanColumnProps) {
  // Uma coluna que a regra de transição não permite deixa de aceitar o drop,
  // em vez de aceitar e falhar no servidor logo depois. O card volta sozinho
  // para a origem e a coluna se apaga durante o arraste, sinalizando o porquê.
  const bloqueada = statusArrastado != null && !podeMover(statusArrastado, status)
  const { setNodeRef, isOver } = useDroppable({ id: status, disabled: bloqueada })
  const config = STATUS_CONFIG[status]

  return (
    <div
      className={`flex w-full flex-none flex-col rounded-2xl bg-zinc-50 transition-opacity md:w-72 ${
        bloqueada ? 'pointer-events-none opacity-40' : ''
      }`}
      aria-disabled={bloqueada || undefined}
    >
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
              {config.vazioMsg}
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
