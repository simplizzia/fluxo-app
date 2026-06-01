/**
 * Controle de Uso Avançado — Sprint 5.6
 *
 * Funções exportadas:
 *   calcCreditosCard(tipoDemandaId, orgId)  → créditos a consumir ao criar card
 *   verificarLimitePlano(orgId)             → verifica se org atingiu o limite do plano
 *   buscarUsoMes(orgId)                     → resumo de uso do mês corrente
 */
import 'server-only'

import { createServiceClient } from './supabase/server'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface UsoMes {
  unidadeControle: 'demandas' | 'horas' | 'creditos'
  usado:   number
  limite:  number | null  // null = ilimitado
  pct:     number         // 0–100
  detalhePorTipo: { nome: string; quantidade: number; creditos: number }[]
}

// ---------------------------------------------------------------------------
// calcCreditosCard
// ---------------------------------------------------------------------------

export async function calcCreditosCard(
  tipoDemandaId: string,
  orgId: string,
): Promise<number> {
  const service = createServiceClient()

  // Busca configuração de créditos da organização
  const { data: org } = await service
    .from('organizacoes')
    .select('unidade_controle, creditos_por_tipo')
    .eq('id', orgId)
    .single()

  if (!org || (org.unidade_controle as string) !== 'creditos') return 0

  // Busca o nome do tipo de demanda
  const { data: tipo } = await service
    .from('tipos_demanda')
    .select('nome')
    .eq('id', tipoDemandaId)
    .single()

  if (!tipo) return 1 // padrão: 1 crédito

  const creditosPorTipo = (org.creditos_por_tipo as Record<string, number>) ?? {}
  const nomeNormalizado = (tipo.nome as string).toLowerCase().replace(/\s+/g, '_')

  return creditosPorTipo[nomeNormalizado] ?? creditosPorTipo['default'] ?? 1
}

// ---------------------------------------------------------------------------
// verificarLimitePlano
// ---------------------------------------------------------------------------

export async function verificarLimitePlano(orgId: string): Promise<{
  atingido: boolean
  usado:   number
  limite:  number | null
}> {
  const service = createServiceClient()

  const { data: org } = await service
    .from('organizacoes')
    .select('unidade_controle, limite_demandas, plano_saas')
    .eq('id', orgId)
    .single()

  if (!org) return { atingido: false, usado: 0, limite: null }

  const unidade = (org.unidade_controle as string) ?? 'demandas'
  const limite  = (org.limite_demandas as number | null)

  if (!limite) return { atingido: false, usado: 0, limite: null }

  // Início do mês corrente
  const agora = new Date()
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()

  if (unidade === 'demandas') {
    const { count } = await service
      .from('cards')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .gte('created_at', inicioMes)
      .not('status', 'eq', 'cancelado')

    const usado = count ?? 0
    return { atingido: usado >= limite, usado, limite }
  }

  if (unidade === 'creditos') {
    const { data } = await service
      .from('cards')
      .select('creditos_consumidos')
      .eq('organization_id', orgId)
      .gte('created_at', inicioMes)
      .not('status', 'eq', 'cancelado')

    const usado = (data ?? []).reduce(
      (sum, c) => sum + ((c.creditos_consumidos as number) ?? 0),
      0
    )
    return { atingido: usado >= limite, usado, limite }
  }

  if (unidade === 'horas') {
    const { data } = await service
      .from('cards')
      .select('horas_realizadas')
      .eq('organization_id', orgId)
      .gte('created_at', inicioMes)

    const usado = (data ?? []).reduce(
      (sum, c) => sum + ((c.horas_realizadas as number) ?? 0),
      0
    )
    return { atingido: usado >= limite, usado, limite }
  }

  return { atingido: false, usado: 0, limite: null }
}

// ---------------------------------------------------------------------------
// buscarUsoMes — agregado para o dashboard do plano
// ---------------------------------------------------------------------------

export async function buscarUsoMes(orgId: string): Promise<UsoMes> {
  const service = createServiceClient()

  const { data: org } = await service
    .from('organizacoes')
    .select('unidade_controle, limite_demandas, creditos_por_tipo')
    .eq('id', orgId)
    .single()

  const unidade = ((org?.unidade_controle as string) ?? 'demandas') as UsoMes['unidadeControle']
  const limite  = (org?.limite_demandas as number | null) ?? null

  const agora = new Date()
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()

  // Busca cards do mês com info de tipo
  const { data: cards } = await service
    .from('cards')
    .select('creditos_consumidos, horas_realizadas, tipo:tipos_demanda!tipo_id(nome)')
    .eq('organization_id', orgId)
    .gte('created_at', inicioMes)
    .not('status', 'eq', 'cancelado')

  const cardsArr = (cards ?? []) as unknown as {
    creditos_consumidos: number | null
    horas_realizadas: number | null
    tipo: { nome: string } | null
  }[]

  // Agrupa por tipo
  const porTipo = new Map<string, { quantidade: number; creditos: number }>()
  let totalUsado = 0

  for (const card of cardsArr) {
    const nome = card.tipo?.nome ?? 'Outro'
    const existing = porTipo.get(nome) ?? { quantidade: 0, creditos: 0 }

    if (unidade === 'creditos') {
      const c = card.creditos_consumidos ?? 0
      totalUsado += c
      porTipo.set(nome, { quantidade: existing.quantidade + 1, creditos: existing.creditos + c })
    } else if (unidade === 'horas') {
      const h = card.horas_realizadas ?? 0
      totalUsado += h
      porTipo.set(nome, { quantidade: existing.quantidade + 1, creditos: existing.creditos + h })
    } else {
      totalUsado++
      porTipo.set(nome, { quantidade: existing.quantidade + 1, creditos: existing.creditos })
    }
  }

  const detalhePorTipo = [...porTipo.entries()]
    .map(([nome, v]) => ({ nome, ...v }))
    .sort((a, b) => b.quantidade - a.quantidade)

  const pct = limite ? Math.min(100, Math.round((totalUsado / limite) * 100)) : 0

  return { unidadeControle: unidade, usado: totalUsado, limite, pct, detalhePorTipo }
}
