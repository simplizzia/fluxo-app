'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile, requirePapel } from '@/lib/dal'

// ---------------------------------------------------------------------------
// Tipos compartilhados
// ---------------------------------------------------------------------------

export interface CardResumo {
  id: string
  titulo: string
  status: string
  prioridade: string
  prazo_cliente: string | null
  created_at: string
  updated_at: string
  rodadas_revisao: number
  cliente: { id: string; nome: string }
  tipo: { nome: string }
  responsavel: { id: string; nome: string } | null
}

export interface MrrMes {
  mes: string   // YYYY-MM-DD (primeiro dia do mês)
  mrr: number
  clientes_ativos: number
}

export interface KpiSocia {
  concluidosNoMes: number
  taxaNoProazo: number          // 0–100
  rodadasMedias: number
  cardsAtrasados: number
  totalAtivos: number
  distribuicao: Record<string, number>
  topClientesRetrabalho: Array<{ clienteNome: string; rodadasMedia: number; cards: number }>
  clientesEmAlerta: Array<{ clienteNome: string; usados: number; limite: number; porcentagem: number }>
  mrrHistorico: MrrMes[]    // últimos 6 meses
  mrrAtual: number
}

export interface KpiGestao {
  workloadExecutores: Array<{ nome: string; total: number; urgente: number }>
  gargalos: CardResumo[]
  revisaoInternaFila: number
}

export interface KpiAtendimento {
  triagem: CardResumo[]        // aguardando_info ordenados por created_at
  aprovacoesPendentes: CardResumo[]  // para_aprovacao ordenados por updated_at ASC
  proximasEntregas: CardResumo[]     // prazo nos próximos 7 dias
  clientesEmAlerta: Array<{ clienteNome: string; usados: number; limite: number; porcentagem: number }>
}

export interface KpiExecutor {
  meuCards: CardResumo[]
  totalUrgente: number
  totalAlta: number
  totalNormal: number
  proximoPrazo: string | null
}

export interface KpiCliente {
  paraAprovacao: CardResumo[]
  emProducao: number
  concluidosNoMes: number
  proximasEntregas: CardResumo[]
  plano: { usados: number; limite: number; porcentagem: number } | null
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function inicioDeMes() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
}

function fimDeMes() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString()
}

function hoje() {
  return new Date().toISOString().split('T')[0]
}

function em7Dias() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().split('T')[0]
}

// ---------------------------------------------------------------------------
// buscarKpiSocia
// ---------------------------------------------------------------------------

