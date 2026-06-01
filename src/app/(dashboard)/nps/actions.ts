'use server'

import { createClient } from '@/lib/supabase/server'
import { requirePapel } from '@/lib/dal'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface DadosNPS {
  npsGeral: number | null
  totalRespostas: number
  distribuicao: Record<number, number>
  promotores: number
  neutros: number
  detratores: number
  porCliente: Array<{
    clienteId: string
    clienteNome: string
    npsScore: number | null
    mediaQualidade: number | null
    mediaComunicacao: number | null
    totalRespostas: number
    ultimaResposta: string | null
  }>
  recentes: Array<{
    id: string
    clienteNome: string
    nps: number
    qualidade: number | null
    comunicacao: number | null
    comentario: string | null
    respondido_em: string
  }>
}

export interface ColaboradorParaAvaliacao {
  id: string
  nome: string
  papel: string
  mediaAtual: number | null
  totalAvaliacoes: number
}

// ---------------------------------------------------------------------------
// buscarDadosNPS
// ---------------------------------------------------------------------------

export async function buscarDadosNPS(): Promise<{
  dados?: DadosNPS
  error?: string
}> {
  await requirePapel('socia', 'atendimento')
  const supabase = await createClient()

  const { data: respostas, error } = await supabase
    .from('avaliacoes_cliente')
    .select('id, cliente_id, nps, qualidade, comunicacao, comentario, respondido_em, clientes(nome)')
    .not('respondido_em', 'is', null)
    .order('respondido_em', { ascending: false })

  if (error) return { error: error.message }

  const lista = (respostas ?? []) as unknown as Array<{
    id: string
    cliente_id: string
    nps: number
    qualidade: number | null
    comunicacao: number | null
    comentario: string | null
    respondido_em: string
    clientes: { nome: string } | null
  }>

  const totalRespostas = lista.length

  if (totalRespostas === 0) {
    return {
      dados: {
        npsGeral: null,
        totalRespostas: 0,
        distribuicao: {},
        promotores: 0,
        neutros: 0,
        detratores: 0,
        porCliente: [],
        recentes: [],
      },
    }
  }

  // Distribuição e métricas NPS
  const distribuicao: Record<number, number> = {}
  let promotores = 0
  let neutros = 0
  let detratores = 0

  for (const r of lista) {
    distribuicao[r.nps] = (distribuicao[r.nps] ?? 0) + 1
    if (r.nps >= 9) promotores++
    else if (r.nps >= 7) neutros++
    else detratores++
  }

  const npsGeral = Math.round(((promotores - detratores) / totalRespostas) * 100)

  // Agrupamento por cliente
  type ClienteAcc = {
    clienteId: string
    clienteNome: string
    promotores: number
    detratores: number
    total: number
    qualidadeSoma: number
    qualidadeCount: number
    comunicacaoSoma: number
    comunicacaoCount: number
    ultimaResposta: string | null
  }

  const clienteMap: Record<string, ClienteAcc> = {}

  for (const r of lista) {
    const cId = r.cliente_id
    if (!clienteMap[cId]) {
      clienteMap[cId] = {
        clienteId: cId,
        clienteNome: r.clientes?.nome ?? 'Cliente',
        promotores: 0,
        detratores: 0,
        total: 0,
        qualidadeSoma: 0,
        qualidadeCount: 0,
        comunicacaoSoma: 0,
        comunicacaoCount: 0,
        ultimaResposta: null,
      }
    }
    const c = clienteMap[cId]
    c.total++
    if (r.nps >= 9) c.promotores++
    else if (r.nps <= 6) c.detratores++
    if (r.qualidade) { c.qualidadeSoma += r.qualidade; c.qualidadeCount++ }
    if (r.comunicacao) { c.comunicacaoSoma += r.comunicacao; c.comunicacaoCount++ }
    if (!c.ultimaResposta || r.respondido_em > c.ultimaResposta) {
      c.ultimaResposta = r.respondido_em
    }
  }

  const porCliente = Object.values(clienteMap)
    .map((c) => ({
      clienteId: c.clienteId,
      clienteNome: c.clienteNome,
      npsScore:
        c.total > 0
          ? Math.round(((c.promotores - c.detratores) / c.total) * 100)
          : null,
      mediaQualidade:
        c.qualidadeCount > 0
          ? Math.round((c.qualidadeSoma / c.qualidadeCount) * 10) / 10
          : null,
      mediaComunicacao:
        c.comunicacaoCount > 0
          ? Math.round((c.comunicacaoSoma / c.comunicacaoCount) * 10) / 10
          : null,
      totalRespostas: c.total,
      ultimaResposta: c.ultimaResposta,
    }))
    .sort((a, b) => (a.npsScore ?? -101) - (b.npsScore ?? -101))

  const recentes = lista.slice(0, 20).map((r) => ({
    id: r.id,
    clienteNome: r.clientes?.nome ?? 'Cliente',
    nps: r.nps,
    qualidade: r.qualidade,
    comunicacao: r.comunicacao,
    comentario: r.comentario,
    respondido_em: r.respondido_em,
  }))

  return {
    dados: {
      npsGeral,
      totalRespostas,
      distribuicao,
      promotores,
      neutros,
      detratores,
      porCliente,
      recentes,
    },
  }
}

