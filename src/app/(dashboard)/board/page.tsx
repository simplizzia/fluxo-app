import type { Metadata } from 'next'
import { getCurrentProfile } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { KanbanBoard } from '@/components/board/KanbanBoard'
import type { BoardCard } from './actions'

export const metadata: Metadata = {
  title: 'Board — Simplizzia',
}

// Next.js 16: searchParams é uma Promise
export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{
    cliente?: string
    tipo?: string
    prioridade?: string
    responsavel?: string
    card?: string
  }>
}) {
  const filtros = await searchParams
  const profile = await getCurrentProfile()
  const supabase = await createClient()

  // ---------------------------------------------------------------------------
  // Cards (RLS garante filtragem por papel automaticamente)
  // ---------------------------------------------------------------------------

  const { data: rawCards } = await supabase
    .from('cards')
    .select(`
      id, titulo, status, prioridade, prazo_cliente, confidencial, created_at,
      cliente:clientes!cliente_id(id, nome),
      tipo:tipos_demanda!tipo_id(
        id, nome, categoria,
        sla_ativo, sla_prazo_inicio_horas, sla_prazo_resposta_horas
      ),
      responsavel:profiles!responsavel_id(id, nome)
    `)
    .order('created_at', { ascending: false })

  // Busca campos adicionados em migrações posteriores separadamente para
  // evitar erro caso o schema ainda não tenha sido atualizado no ambiente.
  const cardIds = (rawCards ?? []).map((c) => c.id)
  const { data: extraData } = cardIds.length > 0
    ? await supabase
        .from('cards')
        .select('id, data_entrega_programada, sla_iniciado_em')
        .in('id', cardIds)
    : { data: [] as { id: string; data_entrega_programada?: string | null; sla_iniciado_em?: string | null }[] }

  type ExtraRow = { id: string; data_entrega_programada?: string | null; sla_iniciado_em?: string | null }
  const extraMap = new Map((extraData ?? []).map((c) => [c.id, c as ExtraRow]))

  const cards = (rawCards ?? []).map((c) => {
    const extra = extraMap.get(c.id)
    return {
      ...c,
      data_entrega_programada: extra?.data_entrega_programada ?? null,
      sla_iniciado_em: extra?.sla_iniciado_em ?? null,
      tipo: {
        ...c.tipo,
        sla_ativo: (c.tipo as unknown as { sla_ativo?: boolean })?.sla_ativo ?? false,
        sla_prazo_inicio_horas: (c.tipo as unknown as { sla_prazo_inicio_horas?: number | null })?.sla_prazo_inicio_horas ?? null,
        sla_prazo_resposta_horas: (c.tipo as unknown as { sla_prazo_resposta_horas?: number | null })?.sla_prazo_resposta_horas ?? null,
      },
    }
  }) as unknown as BoardCard[]

  // ---------------------------------------------------------------------------
  // Clientes para filtro e formulário de novo card
  // ---------------------------------------------------------------------------

  const { data: clientes } = await supabase
    .from('clientes')
    .select('id, nome')
    .eq('status', 'ativo')
    .order('nome')

  // ---------------------------------------------------------------------------
  // Tipos de demanda para o formulário
  // ---------------------------------------------------------------------------

  const { data: tipos } = await supabase
    .from('tipos_demanda')
    .select('id, nome, categoria')
    .eq('ativo', true)
    .order('categoria')
    .order('nome')

  // ---------------------------------------------------------------------------
  // Executores para atribuição de responsável
  // ---------------------------------------------------------------------------

  const { data: executores } = await supabase
    .from('profiles')
    .select('id, nome, papel')
    .in('papel', ['socia', 'gestao', 'atendimento', 'executor'])
    .order('nome')

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Board</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Gerencie todas as demandas em andamento.
        </p>
      </div>

      <KanbanBoard
        cards={cards}
        clientes={clientes ?? []}
        tipos={tipos ?? []}
        executores={executores ?? []}
        organizationId={profile.organization_id}
        papelAtual={profile.papel}
        filtrosIniciais={filtros}
        initialCardId={filtros.card}
      />
    </div>
  )
}
