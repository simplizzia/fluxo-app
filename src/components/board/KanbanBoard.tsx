'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { KanbanColumn } from './KanbanColumn'
import { KanbanCard } from './KanbanCard'
import { NewCardDialog } from './NewCardDialog'
import { CardFilters } from './CardFilters'
import { actionMoverCard } from '@/app/(dashboard)/board/actions'
import type { BoardCard } from '@/app/(dashboard)/board/actions'
import type { StatusCard, PrioridadeCard, PapelUsuario } from '@/types/database'

const COLUNAS: StatusCard[] = [
  'aguardando_info',
  'a_fazer',
  'em_andamento',
  'para_aprovacao',
  'necessita_ajustes',
  'concluido',
  'cancelado',
]

interface TipoBasico {
  id: string
  nome: string
  categoria: string
}

interface ClienteBasico {
  id: string
  nome: string
}

interface ExecutorBasico {
  id: string
  nome: string
  papel: PapelUsuario
}

interface KanbanBoardProps {
  cards: BoardCard[]
  clientes: ClienteBasico[]
  tipos: TipoBasico[]
  executores: ExecutorBasico[]
  organizationId: string
  papelAtual: PapelUsuario
  filtrosIniciais: {
    cliente?: string
    tipo?: string
    prioridade?: string
    responsavel?: string
  }
}

export function KanbanBoard({
  cards: cardsIniciais,
  clientes,
  tipos,
  executores,
  organizationId,
  papelAtual,
  filtrosIniciais,
}: KanbanBoardProps) {
  const [cards, setCards] = useState<BoardCard[]>(cardsIniciais)
  const [activeCard, setActiveCard] = useState<BoardCard | null>(null)
  const [dialogAberto, setDialogAberto] = useState(false)

  // Supabase Realtime — sincroniza mudanças de outros usuários
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`kanban-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cards',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === payload.new.id
                ? {
                    ...c,
                    status: payload.new.status as StatusCard,
                    prioridade: payload.new.prioridade as PrioridadeCard,
                    titulo: payload.new.titulo,
                    prazo_cliente: payload.new.prazo_cliente,
                    confidencial: payload.new.confidencial,
                  }
                : c,
            ),
          )
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cards',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          // INSERT: o card já foi adicionado pelo próprio usuário via onCardCriado
          // Para outros clientes, fazemos um reload simples da página
          // (em Sprint 2.1 migraremos para busca incremental)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [organizationId])

  // Filtros aplicados (client-side)
  const cardsFiltrados = cards.filter((c) => {
    if (filtrosIniciais.cliente && c.cliente.id !== filtrosIniciais.cliente) return false
    if (filtrosIniciais.tipo && c.tipo.id !== filtrosIniciais.tipo) return false
    if (filtrosIniciais.prioridade && c.prioridade !== filtrosIniciais.prioridade) return false
    if (filtrosIniciais.responsavel && c.responsavel?.id !== filtrosIniciais.responsavel)
      return false
    return true
  })

  // DnD sensors — requer movimento mínimo para iniciar o drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  )

  function handleDragStart(event: DragStartEvent) {
    const card = cards.find((c) => c.id === event.active.id)
    if (card) setActiveCard(card)
  }

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveCard(null)
      const { active, over } = event
      if (!over) return

      const cardId = active.id as string
      const novoStatus = over.id as StatusCard
      const card = cards.find((c) => c.id === cardId)

      if (!card || card.status === novoStatus) return

      // Update otimista: aplica imediatamente na UI
      const statusAnterior = card.status
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, status: novoStatus } : c)),
      )

      // Persiste no banco
      actionMoverCard(cardId, novoStatus).then((result) => {
        if (result.error) {
          // Reverte se falhou
          setCards((prev) =>
            prev.map((c) => (c.id === cardId ? { ...c, status: statusAnterior } : c)),
          )
        }
      })
    },
    [cards],
  )

  function handleCardCriado(card: BoardCard) {
    setCards((prev) => [card, ...prev])
  }

  const podecriarDemanda = papelAtual !== 'executor'

  return (
    <div className="flex h-full flex-col gap-5">
      {/* Cabeçalho do board */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <CardFilters
          clientes={clientes}
          tipos={tipos}
          executores={executores}
        />

        {podecriarDemanda && (
          <button
            onClick={() => setDialogAberto(true)}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            <Plus className="h-4 w-4" />
            Nova demanda
          </button>
        )}
      </div>

      {/* Contador total */}
      <p className="text-xs text-zinc-400">
        {cardsFiltrados.length === cards.length
          ? `${cards.length} demanda${cards.length !== 1 ? 's' : ''}`
          : `${cardsFiltrados.length} de ${cards.length} demanda${cards.length !== 1 ? 's' : ''} (filtrado)`}
      </p>

      {/* Board Kanban com scroll horizontal */}
      <div className="flex-1 overflow-x-auto pb-6">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
            {COLUNAS.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                cards={cardsFiltrados.filter((c) => c.status === status)}
                onNovaDemanada={
                  status === 'aguardando_info' && podecriarDemanda
                    ? () => setDialogAberto(true)
                    : undefined
                }
              />
            ))}
          </div>

          {/* Overlay do card sendo arrastado */}
          <DragOverlay>
            {activeCard ? <KanbanCard card={activeCard} isOverlay /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Dialog de nova demanda */}
      {dialogAberto && (
        <NewCardDialog
          clientes={clientes}
          tipos={tipos}
          executores={executores}
          papelAtual={papelAtual}
          onCardCriado={handleCardCriado}
          onClose={() => setDialogAberto(false)}
        />
      )}
    </div>
  )
}
