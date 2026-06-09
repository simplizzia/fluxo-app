'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { requirePapel } from '@/lib/dal'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface PublicacaoAgendada {
  id: string
  organization_id: string
  card_id: string | null
  integracao_id: string | null
  plataforma: string
  tipo_conteudo: string
  legenda: string
  hashtags: string | null
  storage_path: string | null
  data_agendada: string
  publicado_em: string | null
  status: string
  plataforma_post_id: string | null
  tentativas: number
  rotulo_ia: boolean
  erro_mensagem: string | null
  created_at: string
  card?: { titulo: string } | null
  integracao?: { plataforma: string; page_nome: string | null; page_id: string | null } | null
}

export interface IntegracaoSocial {
  id: string
  plataforma: string
  page_nome: string | null
  page_id: string | null
  ativo: boolean
  expires_at: string | null
  cliente_id: string | null
  cliente?: { id: string; nome: string } | null
}

export interface ClienteSimples {
  id: string
  nome: string
}

export interface MetricasSociais {
  publicacao_id: string
  coletado_em: string
  alcance: number
  impressoes: number
  curtidas: number
  comentarios: number
  compartilhamentos: number
  salvamentos: number
  taxa_engajamento: number
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function buscarIntegracoesSociais(): Promise<IntegracaoSocial[]> {
  await requirePapel('socia')
  const supabase = await createClient()
  const { data } = await supabase
    .from('integracao_social')
    .select('id, plataforma, page_nome, page_id, ativo, expires_at, cliente_id, cliente:clientes(id, nome)')
    .order('cliente_id', { ascending: true, nullsFirst: true })
    .order('plataforma')
  return (data ?? []) as unknown as IntegracaoSocial[]
}

export async function buscarClientesAtivos(): Promise<ClienteSimples[]> {
  await requirePapel('socia', 'gestao', 'atendimento')
  const supabase = await createClient()
  const { data } = await supabase
    .from('clientes')
    .select('id, nome')
    .eq('status', 'ativo')
    .order('nome')
  return (data ?? []) as ClienteSimples[]
}

export async function buscarPublicacoes(filtros?: {
  status?: string
  plataforma?: string
  cardId?: string
}): Promise<PublicacaoAgendada[]> {
  const supabase = await createClient()

  let query = supabase
    .from('publicacoes_agendadas')
    .select(`
      id, organization_id, card_id, integracao_id,
      plataforma, tipo_conteudo, legenda, hashtags, storage_path,
      data_agendada, publicado_em, status, plataforma_post_id,
      tentativas, rotulo_ia, erro_mensagem, created_at,
      card:cards(titulo),
      integracao:integracao_id(plataforma, page_nome, page_id)
    `)
    .order('data_agendada', { ascending: false })

  if (filtros?.status) query = query.eq('status', filtros.status as 'rascunho' | 'agendado' | 'publicado' | 'falhou')
  if (filtros?.plataforma) query = query.eq('plataforma', filtros.plataforma as 'instagram' | 'facebook' | 'linkedin' | 'tiktok')
  if (filtros?.cardId) query = query.eq('card_id', filtros.cardId)

  const { data } = await query
  return (data ?? []) as unknown as PublicacaoAgendada[]
}

export async function buscarMetricasPublicacao(publicacaoId: string): Promise<MetricasSociais[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('metricas_sociais')
    .select('publicacao_id, coletado_em, alcance, impressoes, curtidas, comentarios, compartilhamentos, salvamentos, taxa_engajamento')
    .eq('publicacao_id', publicacaoId)
    .order('coletado_em', { ascending: false })
    .limit(10)
  return (data ?? []) as MetricasSociais[]
}

export async function buscarMetricasSociaisRelatorio(
  clienteId: string,
  mesReferencia: string, // "2026-04-01"
): Promise<{
  totalPublicacoes: number
  totalAlcance: number
  totalImpressoes: number
  totalCurtidas: number
  totalComentarios: number
  totalCompartilhamentos: number
  engajamentoMedio: number
  publicacoes: PublicacaoAgendada[]
} | null> {
  try {
    const supabase = await createClient()

    // Período do mês
    const inicio = mesReferencia // "2026-04-01"
    const fimDate = new Date(mesReferencia)
    fimDate.setMonth(fimDate.getMonth() + 1)
    const fim = fimDate.toISOString().slice(0, 10)

    // Busca cards do cliente no período
    const { data: cards } = await supabase
      .from('cards')
      .select('id')
      .eq('cliente_id', clienteId)
      .gte('created_at', inicio)
      .lt('created_at', fim)

    const cardIds = (cards ?? []).map((c) => c.id as string)
    if (cardIds.length === 0) return null

    // Busca publicações publicadas para esses cards
    const { data: pubs } = await supabase
      .from('publicacoes_agendadas')
      .select(`
        id, plataforma, tipo_conteudo, legenda, hashtags,
        data_agendada, publicado_em, status, plataforma_post_id, storage_path,
        card_id, integracao_id, organization_id, created_at
      `)
      .in('card_id', cardIds)
      .eq('status', 'publicado')

    if (!pubs || pubs.length === 0) return null

    const pubIds = pubs.map((p) => p.id as string)

    // Busca última métrica de cada publicação
    const { data: metricas } = await supabase
      .from('metricas_sociais')
      .select('publicacao_id, alcance, impressoes, curtidas, comentarios, compartilhamentos, taxa_engajamento, coletado_em')
      .in('publicacao_id', pubIds)
      .order('coletado_em', { ascending: false })

    const todasMetricas = (metricas ?? []) as MetricasSociais[]
    const ultimaMetricaPorPub = new Map<string, MetricasSociais>()
    for (const m of todasMetricas) {
      if (!ultimaMetricaPorPub.has(m.publicacao_id)) {
        ultimaMetricaPorPub.set(m.publicacao_id, m)
      }
    }

    let totalAlcance = 0
    let totalImpressoes = 0
    let totalCurtidas = 0
    let totalComentarios = 0
    let totalCompartilhamentos = 0
    const engajamentos: number[] = []

    for (const [, m] of ultimaMetricaPorPub) {
      totalAlcance         += m.alcance         ?? 0
      totalImpressoes      += m.impressoes       ?? 0
      totalCurtidas        += m.curtidas         ?? 0
      totalComentarios     += m.comentarios      ?? 0
      totalCompartilhamentos += m.compartilhamentos ?? 0
      if (m.taxa_engajamento > 0) engajamentos.push(m.taxa_engajamento)
    }

    return {
      totalPublicacoes:      pubs.length,
      totalAlcance,
      totalImpressoes,
      totalCurtidas,
      totalComentarios,
      totalCompartilhamentos,
      engajamentoMedio:      engajamentos.length > 0
        ? engajamentos.reduce((a, b) => a + b, 0) / engajamentos.length
        : 0,
      publicacoes: pubs as unknown as PublicacaoAgendada[],
    }
  } catch {
    return null // resilient — migração pode ainda não existir
  }
}

export async function buscarResumoMetricasSociais(): Promise<{
  totalPublicacoes: number
  publicacoesPublicadas: number
  engajamentoMedio: number
  alcanceTotal: number
  topPosts: (PublicacaoAgendada & { ultimaMetrica?: MetricasSociais })[]
}> {
  await requirePapel('socia')
  const supabase = await createClient()

  const { data: publicacoes } = await supabase
    .from('publicacoes_agendadas')
    .select(`
      id, plataforma, tipo_conteudo, legenda, data_agendada, publicado_em, status,
      card:cards(titulo)
    `)
    .order('publicado_em', { ascending: false })
    .limit(100)

  const pubs = (publicacoes ?? []) as unknown as PublicacaoAgendada[]

  const { data: metricas } = await supabase
    .from('metricas_sociais')
    .select('publicacao_id, coletado_em, alcance, impressoes, curtidas, comentarios, compartilhamentos, salvamentos, taxa_engajamento')
    .order('coletado_em', { ascending: false })

  const todasMetricas = (metricas ?? []) as MetricasSociais[]

  // Última métrica por publicação
  const ultimaMetricaPorPub = new Map<string, MetricasSociais>()
  for (const m of todasMetricas) {
    if (!ultimaMetricaPorPub.has(m.publicacao_id)) {
      ultimaMetricaPorPub.set(m.publicacao_id, m)
    }
  }

  const publicadas = pubs.filter(p => p.status === 'publicado')
  const alcanceTotal = todasMetricas.reduce((sum, m) => sum + (m.alcance ?? 0), 0)
  const engajamentos = todasMetricas.map(m => m.taxa_engajamento ?? 0).filter(v => v > 0)
  const engajamentoMedio = engajamentos.length > 0
    ? engajamentos.reduce((a, b) => a + b, 0) / engajamentos.length
    : 0

  // Top posts por alcance
  const topPosts = publicadas
    .map(p => ({ ...p, ultimaMetrica: ultimaMetricaPorPub.get(p.id) }))
    .sort((a, b) => (b.ultimaMetrica?.alcance ?? 0) - (a.ultimaMetrica?.alcance ?? 0))
    .slice(0, 5)

  return {
    totalPublicacoes:      pubs.length,
    publicacoesPublicadas: publicadas.length,
    engajamentoMedio,
    alcanceTotal,
    topPosts,
  }
}

// ---------------------------------------------------------------------------
// Mutações
// ---------------------------------------------------------------------------

export async function actionCriarPublicacao(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, papel')
    .eq('id', user.id)
    .single()
  if (!profile || profile.papel === 'cliente') throw new Error('Sem permissão')

  const cardId             = formData.get('card_id') as string | null
  const integracaoId       = formData.get('integracao_id') as string
  const plataforma         = formData.get('plataforma') as string
  const tipoConteudo       = formData.get('tipo_conteudo') as string
  const legenda            = formData.get('legenda') as string
  const hashtags           = formData.get('hashtags') as string | null
  const dataAgendada       = formData.get('data_agendada') as string
  const rotuloIa           = formData.get('rotulo_ia') === 'true'
  const file               = formData.get('arquivo') as File | null

  if (!plataforma || !tipoConteudo || !legenda || !dataAgendada || !integracaoId) {
    throw new Error('Campos obrigatórios ausentes')
  }

  let storagePath: string | null = null
  if (file && file.size > 0) {
    const ext = file.name.split('.').pop() ?? 'bin'
    const path = `${profile.organization_id}/${Date.now()}.${ext}`
    const { error: uploadErr } = await supabase.storage
      .from('social-media')
      .upload(path, await file.arrayBuffer(), { contentType: file.type })
    if (uploadErr) throw new Error(`Upload falhou: ${uploadErr.message}`)
    storagePath = path
  }

  const { error } = await supabase.from('publicacoes_agendadas').insert({
    organization_id:      profile.organization_id,
    card_id:              cardId || null,
    integracao_id:        integracaoId,
    plataforma:           plataforma as 'instagram' | 'facebook' | 'linkedin' | 'tiktok',
    tipo_conteudo:        tipoConteudo as 'feed' | 'carrossel' | 'reel' | 'story' | 'bts',
    legenda,
    hashtags:             hashtags || null,
    storage_path:         storagePath,
    data_agendada:        dataAgendada,
    rotulo_ia:            rotuloIa,
    status:               'agendado',
    criado_por:           user.id,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/socias/social')
  if (cardId) revalidatePath('/board')
}

export async function actionExcluirPublicacao(publicacaoId: string) {
  await requirePapel('socia')
  const supabase = await createClient()
  const { error } = await supabase
    .from('publicacoes_agendadas')
    .delete()
    .eq('id', publicacaoId)
    .in('status', ['rascunho', 'agendado']) // não deleta publicados

  if (error) throw new Error(error.message)
  revalidatePath('/socias/social')
}

export async function actionDesconectarIntegracao(integracaoId: string) {
  await requirePapel('socia')
  const service = createServiceClient()
  const { error } = await service
    .from('integracao_social')
    .update({ ativo: false, updated_at: new Date().toISOString() })
    .eq('id', integracaoId)
  if (error) throw new Error(error.message)
  revalidatePath('/perfil')
  revalidatePath('/socias/social')
}
