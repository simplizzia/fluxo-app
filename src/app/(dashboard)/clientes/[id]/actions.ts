'use server'

import { revalidatePath } from 'next/cache'
import { requirePapel, getCurrentProfile } from '@/lib/dal'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Tipos exportados
// ---------------------------------------------------------------------------

export interface ClienteDetalhe {
  id: string
  nome: string
  status: string
  plano: { usados: number; limite: number; porcentagem: number; dataRenovacao: string | null } | null
  scoreAtual: number | null
}

export interface SecaoMarca {
  id: string
  marcaId: string | null
  categoria: string
  subcategoria: string | null
  titulo: string
  conteudo: Record<string, unknown>
  visivelParaCliente: boolean
  geradoPorAgente: string | null
  versao: number
  updatedAt: string
}

export interface AtivoVisual {
  id: string
  marcaId: string | null
  categoria: string
  nome: string
  descricao: string | null
  notaUso: string | null
  url: string
  urlAssinada: string
  versao: number
  tags: string[]
  visivelParaCliente: boolean
  criadoEm: string
}

export interface MoodboardItem {
  id: string
  marcaId: string | null
  secao: string
  tipo: string
  url: string | null
  corHex: string | null
  texto: string | null
  nota: string | null
  antiReferencia: boolean
  ordem: number
  urlAssinada: string | null
}

// ---------------------------------------------------------------------------
// actionRenomearCliente
// ---------------------------------------------------------------------------

export async function actionRenomearCliente(
  clienteId: string,
  novoNome: string,
): Promise<{ error?: string }> {
  await requirePapel('socia', 'gestao')
  const supabase = await createClient()

  const slug = novoNome
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const { error } = await supabase
    .from('clientes')
    .update({ nome: novoNome.trim(), slug })
    .eq('id', clienteId)

  if (error) {
    if (error.code === '23505') return { error: 'Já existe um cliente com esse nome.' }
    return { error: 'Erro ao renomear cliente.' }
  }

  revalidatePath(`/clientes/${clienteId}`)
  revalidatePath('/clientes')
  return {}
}

// ---------------------------------------------------------------------------
// buscarClienteDetalhe
// ---------------------------------------------------------------------------

export async function buscarClienteDetalhe(clienteId: string): Promise<{
  cliente?: ClienteDetalhe
  error?: string
}> {
  await requirePapel('socia', 'gestao', 'atendimento')
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('clientes')
    .select('id, nome, status')
    .eq('id', clienteId)
    .single()

  if (error || !data) return { error: 'Cliente não encontrado.' }

  const agora = new Date()
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()

  const [{ data: plano }, { data: cards }, { data: scores }] = await Promise.all([
    supabase
      .from('planos_cliente')
      .select('limite_demandas_mes, data_renovacao')
      .eq('cliente_id', clienteId)
      .maybeSingle(),
    supabase
      .from('cards')
      .select('id')
      .eq('cliente_id', clienteId)
      .neq('status', 'cancelado')
      .gte('created_at', inicioMes),
    supabase
      .from('health_scores')
      .select('score')
      .eq('cliente_id', clienteId)
      .order('calculado_em', { ascending: false })
      .limit(1),
  ])

  const usados = cards?.length ?? 0
  const limite = plano?.limite_demandas_mes ?? null

  return {
    cliente: {
      id: data.id,
      nome: data.nome,
      status: data.status,
      plano: limite
        ? {
            usados,
            limite,
            porcentagem: Math.min(100, Math.round((usados / limite) * 100)),
            dataRenovacao: (plano as { data_renovacao?: string })?.data_renovacao ?? null,
          }
        : null,
      scoreAtual: (scores?.[0] as { score?: number } | null)?.score ?? null,
    },
  }
}

// ---------------------------------------------------------------------------
// buscarSecoesMarca
// ---------------------------------------------------------------------------

export async function buscarSecoesMarca(clienteId: string): Promise<{
  secoes?: SecaoMarca[]
  error?: string
}> {
  await requirePapel('socia', 'gestao', 'atendimento')
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('universo_marca')
    .select('id, marca_id, categoria, subcategoria, titulo, conteudo, visivel_para_cliente, gerado_por_agente, versao, updated_at')
    .eq('cliente_id', clienteId)
    .order('categoria')
    .order('updated_at', { ascending: false })

  if (error) return { error: 'Erro ao buscar seções da marca.' }

  return {
    secoes: (data ?? []).map((s) => ({
      id: s.id,
      marcaId: s.marca_id,
      categoria: s.categoria,
      subcategoria: s.subcategoria,
      titulo: s.titulo,
      conteudo: (s.conteudo ?? {}) as Record<string, unknown>,
      visivelParaCliente: s.visivel_para_cliente,
      geradoPorAgente: s.gerado_por_agente,
      versao: s.versao,
      updatedAt: s.updated_at,
    })),
  }
}

