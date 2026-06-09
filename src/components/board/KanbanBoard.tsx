'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
import { CardDetailDrawer } from './CardDetailDrawer'
import { CardFilters } from './CardFilters'
import { BulkActionsBar } from './BulkActionsBar'
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
  initialCardId?: string
}

export function KanbanBoard({
  cards: cardsIniciais,
  clientes,
  tipos,
  executores,
  organizationId,
  papelAtual,
  filtrosIniciais,
  initialCardId,
}: KanbanBoardProps) {
  const [cards, setCards] = useState<BoardCard[]>(cardsIniciais)
  const [activeCard, setActiveCard] = useState<BoardCard | null>(null)
  const [dialogAberto, setDialogAberto] = useState(false)
  const [cardDetalhe, setCardDetalhe] = useState<BoardCard | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const podeSelecionarEmLote = papelAtual === 'socia' || papelAtual === 'gestao'
  const modoSelecao = selectedIds.size > 0

  function toggleSelecao(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function handleBulkUpdate(ids: string[], update: Partial<BoardCard>) {
    setCards((prev) =>
      prev.map((c) => (ids.includes(c.id) ? { ...c, ...update } : c)),
    )
    setSelectedIds(new Set())
  }

  // Abre o drawer para o card especificado via ?card=uuid na URL
  useEffect(() => {
    if (initialCardId) {
      const card = cardsIniciais.find((c) => c.id === initialCardId)
      if (card) setCardDetalhe(card)
    }
    // Só roda uma vez na montagem
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Toast da Izzi
  const [izziToast, setIzziToast] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Limpa o timer ao desmontar para não atualizar estado em componente morto
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  function mostrarIzziToast(mensagem: string) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setIzziToast(mensagem)
    toastTimerRef.current = setTimeout(() => setIzziToast(null), 3500)
  }

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
                    data_entrega_programada: payload.new.data_entrega_programada,
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
        async (payload) => {
          const cardId = (payload.new as { id?: string })?.id
          if (!cardId) return

          // Busca o card completo com joins (RLS garante acesso correto por papel)
          const [{ data }, { data: entregaRow }] = await Promise.all([
            supabase
              .from('cards')
              .select(`
                id, titulo, status, prioridade, prazo_cliente, confidencial, created_at,
                cliente:clientes!cliente_id(id, nome),
                tipo:tipos_demanda!tipo_id(id, nome, categoria),
                responsavel:profiles!responsavel_id(id, nome)
              `)
              .eq('id', cardId)
              .single(),
            supabase
              .from('cards')
              .select('data_entrega_programada')
              .eq('id', cardId)
              .single(),
          ])

          if (!data) return

          const cardCompleto = {
            ...data,
            data_entrega_programada:
              (entregaRow as { data_entrega_programada?: string | null } | null)
                ?.data_entrega_programada ?? null,
          } as unknown as BoardCard

          setCards((prev) => {
            // Evita duplicata: onCardCriado pode ter adicionado antes do evento chegar
            if (prev.find((c) => c.id === cardId)) return prev
            return [cardCompleto, ...prev]
          })
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
    mostrarIzziToast(`Demanda criada! Ela já está em Aguardando Informações.`)
  }

  function handleCardUpdated(cardAtualizado: BoardCard) {
    setCards((prev) => prev.map((c) => (c.id === cardAtualizado.id ? cardAtualizado : c)))
    // Mantém o drawer sincronizado
    setCardDetalhe((prev) => (prev?.id === cardAtualizado.id ? cardAtualizado : prev))
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
          papelAtual={papelAtual}
        />

        {podecriarDemanda && (
          <button
            onClick={() => setDialogAberto(true)}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
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
                onCardDetalhes={modoSelecao ? undefined : setCardDetalhe}
                selectedIds={podeSelecionarEmLote ? selectedIds : undefined}
                modoSelecao={modoSelecao}
                onSelecionar={podeSelecionarEmLote ? toggleSelecao : undefined}
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

      {/* Drawer de detalhe do card — key força remontagem completa ao trocar de card,
          evitando que estado (comentários, arquivos, texto pendente) vaze entre cards */}
      {cardDetalhe && (
        <CardDetailDrawer
          key={cardDetalhe.id}
          card={cardDetalhe}
          papelAtual={papelAtual}
          onClose={() => setCardDetalhe(null)}
          onCardUpdated={handleCardUpdated}
        />
      )}

      {/* Barra de ações em lote — socia e gestao apenas */}
      {podeSelecionarEmLote && modoSelecao && (
        <BulkActionsBar
          selectedIds={[...selectedIds]}
          executores={executores}
          onClear={() => setSelectedIds(new Set())}
          onCardsUpdated={handleBulkUpdate}
        />
      )}

      {/* Toast da Izzi */}
      {izziToast && (
        <div
          className="fixed bottom-6 right-6 z-[60] flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-lg"
          style={{ animation: 'fadeInUp 0.2s ease-out' }}
        >
          {/* Avatar da Izzi no toast */}
          <div
            className="flex h-7 w-7 flex-none items-center justify-center rounded-xl font-display text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #A046C6 0%, #F9267C 100%)' }}
          >
            I
          </div>
          <div>
            <p className="text-[11px] font-semibold text-brand">Izzi</p>
            <p className="text-xs text-zinc-700">{izziToast}</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
