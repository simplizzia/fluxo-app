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
      tipo:tipos_demanda!tipo_id(id, nome, categoria),
      responsavel:profiles!responsavel_id(id, nome)
    `)
    .order('created_at', { ascending: false })

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

      <KanbanBoard
        cards={cards}
        clientes={clientes ?? []}
        tipos={tipos ?? []}
        executores={executores ?? []}
        organizationId={profile.organization_id}
        papelAtual={profile.papel}
        filtrosIniciais={filtros}
      />
    </div>
  )
}