// ---------------------------------------------------------------------------
// buscarAtivosVisuais
// ---------------------------------------------------------------------------

export async function buscarAtivosVisuais(clienteId: string): Promise<{
  ativos?: AtivoVisual[]
  error?: string
}> {
  await requirePapel('socia', 'gestao', 'atendimento')
  const supabase = await createClient()
  const service = createServiceClient()

  const { data, error } = await supabase
    .from('identidade_visual_ativos')
    .select('id, marca_id, categoria, nome, descricao, nota_uso, url, versao, tags, visivel_para_cliente, created_at')
    .eq('cliente_id', clienteId)
    .order('categoria')
    .order('created_at', { ascending: false })

  if (error) return { error: 'Erro ao buscar ativos visuais.' }

  const paths = (data ?? []).map((a) => a.url).filter((u): u is string => u != null)
  const { data: signed } = paths.length
    ? await service.storage.from('brand-assets').createSignedUrls(paths, 3600)
    : { data: [] }

  const urlMap = new Map((signed ?? []).map((s) => [s.path, s.signedUrl ?? '']))

  return {
    ativos: (data ?? []).map((a) => ({
      id: a.id,
      marcaId: a.marca_id,
      categoria: a.categoria,
      nome: a.nome,
      descricao: a.descricao,
      notaUso: a.nota_uso,
      url: a.url ?? '',
      urlAssinada: a.url ? (urlMap.get(a.url) ?? '') : '',
      versao: a.versao,
      tags: (a.tags ?? []) as string[],
      visivelParaCliente: a.visivel_para_cliente,
      criadoEm: a.created_at,
    })),
  }
}

// ---------------------------------------------------------------------------
// buscarMoodboard
// ---------------------------------------------------------------------------

export async function buscarMoodboard(clienteId: string): Promise<{
  items?: MoodboardItem[]
  error?: string
}> {
  await requirePapel('socia', 'gestao', 'atendimento')
  const supabase = await createClient()
  const service = createServiceClient()

  const { data, error } = await supabase
    .from('moodboard_items')
    .select('id, marca_id, secao, tipo, url, cor_hex, texto, nota, anti_referencia, ordem')
    .eq('cliente_id', clienteId)
    .order('secao')
    .order('ordem')

  if (error) return { error: 'Erro ao buscar moodboard.' }

  // Sign URLs somente para tipo = 'imagem_upload'
  const uploads = (data ?? []).filter((i) => i.tipo === 'imagem_upload' && i.url)
  const paths = uploads.map((i) => i.url as string)
  const { data: signed } = paths.length
    ? await service.storage.from('brand-assets').createSignedUrls(paths, 3600)
    : { data: [] }
  const urlMap = new Map((signed ?? []).map((s) => [s.path, s.signedUrl ?? '']))

  return {
    items: (data ?? []).map((i) => ({
      id: i.id,
      marcaId: i.marca_id,
      secao: i.secao,
      tipo: i.tipo,
      url: i.url,
      corHex: i.cor_hex,
      texto: i.texto,
      nota: i.nota,
      antiReferencia: i.anti_referencia,
      ordem: i.ordem,
      urlAssinada: i.tipo === 'imagem_upload' && i.url ? (urlMap.get(i.url) ?? '') : null,
    })),
  }
}

// ---------------------------------------------------------------------------
// actionSalvarSecaoMarca — cria ou atualiza uma seção
// ---------------------------------------------------------------------------