export async function buscarKpiSocia(): Promise<{ kpi?: KpiSocia; error?: string }> {
  await requirePapel('socia')
  const supabase = await createClient()

  const seisAtras = new Date()
  seisAtras.setMonth(seisAtras.getMonth() - 5)
  const seisAtrasIso = new Date(seisAtras.getFullYear(), seisAtras.getMonth(), 1).toISOString().split('T')[0]

  const [
    { data: concluidos },
    { count: atrasados },
    { data: ativos },
    { data: mrrRows },
    { data: mrrAtualRows },
  ] = await Promise.all([
    // Cards concluídos no mês
    supabase
      .from('cards')
      .select('id, rodadas_revisao, prazo_cliente, updated_at, cliente:clientes!cliente_id(id, nome)')
      .eq('status', 'concluido')
      .gte('updated_at', inicioDeMes())
      .lte('updated_at', fimDeMes()),

    // Cards atrasados
    supabase
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .not('status', 'in', '(concluido,cancelado)')
      .lt('prazo_cliente', hoje())
      .not('prazo_cliente', 'is', null),

    // Cards ativos (não concluídos/cancelados)
    supabase
      .from('cards')
      .select('status')
      .not('status', 'in', '(concluido,cancelado)'),

    // MRR histórico — últimos 6 meses
    supabase
      .from('mrr_historico')
      .select('mes, mrr, clientes_ativos')
      .gte('mes', seisAtrasIso)
      .order('mes', { ascending: true })
      .limit(6),

    // MRR atual: soma das receitas ativas
    supabase
      .from('financeiro_receitas')
      .select('valor_mensal')
      .eq('ativo', true),
  ])

  const listaConcluidos = (concluidos ?? []) as unknown as Array<{
    id: string
    rodadas_revisao: number
    prazo_cliente: string | null
    updated_at: string
    cliente: { id: string; nome: string }
  }>

  // Taxa no prazo: concluídos com prazo definido, onde prazo_cliente >= data de conclusão
  const comPrazo = listaConcluidos.filter((c) => c.prazo_cliente)
  const noPrazo = comPrazo.filter(
    (c) => c.prazo_cliente! >= c.updated_at.split('T')[0],
  )
  const taxaNoProazo =
    comPrazo.length > 0 ? Math.round((noPrazo.length / comPrazo.length) * 100) : 100

  // Rodadas médias
  const totalRodadas = listaConcluidos.reduce((s, c) => s + (c.rodadas_revisao ?? 0), 0)
  const rodadasMedias =
    listaConcluidos.length > 0
      ? Math.round((totalRodadas / listaConcluidos.length) * 10) / 10
      : 0

  // Top clientes por retrabalho
  const porCliente: Record<string, { nome: string; totalRodadas: number; cards: number }> = {}
  for (const c of listaConcluidos) {
    const cid = c.cliente?.id
    if (!cid) continue
    if (!porCliente[cid]) porCliente[cid] = { nome: c.cliente.nome, totalRodadas: 0, cards: 0 }
    porCliente[cid].totalRodadas += c.rodadas_revisao ?? 0
    porCliente[cid].cards++
  }
  const topClientesRetrabalho = Object.values(porCliente)
    .map((c) => ({ clienteNome: c.nome, rodadasMedia: Math.round((c.totalRodadas / c.cards) * 10) / 10, cards: c.cards }))
    .sort((a, b) => b.rodadasMedia - a.rodadasMedia)
    .slice(0, 5)

  // Distribuição de status
  const distribuicao: Record<string, number> = {}
  for (const c of ativos ?? []) {
    distribuicao[c.status] = (distribuicao[c.status] ?? 0) + 1
  }

  // Clientes em alerta (>= 80% do plano) — consulta simplificada
  const clientesEmAlerta = await buscarClientesEmAlertaPlano(supabase)

  const mrrAtual = (mrrAtualRows ?? []).reduce((s, r) => s + Number(r.valor_mensal), 0)

  return {
    kpi: {
      concluidosNoMes: listaConcluidos.length,
      taxaNoProazo,
      rodadasMedias,
      cardsAtrasados: atrasados ?? 0,
      totalAtivos: (ativos ?? []).length,
      distribuicao,
      topClientesRetrabalho,
      clientesEmAlerta,
      mrrHistorico: (mrrRows ?? []) as MrrMes[],
      mrrAtual: Math.round(mrrAtual * 100) / 100,
    },
  }
}

// ---------------------------------------------------------------------------
// buscarKpiGestao
// ---------------------------------------------------------------------------

export async function buscarKpiGestao(): Promise<{ kpi?: KpiGestao; error?: string }> {
  await requirePapel('gestao')
  const supabase = await createClient()

  const dataLimiteGargalo = new Date()
  dataLimiteGargalo.setDate(dataLimiteGargalo.getDate() - 5)

  const [
    { data: cardsAtivos },
    { data: gargalosRaw },
    { count: revisaoInterna },
  ] = await Promise.all([
    // Cards ativos com responsável
    supabase
      .from('cards')
      .select('responsavel:profiles!responsavel_id(id, nome), prioridade')
      .not('status', 'in', '(concluido,cancelado)')
      .not('responsavel_id', 'is', null),

    // Gargalos: em andamento/para_aprovacao há +5 dias
    supabase
      .from('cards')
      .select(`
        id, titulo, status, prioridade, prazo_cliente, created_at, updated_at, rodadas_revisao,
        cliente:clientes!cliente_id(id, nome),
        tipo:tipos_demanda!tipo_id(nome),
        responsavel:profiles!responsavel_id(id, nome)
      `)
      .in('status', ['em_andamento', 'necessita_ajustes'])
      .lt('updated_at', dataLimiteGargalo.toISOString())
      .order('updated_at', { ascending: true })
      .limit(10),

    // Revisão interna pendente (para_aprovacao sem aprovação interna)
    supabase
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'para_aprovacao'),
  ])

  // Workload por executor
  const workload: Record<string, { nome: string; total: number; urgente: number }> = {}
  for (const c of cardsAtivos ?? []) {
    const r = c.responsavel as unknown as { id: string; nome: string } | null
    if (!r) continue
    if (!workload[r.id]) workload[r.id] = { nome: r.nome, total: 0, urgente: 0 }
    workload[r.id].total++
    if (c.prioridade === 'urgente') workload[r.id].urgente++
  }

  return {
    kpi: {
      workloadExecutores: Object.values(workload).sort((a, b) => b.total - a.total),
      gargalos: (gargalosRaw ?? []) as unknown as CardResumo[],
      revisaoInternaFila: revisaoInterna ?? 0,
    },
  }
}

