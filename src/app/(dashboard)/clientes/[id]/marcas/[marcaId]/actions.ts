'use server'

import { requirePapel } from '@/lib/dal'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { SecaoMarca, AtivoVisual, MoodboardItem, InsightAgente } from '../../actions'

export interface MarcaDetalhe {
  id: string
  nome: string
  nivel: 'mae' | 'sub' | 'standalone'
  marca_pai_id: string | null
  marca_pai_nome: string | null
  sub_marcas: { id: string; nome: string; nivel: string }[]
  site: string | null
  instagram: string | null
  linkedin: string | null
}

// ---------------------------------------------------------------------------
// buscarMarcaDetalhe — dados da marca + hierarquia (pai e filhas)
// ---------------------------------------------------------------------------

export async function buscarMarcaDetalhe(
  marcaId: string,
): Promise<{ marca?: MarcaDetalhe; error?: string }> {
  await requirePapel('socia', 'gestao', 'atendimento')
  const service = createServiceClient()

  const { data: marca, error } = await service
    .from('onboarding_marcas')
    .select('id, nome, nivel, marca_pai_id, site, instagram, linkedin')
    .eq('id', marcaId)
    .single()

  if (error || !marca) return { error: 'Marca não encontrada.' }

  // Busca nome da marca mãe (se sub-marca)
  let marcaPaiNome: string | null = null
  if (marca.marca_pai_id) {
    const { data: pai } = await service
      .from('onboarding_marcas')
      .select('nome')
      .eq('id', marca.marca_pai_id)
      .single()
    marcaPaiNome = pai?.nome ?? null
  }

  // Busca sub-marcas (se marca mãe)
  const { data: filhas } = await service
    .from('onboarding_marcas')
    .select('id, nome, nivel')
    .eq('marca_pai_id', marcaId)
    .order('ordem', { ascending: true })

  return {
    marca: {
      id: marca.id,
      nome: marca.nome,
      nivel: (marca.nivel ?? 'standalone') as MarcaDetalhe['nivel'],
      marca_pai_id: marca.marca_pai_id,
      marca_pai_nome: marcaPaiNome,
      sub_marcas: (filhas ?? []) as { id: string; nome: string; nivel: string }[],
      site: marca.site,
      instagram: marca.instagram,
      linkedin: marca.linkedin,
    },
  }
}

// ---------------------------------------------------------------------------
// buscarSecoesDaMarca — seções filtradas para esta marca
// ---------------------------------------------------------------------------

export async function buscarSecoesDaMarca(
  clienteId: string,
  marcaId: string,
): Promise<{ secoes?: SecaoMarca[]; error?: string }> {
  await requirePapel('socia', 'gestao', 'atendimento')
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('universo_marca')
    .select('id, marca_id, categoria, subcategoria, titulo, conteudo, visivel_para_cliente, gerado_por_agente, versao, updated_at')
    .eq('cliente_id', clienteId)
    .eq('marca_id', marcaId)
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
// buscarAtivosDaMarca — ativos visuais filtrados para esta marca
// ---------------------------------------------------------------------------

export async function buscarAtivosDaMarca(
  clienteId: string,
  marcaId: string,
): Promise<{ ativos?: AtivoVisual[]; error?: string }> {
  await requirePapel('socia', 'gestao', 'atendimento')
  const supabase = await createClient()
  const service = createServiceClient()

  const { data, error } = await supabase
    .from('identidade_visual_ativos')
    .select('id, marca_id, categoria, nome, descricao, nota_uso, url, versao, tags, visivel_para_cliente, created_at')
    .eq('cliente_id', clienteId)
    .eq('marca_id', marcaId)
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
// buscarMoodboardDaMarca — moodboard filtrado para esta marca
// ---------------------------------------------------------------------------

export async function buscarMoodboardDaMarca(
  clienteId: string,
  marcaId: string,
): Promise<{ items?: MoodboardItem[]; error?: string }> {
  await requirePapel('socia', 'gestao', 'atendimento')
  const supabase = await createClient()
  const service = createServiceClient()

  const { data, error } = await supabase
    .from('moodboard_items')
    .select('id, marca_id, secao, tipo, url, cor_hex, texto, nota, anti_referencia, ordem')
    .eq('cliente_id', clienteId)
    .eq('marca_id', marcaId)
    .order('secao')
    .order('ordem')

  if (error) return { error: 'Erro ao buscar moodboard.' }

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
// buscarInsightsDaMarca — insights de IA filtrados para esta marca
// ---------------------------------------------------------------------------

export async function buscarInsightsDaMarca(
  clienteId: string,
): Promise<{ insights: InsightAgente[]; error?: string }> {
  await requirePapel('socia', 'gestao', 'atendimento')
  const supabase = await createClient()

  const { data } = await supabase
    .from('agent_insights')
    .select('id, agent_id, resumo, taxa_aprovacao, total_feedbacks, padroes_positivos, padroes_negativos, sugestoes, atualizado_em, agent_catalog(chave, nome)')
    .eq('cliente_id', clienteId)
    .order('atualizado_em', { ascending: false })

  type Row = typeof data extends (infer T)[] | null ? T : never
  const mapRow = (r: Row): InsightAgente => ({
    id: (r as { id: string }).id,
    agentChave: ((r as { agent_catalog?: { chave?: string } }).agent_catalog?.chave) ?? '',
    agentNome: ((r as { agent_catalog?: { nome?: string } }).agent_catalog?.nome) ?? '',
    resumo: (r as { resumo?: string | null }).resumo ?? '',
    taxaAprovacao: (r as { taxa_aprovacao?: number | null }).taxa_aprovacao ?? null,
    totalFeedbacks: (r as { total_feedbacks?: number }).total_feedbacks ?? 0,
    padroesPositivos: ((r as { padroes_positivos?: string[] }).padroes_positivos) ?? [],
    padroesNegativos: ((r as { padroes_negativos?: string[] }).padroes_negativos) ?? [],
    sugestoes: ((r as { sugestoes?: string[] }).sugestoes) ?? [],
    atualizadoEm: (r as { atualizado_em: string }).atualizado_em,
  })

  return { insights: (data ?? []).map(mapRow) }
}
