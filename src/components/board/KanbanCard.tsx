'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Lock, Calendar, User } from 'lucide-react'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import type { BoardCard } from '@/app/(dashboard)/board/actions'

interface KanbanCardProps {
  card: BoardCard
  isOverlay?: boolean
}

export function KanbanCard({ card, isOverlay = false }: KanbanCardProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        group relative rounded-xl border bg-white p-3.5 shadow-sm
        transition-all duration-150 cursor-grab active:cursor-grabbing
        ${isDragging ? 'opacity-40 ring-2 ring-zinc-300 shadow-lg' : 'hover:shadow-md hover:border-zinc-300'}
        ${isOverlay ? 'rotate-2 shadow-xl ring-2 ring-zinc-200' : ''}
        ${card.prioridade === 'urgente' ? 'border-l-4 border-l-red-500' : 'border-zinc-200'}
      `}
    >
      {/* Linha superior: prioridade + confidencial */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <PriorityBadge prioridade={card.prioridade} size="xs" />
        {card.confidencial && (
          <span title="Confidencial">
            <Lock className="h-3 w-3 text-zinc-400" />
          </span>
        )}
      </div>

      {/* Título */}
      <p className="mb-2 text-sm font-medium leading-snug text-zinc-900 line-clamp-2">
        {card.titulo}
      </p>

      {/* Cliente + Tipo */}
      <div className="mb-3 space-y-0.5">
        <p className="text-xs font-medium text-zinc-600">{card.cliente.nome}</p>
        <p className="text-xs text-zinc-400">{card.tipo.nome}</p>
      </div>

      {/* Linha inferior: prazo + responsável */}
      <div className="flex items-center justify-between gap-2">
        {prazoLabel ? (
          <span
            className={`flex items-center gap-1 text-xs ${
              isAtrasado ? 'text-red-600 font-medium' : 'text-zinc-400'
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
            className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-semibold text-zinc-600"
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