// ---------------------------------------------------------------------------
// buscarKpiAtendimento
// ---------------------------------------------------------------------------

export async function buscarKpiAtendimento(): Promise<{ kpi?: KpiAtendimento; error?: string }> {
  await requirePapel('atendimento')
  const supabase = await createClient()

  const [
    { data: triagem },
    { data: aprovacoes },
    { data: proximas },
  ] = await Promise.all([
    // Triagem: aguardando_info, mais antigos primeiro
    supabase
      .from('cards')
      .select(`
        id, titulo, status, prioridade, prazo_cliente, created_at, updated_at, rodadas_revisao,
        cliente:clientes!cliente_id(id, nome),
        tipo:tipos_demanda!tipo_id(nome),
        responsavel:profiles!responsavel_id(id, nome)
      `)
      .eq('status', 'aguardando_info')
      .order('created_at', { ascending: true })
      .limit(10),

    // Para aprovação: mais antigos primeiro (mais urgente)
    supabase
      .from('cards')
      .select(`
        id, titulo, status, prioridade, prazo_cliente, created_at, updated_at, rodadas_revisao,
        cliente:clientes!cliente_id(id, nome),
        tipo:tipos_demanda!tipo_id(nome),
        responsavel:profiles!responsavel_id(id, nome)
      `)
      .eq('status', 'para_aprovacao')
      .order('updated_at', { ascending: true })
      .limit(10),

    // Próximas entregas (7 dias)
    supabase
      .from('cards')
      .select(`
        id, titulo, status, prioridade, prazo_cliente, created_at, updated_at, rodadas_revisao,
        cliente:clientes!cliente_id(id, nome),
        tipo:tipos_demanda!tipo_id(nome),
        responsavel:profiles!responsavel_id(id, nome)
      `)
      .gte('prazo_cliente', hoje())
      .lte('prazo_cliente', em7Dias())
      .not('status', 'in', '(concluido,cancelado)')
      .order('prazo_cliente', { ascending: true })
      .limit(10),
  ])

  const clientesEmAlerta = await buscarClientesEmAlertaPlano(supabase)

  return {
    kpi: {
      triagem: (triagem ?? []) as unknown as CardResumo[],
      aprovacoesPendentes: (aprovacoes ?? []) as unknown as CardResumo[],
      proximasEntregas: (proximas ?? []) as unknown as CardResumo[],
      clientesEmAlerta,
    },
  }
}

// ---------------------------------------------------------------------------
// buscarKpiExecutor
// ---------------------------------------------------------------------------

export async function buscarKpiExecutor(): Promise<{ kpi?: KpiExecutor; error?: string }> {
  await requirePapel('executor')
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  const { data: meuCards } = await supabase
    .from('cards')
    .select(`
      id, titulo, status, prioridade, prazo_cliente, created_at, updated_at, rodadas_revisao,
      cliente:clientes!cliente_id(id, nome),
      tipo:tipos_demanda!tipo_id(nome),
      responsavel:profiles!responsavel_id(id, nome)
    `)
    .eq('responsavel_id', profile.id)
    .not('status', 'in', '(concluido,cancelado)')
    .order('prioridade', { ascending: false })
    .order('prazo_cliente', { ascending: true, nullsFirst: false })

  const lista = (meuCards ?? []) as unknown as CardResumo[]

  const cardsComPrazo = lista
    .filter((c) => c.prazo_cliente)
    .sort((a, b) => a.prazo_cliente!.localeCompare(b.prazo_cliente!))

  return {
    kpi: {
      meuCards: lista,
      totalUrgente: lista.filter((c) => c.prioridade === 'urgente').length,
      totalAlta: lista.filter((c) => c.prioridade === 'alta').length,
      totalNormal: lista.filter((c) => c.prioridade === 'normal' || c.prioridade === 'baixa').length,
      proximoPrazo: cardsComPrazo[0]?.prazo_cliente ?? null,
    },
  }
}