export async function actionSalvarSecaoMarca(opts: {
  clienteId: string
  marcaId?: string | null
  categoria: string
  subcategoria?: string
  titulo: string
  conteudo: Record<string, unknown>
  visivelParaCliente?: boolean
}): Promise<{ error?: string }> {
  const profile = await requirePapel('socia', 'gestao')
  const supabase = await createClient()

  // Verificar se já existe (escopado por marca)
  let buscaQuery = supabase
    .from('universo_marca')
    .select('id, versao')
    .eq('cliente_id', opts.clienteId)
    .eq('categoria', opts.categoria as 'outros' | 'brand_system' | 'personas' | 'diagnostico' | 'parametros' | 'calendario')
    .eq('subcategoria', opts.subcategoria ?? '')

  buscaQuery = opts.marcaId
    ? buscaQuery.eq('marca_id', opts.marcaId)
    : buscaQuery.is('marca_id', null)

  const { data: existente } = await buscaQuery.maybeSingle()

  if (existente) {
    const { error } = await supabase
      .from('universo_marca')
      .update({
        titulo: opts.titulo,
        conteudo: opts.conteudo as unknown as import('@/types/database').Json,
        visivel_para_cliente: opts.visivelParaCliente ?? false,
        versao: ((existente as { versao?: number }).versao ?? 1) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', (existente as { id: string }).id)

    if (error) return { error: 'Erro ao salvar seção.' }
  } else {
    const { error } = await supabase
      .from('universo_marca')
      .insert({
        organization_id: profile.organization_id,
        cliente_id: opts.clienteId,
        marca_id: opts.marcaId ?? null,
        categoria: opts.categoria as 'outros' | 'brand_system' | 'personas' | 'diagnostico' | 'parametros' | 'calendario',
        subcategoria: opts.subcategoria ?? null,
        titulo: opts.titulo,
        conteudo: opts.conteudo as unknown as import('@/types/database').Json,
        visivel_para_cliente: opts.visivelParaCliente ?? false,
      })

    if (error) return { error: 'Erro ao criar seção.' }
  }

  revalidatePath(`/clientes/${opts.clienteId}`)
  return {}
}

// ---------------------------------------------------------------------------
// actionUploadAtivoVisual — upload de arquivo para brand-assets
// ---------------------------------------------------------------------------

export async function actionUploadAtivoVisual(
  clienteId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const profile = await requirePapel('socia', 'gestao')
  const service = createServiceClient()

  const file = formData.get('file') as File | null
  const categoria = formData.get('categoria') as string | null
  const nome = formData.get('nome') as string | null
  const descricao = formData.get('descricao') as string | null
  const notaUso = formData.get('nota_uso') as string | null
  const visivelStr = formData.get('visivel_para_cliente') as string | null
  const visivel = visivelStr !== 'false'
  const marcaId = (formData.get('marca_id') as string | null) || null

  if (!file || !categoria || !nome) return { error: 'Arquivo, categoria e nome são obrigatórios.' }

  // Build storage path
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const storagePath = `${profile.organization_id}/${clienteId}/${categoria}/${Date.now()}-${nome.replace(/\s+/g, '-')}.${ext}`

  // Upload
  const buffer = await file.arrayBuffer()
  const { error: uploadError } = await service.storage
    .from('brand-assets')
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) return { error: `Erro no upload: ${uploadError.message}` }

  // Salvar registro
  const { error: dbError } = await service
    .from('identidade_visual_ativos')
    .insert({
      organization_id: profile.organization_id,
      cliente_id: clienteId,
      marca_id: marcaId,
      categoria: (categoria as 'tipografia' | 'logo' | 'paleta' | 'elemento_grafico' | 'mockup' | 'brand_guidelines' | 'arquivo_fonte'),
      nome,
      descricao: descricao || null,
      nota_uso: notaUso || null,
      url: storagePath,
      versao: 1,
      tags: [],
      visivel_para_cliente: visivel,
      adicionado_por: profile.id,
    })

  if (dbError) {
    // Limpa o arquivo se o registro falhou
    await service.storage.from('brand-assets').remove([storagePath])
    return { error: 'Erro ao salvar registro do ativo.' }
  }

  revalidatePath(`/clientes/${clienteId}`)
  return {}
}

// ---------------------------------------------------------------------------
// actionDeleteAtivoVisual
// ---------------------------------------------------------------------------

export async function actionDeleteAtivoVisual(
  ativoId: string,
  clienteId: string,
): Promise<{ error?: string }> {
  await requirePapel('socia', 'gestao')
  const supabase = await createClient()
  const service = createServiceClient()

  // Busca o path do arquivo
  const { data } = await supabase
    .from('identidade_visual_ativos')
    .select('url')
    .eq('id', ativoId)
    .maybeSingle()

  if (data?.url) {
    await service.storage.from('brand-assets').remove([(data as { url: string }).url])
  }

  const { error } = await supabase
    .from('identidade_visual_ativos')
    .delete()
    .eq('id', ativoId)

  if (error) return { error: 'Erro ao remover ativo.' }

  revalidatePath(`/clientes/${clienteId}`)
  return {}
}

// ---------------------------------------------------------------------------
// actionAddMoodboardItem
// ---------------------------------------------------------------------------

export async function actionAddMoodboardItem(opts: {
  clienteId: string
  marcaId?: string | null
  secao: string
  tipo: string
  url?: string
  corHex?: string
  texto?: string
  nota?: string
  antiReferencia?: boolean
}): Promise<{ error?: string }> {
  const profile = await requirePapel('socia', 'gestao')
  const supabase = await createClient()

  // Próxima ordem
  const { data: ultimo } = await supabase
    .from('moodboard_items')
    .select('ordem')
    .eq('cliente_id', opts.clienteId)
    .eq('secao', opts.secao as 'fotografia' | 'tipografia' | 'cor' | 'textura' | 'referencia_marca' | 'geral')
    .order('ordem', { ascending: false })
    .limit(1)
    .maybeSingle()

  const proxOrdem = ((ultimo as { ordem?: number } | null)?.ordem ?? 0) + 1

  const { error } = await supabase
    .from('moodboard_items')
    .insert({
      organization_id: profile.organization_id,
      cliente_id: opts.clienteId,
      marca_id: opts.marcaId ?? null,
      secao: opts.secao as 'fotografia' | 'tipografia' | 'cor' | 'textura' | 'referencia_marca' | 'geral',
      tipo: opts.tipo as 'cor' | 'imagem_upload' | 'link_externo' | 'texto',
      url: opts.url ?? null,
      cor_hex: opts.corHex ?? null,
      texto: opts.texto ?? null,
      nota: opts.nota ?? null,
      anti_referencia: opts.antiReferencia ?? false,
      ordem: proxOrdem,
      adicionado_por: profile.id,
    })

  if (error) return { error: 'Erro ao adicionar item.' }

  revalidatePath(`/clientes/${opts.clienteId}`)
  return {}
}

// ---------------------------------------------------------------------------
// InsightAgente — insight de IA para um agente neste cliente
// ---------------------------------------------------------------------------

export interface InsightAgente {
  id: string
  agentChave: string
  agentNome: string
  resumo: string
  taxaAprovacao: number | null
  totalFeedbacks: number
  padroesPositivos: string[]
  padroesNegativos: string[]
  sugestoes: string[]
  atualizadoEm: string
}

export async function buscarInsightsCliente(clienteId: string): Promise<{
  insights: InsightAgente[]
  error?: string
}> {
  await requirePapel('socia', 'gestao', 'atendimento')
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('agent_insights')
    .select(`
      id, resumo, taxa_aprovacao, total_feedbacks,
      padroes_positivos, padroes_negativos, sugestoes, atualizado_em,
      agente:agent_catalog!agent_id(chave, nome)
    `)
    .eq('cliente_id', clienteId)
    .order('atualizado_em', { ascending: false })

  if (error) return { insights: [] }

  return {
    insights: (data ?? []).map((r) => ({
      id: r.id,
      agentChave: (r.agente as unknown as { chave: string } | null)?.chave ?? '',
      agentNome: (r.agente as unknown as { nome: string } | null)?.nome ?? '—',
      resumo: r.resumo,
      taxaAprovacao: r.taxa_aprovacao ? Number(r.taxa_aprovacao) : null,
      totalFeedbacks: r.total_feedbacks,
      padroesPositivos: (r.padroes_positivos as string[]) ?? [],
      padroesNegativos: (r.padroes_negativos as string[]) ?? [],
      sugestoes: (r.sugestoes as string[]) ?? [],
      atualizadoEm: r.atualizado_em,
    })),
  }
}

// ---------------------------------------------------------------------------
// actionDeleteMoodboardItem
// ---------------------------------------------------------------------------

export async function actionDeleteMoodboardItem(
  itemId: string,
  clienteId: string,
): Promise<{ error?: string }> {
  await requirePapel('socia', 'gestao')
  const supabase = await createClient()

  const { error } = await supabase
    .from('moodboard_items')
    .delete()
    .eq('id', itemId)

  if (error) return { error: 'Erro ao remover item.' }

  revalidatePath(`/clientes/${clienteId}`)
  return {}
}