// ---------------------------------------------------------------------------
// buscarColaboradoresParaAvaliacao
// ---------------------------------------------------------------------------

export async function buscarColaboradoresParaAvaliacao(): Promise<{
  colaboradores?: ColaboradorParaAvaliacao[]
  error?: string
}> {
  await requirePapel('socia', 'gestao')
  const supabase = await createClient()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nome, papel')
    .in('papel', ['executor', 'gestao', 'atendimento'])
    .order('nome')

  if (!profiles?.length) return { colaboradores: [] }

  const profileIds = profiles.map((p) => p.id as string)

  const { data: avaliacoes } = await supabase
    .from('avaliacoes_colaborador')
    .select('colaborador_id, nota_geral')
    .in('colaborador_id', profileIds)

  // Calcula médias
  const mediaMap: Record<string, { soma: number; count: number }> = {}
  for (const a of avaliacoes ?? []) {
    const cId = a.colaborador_id as string
    if (!mediaMap[cId]) mediaMap[cId] = { soma: 0, count: 0 }
    mediaMap[cId].soma += a.nota_geral as number
    mediaMap[cId].count++
  }

  const colaboradores: ColaboradorParaAvaliacao[] = profiles.map((p) => {
    const m = mediaMap[p.id as string]
    return {
      id: p.id as string,
      nome: p.nome as string,
      papel: p.papel as string,
      mediaAtual: m ? Math.round((m.soma / m.count) * 10) / 10 : null,
      totalAvaliacoes: m?.count ?? 0,
    }
  })

  return { colaboradores }
}

// ---------------------------------------------------------------------------
// actionAvaliarColaborador
// ---------------------------------------------------------------------------

export async function actionAvaliarColaborador(data: {
  colaboradorId: string
  notaGeral: number
  criterios: { qualidade: number; prazo: number; comunicacao: number; iniciativa: number }
  observacao: string
}): Promise<{ ok: boolean; error?: string }> {
  await requirePapel('socia', 'gestao')
  const supabase = await createClient()

  // Busca o profile do usuário logado
  const { getCurrentProfile } = await import('@/lib/dal')
  const profile = await getCurrentProfile()

  const { error } = await supabase.from('avaliacoes_colaborador').insert({
    organization_id: profile.organization_id,
    colaborador_id: data.colaboradorId,
    registrado_por: profile.id,
    nota_geral: data.notaGeral,
    criterios: data.criterios,
    observacao: data.observacao || null,
  })

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