// ---------------------------------------------------------------------------
// buscarKpiCliente
// ---------------------------------------------------------------------------

export async function buscarKpiCliente(): Promise<{ kpi?: KpiCliente; error?: string }> {
  await requirePapel('cliente')
  const supabase = await createClient()

  const [
    { data: paraAprovacao },
    { count: emProducao },
    { count: concluidosNoMes },
    { data: proximas },
    { data: planoRaw },
    { count: usadosNoMes },
  ] = await Promise.all([
    // Para aprovação
    supabase
      .from('cards')
      .select(`
        id, titulo, status, prioridade, prazo_cliente, created_at, updated_at, rodadas_revisao,
        cliente:clientes!cliente_id(id, nome),
        tipo:tipos_demanda!tipo_id(nome),
        responsavel:profiles!responsavel_id(id, nome)
      `)
      .eq('status', 'para_aprovacao')
      .order('updated_at', { ascending: true }),

    // Em produção
    supabase
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .not('status', 'in', '(concluido,cancelado,para_aprovacao,aguardando_info)'),

    // Concluídos no mês
    supabase
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'concluido')
      .gte('updated_at', inicioDeMes())
      .lte('updated_at', fimDeMes()),

    // Próximas entregas (7 dias)
    supabase
      .from('cards')
      .select(`
        id, titulo, status, prioridade, prazo_cliente, created_at, updated_at, rodadas_revisao,
        cliente:clientes!cliente_id(id, nome),
        tipo:tipos_demanda!tipo_id(nome),
        responsavel:profiles!responsavel_id(id, nome)
      `)
      .gte('prazo_cliente', hoje())
      .lte('prazo_cliente', em7Dias())
      .not('status', 'in', '(concluido,cancelado)')
      .order('prazo_cliente', { ascending: true })
      .limit(5),

    // Plano do cliente
    supabase.from('planos_cliente').select('limite_demandas_mes').maybeSingle(),

    // Cards usados no mês (para o plano)
    supabase
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'cancelado')
      .gte('created_at', inicioDeMes())
      .lte('created_at', fimDeMes()),
  ])

  const limite = (planoRaw as { limite_demandas_mes: number } | null)?.limite_demandas_mes ?? 10
  const usados = usadosNoMes ?? 0

  return {
    kpi: {
      paraAprovacao: (paraAprovacao ?? []) as unknown as CardResumo[],
      emProducao: emProducao ?? 0,
      concluidosNoMes: concluidosNoMes ?? 0,
      proximasEntregas: (proximas ?? []) as unknown as CardResumo[],
      plano: { usados, limite, porcentagem: Math.round((usados / limite) * 100) },
    },
  }
}

// ---------------------------------------------------------------------------
// Helper interno — clientes em alerta de plano
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buscarClientesEmAlertaPlano(supabase: any) {
  const { data: planos } = await supabase
    .from('planos_cliente')
    .select('cliente_id, limite_demandas_mes')

  if (!planos?.length) return []

  const clienteIds = planos.map((p: { cliente_id: string }) => p.cliente_id)

  const { data: clientes } = await supabase
    .from('clientes')
    .select('id, nome')
    .in('id', clienteIds)
    .eq('status', 'ativo')

  const { data: cards } = await supabase
    .from('cards')
    .select('cliente_id')
    .in('cliente_id', clienteIds)
    .neq('status', 'cancelado')
    .gte('created_at', inicioDeMes())
    .lte('created_at', fimDeMes())

  const uso: Record<string, number> = {}
  for (const c of cards ?? []) {
    uso[c.cliente_id] = (uso[c.cliente_id] ?? 0) + 1
  }

  const nomesPorId = Object.fromEntries((clientes ?? []).map((c: { id: string; nome: string }) => [c.id, c.nome]))

  return planos
    .map((p: { cliente_id: string; limite_demandas_mes: number }) => {
      const usados = uso[p.cliente_id] ?? 0
      const porcentagem = Math.round((usados / p.limite_demandas_mes) * 100)
      return {
        clienteNome: nomesPorId[p.cliente_id] ?? '—',
        usados,
        limite: p.limite_demandas_mes,
        porcentagem,
      }
    })
    .filter((c: { porcentagem: number }) => c.porcentagem >= 80)
    .sort((a: { porcentagem: number }, b: { porcentagem: number }) => b.porcentagem - a.porcentagem)
}
