'use server'

import { requirePapel } from '@/lib/dal'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface MarcaClienteData {
  clienteNome: string
  secoes: { id: string; categoria: string; titulo: string; conteudo: Record<string, unknown> }[]
  ativos: { id: string; categoria: string; nome: string; descricao: string | null; notaUso: string | null; urlAssinada: string }[]
  moodboard: { id: string; secao: string; tipo: string; url: string | null; corHex: string | null; texto: string | null; nota: string | null; antiReferencia: boolean; urlAssinada: string | null }[]
}

// ---------------------------------------------------------------------------
// buscarMarcaCliente — acesso do papel 'cliente' ao próprio universo da marca
// ---------------------------------------------------------------------------

export async function buscarMarcaCliente(): Promise<{
  data?: MarcaClienteData
  error?: string
}> {
  await requirePapel('cliente', 'socia', 'gestao', 'atendimento')
  const supabase = await createClient()
  const service = createServiceClient()

  // RLS já filtra: cliente vê só os clientes aos quais está vinculado,
  // e apenas registros com visivel_para_cliente = true.

  // 1. Seções visíveis
  const { data: secoes, error: errSecoes } = await supabase
    .from('universo_marca')
    .select('id, categoria, titulo, conteudo, cliente_id, clientes!cliente_id(nome)')
    .eq('visivel_para_cliente', true)
    .order('categoria')
    .limit(1, { foreignTable: 'clientes' })

  if (errSecoes) return { error: 'Erro ao buscar dados da marca.' }

  // Nome do cliente (pega do primeiro resultado ou via profile)
  const clienteNome = (secoes?.[0] as unknown as { clientes?: { nome?: string } } | null)
    ?.clientes?.nome ?? ''

  // 2. Ativos visuais visíveis (sem arquivo_fonte)
  const { data: ativos } = await supabase
    .from('identidade_visual_ativos')
    .select('id, categoria, nome, descricao, nota_uso, url')
    .eq('visivel_para_cliente', true)
    .neq('categoria', 'arquivo_fonte')
    .order('categoria')

  // 3. Moodboard items
  const { data: moodItems } = await supabase
    .from('moodboard_items')
    .select('id, secao, tipo, url, cor_hex, texto, nota, anti_referencia')
    .order('secao')
    .order('ordem')

  // 4. Sign URLs para ativos visuais
  const ativosPaths = (ativos ?? []).map((a) => a.url).filter((u): u is string => u != null)
  const { data: signedAtivos } = ativosPaths.length
    ? await service.storage.from('brand-assets').createSignedUrls(ativosPaths, 3600)
    : { data: [] }
  const ativosUrlMap = new Map((signedAtivos ?? []).map((s) => [s.path, s.signedUrl ?? '']))

  // 5. Sign URLs para moodboard (imagem_upload)
  const moodPaths = (moodItems ?? [])
    .filter((i) => i.tipo === 'imagem_upload' && i.url)
    .map((i) => i.url as string)
  const { data: signedMood } = moodPaths.length
    ? await service.storage.from('brand-assets').createSignedUrls(moodPaths, 3600)
    : { data: [] }
  const moodUrlMap = new Map((signedMood ?? []).map((s) => [s.path, s.signedUrl ?? '']))

  return {
    data: {
      clienteNome,
      secoes: (secoes ?? []).map((s) => ({
        id: s.id,
        categoria: s.categoria,
        titulo: s.titulo,
        conteudo: (s.conteudo ?? {}) as Record<string, unknown>,
      })),
      ativos: (ativos ?? []).map((a) => ({
        id: a.id,
        categoria: a.categoria,
        nome: a.nome,
        descricao: a.descricao,
        notaUso: a.nota_uso,
        urlAssinada: ativosUrlMap.get(a.url) ?? '',
      })),
      moodboard: (moodItems ?? []).map((i) => ({
        id: i.id,
        secao: i.secao,
        tipo: i.tipo,
        url: i.url,
        corHex: i.cor_hex,
        texto: i.texto,
        nota: i.nota,
        antiReferencia: i.anti_referencia,
        urlAssinada: i.tipo === 'imagem_upload' && i.url ? (moodUrlMap.get(i.url) ?? '') : null,
      })),
    },
  }
}
