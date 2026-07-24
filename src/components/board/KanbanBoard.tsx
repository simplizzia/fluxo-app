'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
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
import { useToast } from '@/components/shared/Toast'
import { actionMoverCard } from '@/app/(dashboard)/board/actions'
import type { BoardCard } from '@/app/(dashboard)/board/actions'
import type { StatusCard, PrioridadeCard, PapelUsuario } from '@/types/database'
import { ORDEM_STATUS, motivoBloqueio } from '@/lib/cards/status'

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
  const { izzi: toastIzzi, error: toastError } = useToast()
  const [cards, setCards] = useState<BoardCard[]>(cardsIniciais)
  const [activeCard, setActiveCard] = useState<BoardCard | null>(null)
  const [dialogAberto, setDialogAberto] = useState(false)
  const [cardDetalhe, setCardDetalhe] = useState<BoardCard | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const temFiltroAtivo = Object.values(filtrosIniciais).some(Boolean)
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

  // Os filtros são aplicados na query do servidor (board/page.tsx); `cards` já
  // chega filtrado. Esta função existe só para o caminho de Realtime: um card
  // criado por outra pessoa não deve aparecer se não couber no filtro atual.
  const correspondeAosFiltros = useCallback(
    (c: BoardCard) => {
      if (filtrosIniciais.cliente && c.cliente.id !== filtrosIniciais.cliente) return false
      if (filtrosIniciais.tipo && c.tipo.id !== filtrosIniciais.tipo) return false
      if (filtrosIniciais.prioridade && c.prioridade !== filtrosIniciais.prioridade) return false
      if (filtrosIniciais.responsavel && c.responsavel?.id !== filtrosIniciais.responsavel)
        return false
      return true
    },
    [filtrosIniciais],
  )

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

          // Busca o card completo com joins (RLS garante acesso correto por papel).
          // Era feito em duas queries à mesma tabela, por defesa contra schema
          // desatualizado; com os tipos regenerados, uma basta.
          const { data } = await supabase
            .from('cards')
            .select(`
              id, titulo, status, prioridade, prazo_cliente, confidencial, created_at,
              data_entrega_programada, sla_iniciado_em,
              cliente:clientes!cliente_id(id, nome),
              tipo:tipos_demanda!tipo_id(
                id, nome, categoria,
                sla_ativo, sla_prazo_inicio_horas, sla_prazo_resposta_horas
              ),
              responsavel:profiles!responsavel_id(id, nome),
              marca:onboarding_marcas!marca_id(id, nome)
            `)
            .eq('id', cardId)
            .single()

          if (!data) return

          const cardCompleto = data as unknown as BoardCard

          if (!correspondeAosFiltros(cardCompleto)) return

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
  }, [organizationId, correspondeAosFiltros])

  // DnD sensors — requer movimento mínimo (mouse) ou toque longo (touch) para iniciar o drag.
  // O delay no toque preserva o tap simples para abrir o card no mobile.
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
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

      // A coluna já recusa o drop quando a transição é proibida, mas repetimos
      // a checagem aqui: assim nada se move na tela para voltar logo depois, e
      // a pessoa lê o motivo em vez de ver o card saltar.
      const bloqueio = motivoBloqueio(card.status, novoStatus)
      if (bloqueio) {
        toastError(bloqueio)
        return
      }

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
          toastError(result.error)
        }
      })
    },
    [cards, toastError],
  )

  function handleCardCriado(card: BoardCard) {
    setCards((prev) => [card, ...prev])
    toastIzzi('Demanda criada! Ela já está em Aguardando Informações.')
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
        {`${cards.length} demanda${cards.length !== 1 ? 's' : ''}`}
        {temFiltroAtivo && ' (filtrado)'}
      </p>

      {/* Board Kanban — empilha no mobile, scroll horizontal a partir de md */}
      <div className="flex-1 overflow-y-auto pb-6 md:overflow-x-auto md:overflow-y-visible">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-col gap-4 md:min-w-max md:flex-row">
            {ORDEM_STATUS.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                cards={cards.filter((c) => c.status === status)}
                onNovaDemanada={
                  status === 'aguardando_info' && podecriarDemanda
                    ? () => setDialogAberto(true)
                    : undefined
                }
                statusArrastado={activeCard?.status ?? null}
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

    </div>
  )
}
