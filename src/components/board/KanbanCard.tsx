'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Lock, Calendar, User, Timer } from 'lucide-react'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { slaParaCard, slaLabel, slaChipClass } from '@/lib/sla'
import type { BoardCard } from '@/app/(dashboard)/board/actions'

interface KanbanCardProps {
  card: BoardCard
  isOverlay?: boolean
  onDetalhes?: () => void
  isSelected?: boolean
  modoSelecao?: boolean
  onSelecionar?: () => void
}

export function KanbanCard({ card, isOverlay = false, onDetalhes, isSelected = false, modoSelecao = false, onSelecionar }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: { card },
    disabled: isOverlay,
  })

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined

  const prazoLabel = card.prazo_cliente
    ? new Date(card.prazo_cliente + 'T00:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
      })
    : null

  const isAtrasado =
    card.prazo_cliente &&
    new Date(card.prazo_cliente + 'T23:59:59') < new Date() &&
    card.status !== 'concluido' &&
    card.status !== 'cancelado'

  // Previsão de entrega agendada (data_entrega_programada)
  const previsaoLabel = card.data_entrega_programada
    ? new Date(card.data_entrega_programada).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
      })
    : null

  // SLA
  const slaInfo = slaParaCard({
    status: card.status,
    created_at: card.created_at,
    sla_iniciado_em: card.sla_iniciado_em,
    tipo: card.tipo,
  })
  const slaBadgeClass = slaInfo ? slaChipClass(slaInfo.status) : null

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      suppressHydrationWarning
      onClick={() => {
        if (isDragging) return
        if (modoSelecao) { onSelecionar?.(); return }
        onDetalhes?.()
      }}
      className={`
        group relative rounded-xl border bg-white p-3.5 shadow-sm
        transition-all duration-150 cursor-grab active:cursor-grabbing
        ${isDragging ? 'opacity-40 ring-2 ring-zinc-300 shadow-lg' : 'hover:shadow-md hover:border-zinc-300'}
        ${isOverlay ? 'rotate-2 shadow-xl ring-2 ring-brand/20' : ''}
        ${isSelected ? 'ring-2 ring-brand border-brand/30' : card.prioridade === 'urgente' ? 'border-l-4 border-l-red-500 border-zinc-200' : 'border-zinc-200'}
      `}
    >
      {/* Checkbox de seleção (visível no hover ou em modo seleção) */}
      {!isOverlay && onSelecionar && (
        <div
          className={`absolute left-2 top-2 z-10 transition-opacity ${isSelected || modoSelecao ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onSelecionar() }}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {}}
            aria-label={`Selecionar demanda: ${card.titulo}`}
            className="h-3.5 w-3.5 cursor-pointer rounded accent-brand"
          />
        </div>
      )}

      {/* Linha superior: prioridade + confidencial */}
      <div className={`mb-2.5 flex items-center justify-between gap-2 ${onSelecionar ? 'pl-5' : ''}`}>
        <PriorityBadge prioridade={card.prioridade} size="xs" />
        {card.confidencial && (
          <span title="Confidencial">
            <Lock className="h-3 w-3 text-zinc-400" />
          </span>
        )}
      </div>

      {/* Título */}
      <p className="mb-2.5 text-[13px] font-semibold leading-snug text-zinc-900 line-clamp-2">
        {card.titulo}
      </p>

      {/* Cliente em pill de marca + Tipo */}
      <div className="mb-3 space-y-1">
        <div className="flex flex-wrap items-center gap-1">
          <span className="inline-block rounded-full bg-brand-light px-2 py-0.5 text-[11px] font-medium text-brand">
            {card.cliente.nome}
          </span>
          {/* Num cliente multimarca (Trevo tem Trevo e Ehrmann), saber de qual
              marca é o card é o que evita misturar as duas no trabalho. */}
          {card.marca && (
            <span className="inline-block rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
              {card.marca.nome}
            </span>
          )}
        </div>
        <p className="text-[11px] text-zinc-400">{card.tipo.nome}</p>
      </div>

      {/* Previsão de entrega agendada */}
      {previsaoLabel && (
        <div className="mb-2">
          <span className="flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-600">
            <Calendar className="h-3 w-3" />
            Previsão: {previsaoLabel}
          </span>
        </div>
      )}

      {/* Badge SLA (atenção ou violado) */}
      {slaBadgeClass && slaInfo && (
        <div className="mb-2">
          <span className={`flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${slaBadgeClass}`}>
            <Timer className="h-3 w-3" />
            {slaLabel(slaInfo)}
          </span>
        </div>
      )}

      {/* Linha inferior: prazo interno + responsável */}
      <div className="flex items-center justify-between gap-2">
        {prazoLabel ? (
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${
              isAtrasado
                ? 'bg-red-50 text-red-600 font-medium'
                : 'bg-zinc-100 text-zinc-500'
            }`}
          >
            <Calendar className="h-3 w-3" />
            {prazoLabel}
          </span>
        ) : (
          <span />
        )}

        {card.responsavel ? (
          <span
            title={card.responsavel.nome}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-light text-[10px] font-bold text-brand ring-2 ring-white"
          >
            {card.responsavel.nome
              .split(' ')
              .slice(0, 2)
              .map((n) => n[0])
              .join('')
              .toUpperCase()}
          </span>
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-zinc-300">
            <User className="h-3 w-3 text-zinc-300" />
          </span>
        )}
      </div>
    </div>
  )
}
