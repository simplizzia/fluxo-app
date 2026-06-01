'use server'

import { requirePapel } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface ClienteListItem {
  id: string
  nome: string
  status: string
  plano: { usados: number; limite: number; porcentagem: number } | null
  scoreAtual: number | null
  responsavelNome: string | null
}

// ---------------------------------------------------------------------------
// buscarClientes — lista para socia/gestao/atendimento
// ---------------------------------------------------------------------------

export async function buscarClientes(): Promise<{
  clientes?: ClienteListItem[]
  error?: string
}> {
  await requirePapel('socia', 'gestao', 'atendimento')
  const supabase = await createClient()

  // 1. Clientes
  const { data: clientes, error } = await supabase
    .from('clientes')
    .select('id, nome, status')
    .order('nome')

  if (error) return { error: 'Erro ao buscar clientes.' }
  if (!clientes?.length) return { clientes: [] }

  const clienteIds = clientes.map((c) => c.id)

  // 2. Planos + uso do mês corrente em paralelo
  const agora = new Date()
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()

  const [{ data: planos }, { data: cardsNoMes }, { data: scores }] = await Promise.all([
    supabase
      .from('planos_cliente')
      .select('cliente_id, limite_demandas_mes')
      .in('cliente_id', clienteIds),
    supabase
      .from('cards')
      .select('cliente_id')
      .in('cliente_id', clienteIds)
      .neq('status', 'cancelado')
      .gte('created_at', inicioMes),
    supabase
      .from('health_scores')
      .select('cliente_id, score')
      .in('cliente_id', clienteIds)
      .order('calculado_em', { ascending: false }),
  ])

  // 3. Montar mapas auxiliares
  const planoMap = new Map((planos ?? []).map((p) => [p.cliente_id, p.limite_demandas_mes]))
  const usadosMap = new Map<string, number>()
  for (const c of cardsNoMes ?? []) {
    usadosMap.set(c.cliente_id!, (usadosMap.get(c.cliente_id!) ?? 0) + 1)
  }

  // Score mais recente por cliente
  const scoreMap = new Map<string, number>()
  for (const s of scores ?? []) {
    if (!scoreMap.has(s.cliente_id)) {
      scoreMap.set(s.cliente_id, s.score)
    }
  }

  return {
    clientes: clientes.map((c) => {
      const limite = planoMap.get(c.id) ?? null
      const usados = usadosMap.get(c.id) ?? 0
      return {
        id: c.id,
        nome: c.nome,
        status: c.status,
        plano: limite
          ? { usados, limite, porcentagem: Math.min(100, Math.round((usados / limite) * 100)) }
          : null,
        scoreAtual: scoreMap.get(c.id) ?? null,
        responsavelNome: null,
      }
    }),
  }
}
