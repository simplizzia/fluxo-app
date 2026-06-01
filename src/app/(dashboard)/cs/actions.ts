'use server'

import { createClient } from '@/lib/supabase/server'
import { requirePapel } from '@/lib/dal'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface ClienteHealthData {
  id: string
  nome: string
  status: string
  scoreAtual: number | null
  scoreAnterior: number | null      // penúltimo score (para tendência)
  historicoScores: Array<{ score: number; calculado_em: string }>
  componentes: {
    taxa_aprovacao: number
    rodadas_revisao: number
    uso_plano: number
    nota_avaliacoes: number
    tempo_resposta: number
  } | null
  // Métricas de contexto
  cardsAtivos: number
  cardsParaAprovacao: number
  cardsParaAprovacaoAtrasados: number   // >5 dias em para_aprovacao
  usoPlanoMes: number
  limitePlano: number
  dataRenovacao: string | null
}

export interface AlertaCS {
  clienteId: string
  clienteNome: string
  tipo: string
  titulo: string
  descricao: string
  severidade: 'alta' | 'media' | 'baixa'
}

// ---------------------------------------------------------------------------
// buscarDadosCS — dados completos para a página de Customer Success
// ---------------------------------------------------------------------------

export async function buscarDadosCS(): Promise<{
  clientes?: ClienteHealthData[]
  alertas?: AlertaCS[]
  error?: string
}> {
  await requirePapel('socia', 'atendimento')
  const supabase = await createClient()

  const agora = new Date()
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()
  const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59).toISOString()
  const h5DaysAgo = new Date(agora)
  h5DaysAgo.setDate(h5DaysAgo.getDate() - 5)
  const h6MesesAgo = new Date(agora)
  h6MesesAgo.setMonth(h6MesesAgo.getMonth() - 6)

  // ── 1. Clientes ativos com planos ─────────────────────────────────────────
  const { data: clientesRaw } = await supabase
    .from('clientes')
    .select('id, nome, status, planos_cliente(limite_demandas_mes, data_renovacao)')
    .eq('status', 'ativo')
    .order('nome')

  if (!clientesRaw?.length) return { clientes: [], alertas: [] }

  const clienteIds = clientesRaw.map((c) => c.id)

  // ── 2. Todos os health scores dos últimos 6 meses (batch) ─────────────────
  const { data: todosScores } = await supabase
    .from('health_scores')
    .select('cliente_id, score, componentes, calculado_em')
    .in('cliente_id', clienteIds)
    .gte('calculado_em', h6MesesAgo.toISOString())
    .order('calculado_em', { ascending: false })

  // Agrupa por cliente_id
  const scoresPorCliente: Record<
    string,
    Array<{ score: number; componentes: ClienteHealthData['componentes']; calculado_em: string }>
  > = {}
  for (const s of todosScores ?? []) {
    if (!scoresPorCliente[s.cliente_id]) scoresPorCliente[s.cliente_id] = []
    scoresPorCliente[s.cliente_id].push(s as {
      score: number
      componentes: ClienteHealthData['componentes']
      calculado_em: string
    })
  }

  // ── 3. Cards ativos por cliente ───────────────────────────────────────────
  const { data: cardsAtivosRaw } = await supabase
    .from('cards')
    .select('cliente_id, status, updated_at')
    .in('cliente_id', clienteIds)
    .not('status', 'in', '(concluido,cancelado)')

  const contAtivos: Record<string, number> = {}
  const contParaAprovacao: Record<string, number> = {}
  const contParaAprovacaoAtrasado: Record<string, number> = {}

  for (const c of cardsAtivosRaw ?? []) {
    if (!c.cliente_id) continue
    contAtivos[c.cliente_id] = (contAtivos[c.cliente_id] ?? 0) + 1
    if (c.status === 'para_aprovacao') {
      contParaAprovacao[c.cliente_id] = (contParaAprovacao[c.cliente_id] ?? 0) + 1
      if (c.updated_at < h5DaysAgo.toISOString()) {
        contParaAprovacaoAtrasado[c.cliente_id] =
          (contParaAprovacaoAtrasado[c.cliente_id] ?? 0) + 1
      }
    }
  }

  // ── 4. Uso do plano no mês (batch count por cliente) ─────────────────────
  const { data: cardsDoMesRaw } = await supabase
    .from('cards')
    .select('cliente_id')
    .in('cliente_id', clienteIds)
    .neq('status', 'cancelado')
    .gte('created_at', inicioMes)
    .lte('created_at', fimMes)

  const usoMes: Record<string, number> = {}
  for (const c of cardsDoMesRaw ?? []) {
    if (!c.cliente_id) continue
    usoMes[c.cliente_id] = (usoMes[c.cliente_id] ?? 0) + 1
  }

  // ── 5. Monta resultado por cliente ────────────────────────────────────────
  const clientes: ClienteHealthData[] = clientesRaw.map((c) => {
    const historico = scoresPorCliente[c.id as string] ?? []
    const plano = (c.planos_cliente as Array<{
      limite_demandas_mes: number
      data_renovacao: string
    }> | null)?.[0]

    const cId = c.id as string
    const cNome = c.nome as string

    return {
      id: cId,
      nome: cNome,
      status: c.status as string,
      scoreAtual: historico[0]?.score ?? null,
      scoreAnterior: historico[1]?.score ?? null,
      historicoScores: historico.slice(0, 8).map((s) => ({
        score: s.score,
        calculado_em: s.calculado_em,
      })),
      componentes: (historico[0]?.componentes as ClienteHealthData['componentes']) ?? null,
      cardsAtivos: contAtivos[cId] ?? 0,
      cardsParaAprovacao: contParaAprovacao[cId] ?? 0,
      cardsParaAprovacaoAtrasados: contParaAprovacaoAtrasado[cId] ?? 0,
      usoPlanoMes: usoMes[cId] ?? 0,
      limitePlano: plano?.limite_demandas_mes ?? 10,
      dataRenovacao: plano?.data_renovacao ?? null,
    }
  })

  // ── 6. Computa alertas ativos ─────────────────────────────────────────────
  const alertas: AlertaCS[] = []

  for (const c of clientes) {
    if (c.scoreAtual != null && c.scoreAtual < 40) {
      alertas.push({
        clienteId: c.id,
        clienteNome: c.nome,
        tipo: 'score_vermelho',
        titulo: 'Saúde crítica',
        descricao: `Health Score de ${c.scoreAtual}/100 — cliente em zona de risco.`,
        severidade: 'alta',
      })
    }

    if (
      c.scoreAtual != null &&
      c.scoreAnterior != null &&
      c.scoreAnterior - c.scoreAtual >= 20
    ) {
      alertas.push({
        clienteId: c.id,
        clienteNome: c.nome,
        tipo: 'score_queda',
        titulo: 'Queda de saúde',
        descricao: `Score caiu de ${c.scoreAnterior} para ${c.scoreAtual} (−${c.scoreAnterior - c.scoreAtual} pts).`,
        severidade: 'alta',
      })
    }

    if (c.cardsParaAprovacaoAtrasados > 0) {
      alertas.push({
        clienteId: c.id,
        clienteNome: c.nome,
        tipo: 'aprovacao_atrasada',
        titulo: 'Aprovação sem resposta',
        descricao: `${c.cardsParaAprovacaoAtrasados} card${c.cardsParaAprovacaoAtrasados > 1 ? 's' : ''} aguardando aprovação há mais de 5 dias.`,
        severidade: 'alta',
      })
    }

    if (c.dataRenovacao) {
      const dias = Math.ceil(
        (new Date(c.dataRenovacao).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      )
      if (dias >= 0 && dias <= 30) {
        alertas.push({
          clienteId: c.id,
          clienteNome: c.nome,
          tipo: 'renovacao_contrato',
          titulo: 'Renovação próxima',
          descricao: `Contrato renova em ${dias} dia${dias !== 1 ? 's' : ''} (${new Date(c.dataRenovacao).toLocaleDateString('pt-BR')}).`,
          severidade: dias <= 7 ? 'alta' : 'media',
        })
      }
    }

    if (c.usoPlanoMes === 0 && c.cardsAtivos === 0) {
      alertas.push({
        clienteId: c.id,
        clienteNome: c.nome,
        tipo: 'sem_atividade',
        titulo: 'Sem atividade',
        descricao: `Nenhuma demanda criada este mês — risco de desengajamento.`,
        severidade: 'media',
      })
    }

    if (c.limitePlano > 0) {
      const pct = Math.round((c.usoPlanoMes / c.limitePlano) * 100)
      if (pct < 25 && pct > 0) {
        alertas.push({
          clienteId: c.id,
          clienteNome: c.nome,
          tipo: 'sub_utilizacao',
          titulo: 'Sub-utilização do plano',
          descricao: `Apenas ${pct}% do plano utilizado (${c.usoPlanoMes}/${c.limitePlano} demandas).`,
          severidade: 'baixa',
        })
      }
    }
  }

  // Ordena: alta → media → baixa
  const ordemSev = { alta: 0, media: 1, baixa: 2 }
  alertas.sort((a, b) => ordemSev[a.severidade] - ordemSev[b.severidade])

  // Ordena clientes: menores scores primeiro
  clientes.sort((a, b) => {
    if (a.scoreAtual == null && b.scoreAtual == null) return a.nome.localeCompare(b.nome)
    if (a.scoreAtual == null) return 1
    if (b.scoreAtual == null) return -1
    return a.scoreAtual - b.scoreAtual
  })

  return { clientes, alertas }
}

// ---------------------------------------------------------------------------
// buscarHistoricoScore — para modal/detalhe de cliente
// ---------------------------------------------------------------------------

export async function buscarHistoricoScore(clienteId: string): Promise<{
  historico?: Array<{ score: number; componentes: Record<string, number>; calculado_em: string }>
  error?: string
}> {
  await requirePapel('socia', 'atendimento')
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('health_scores')
    .select('score, componentes, calculado_em')
    .eq('cliente_id', clienteId)
    .order('calculado_em', { ascending: false })
    .limit(30)

  if (error) return { error: error.message }

  return {
    historico: (data ?? []) as Array<{
      score: number
      componentes: Record<string, number>
      calculado_em: string
    }>,
  }
}
