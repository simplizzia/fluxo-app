import type { Metadata } from 'next'
import { getCurrentProfile } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { KanbanBoard } from '@/components/board/KanbanBoard'
import type { BoardCard } from './actions'
import type { PrioridadeCard } from '@/types/database'

export const metadata: Metadata = {
  title: 'Board — Simplizzia',
}

const PRIORIDADES: readonly PrioridadeCard[] = ['urgente', 'alta', 'normal', 'baixa']

function ehPrioridade(v: string): v is PrioridadeCard {
  return (PRIORIDADES as readonly string[]).includes(v)
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

  // Uma consulta só. Antes eram duas: a principal e outra apenas para
  // data_entrega_programada e sla_iniciado_em, "para evitar erro caso o schema
  // ainda não tenha sido atualizado". Com os tipos regenerados a defesa perdeu
  // a razão de ser — e ela custava uma ida extra ao banco a cada render.
  let query = supabase
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

  // Filtros no banco, não no navegador. Antes a query trazia todos os cards
  // visíveis e o cliente escondia os demais em JS — além de desperdício, o
  // estado só era semeado na montagem, então trocar o filtro na URL não
  // atualizava os dados.
  if (filtros.cliente) query = query.eq('cliente_id', filtros.cliente)
  if (filtros.tipo) query = query.eq('tipo_id', filtros.tipo)
  if (filtros.responsavel) query = query.eq('responsavel_id', filtros.responsavel)
  // A prioridade vem da URL, então é texto livre até ser conferida contra o enum.
  if (filtros.prioridade && ehPrioridade(filtros.prioridade)) {
    query = query.eq('prioridade', filtros.prioridade)
  }

  const { data: rawCards } = await query.order('created_at', { ascending: false })

  const cards = (rawCards ?? []) as unknown as BoardCard[]

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

      {/* A key remonta o board quando o filtro muda. Sem ela o estado local de
          `cards` seria semeado só na montagem, e trocar o filtro na URL
          re-renderizava o servidor sem nunca atualizar a lista na tela. */}
      <KanbanBoard
        key={`${filtros.cliente ?? ''}|${filtros.tipo ?? ''}|${filtros.prioridade ?? ''}|${filtros.responsavel ?? ''}`}
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
