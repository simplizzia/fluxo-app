'use server'

import { getCurrentProfile } from '@/lib/dal'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { TipoArquivo } from '@/types/database'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface CardAprovacao {
  id: string
  titulo: string
  status: string
  rodadas_revisao: number
  cliente: { id: string; nome: string }
  tipo: { nome: string }
}

export interface ArquivoAprovacao {
  id: string
  tipo: TipoArquivo
  versao: number | null
  nome_arquivo: string
  mime_type: string
  tamanho_bytes: number
  created_at: string
  url_assinada: string
  uploader: { nome: string }
}

// ---------------------------------------------------------------------------
// actionBuscarCardParaAprovacao
// ---------------------------------------------------------------------------

export async function actionBuscarCardParaAprovacao(cardId: string): Promise<{
  card?: CardAprovacao
  error?: string
}> {
  // Qualquer papel autenticado pode ver o card (RLS cuida do isolamento)
  await getCurrentProfile()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('cards')
    .select(`
      id, titulo, status, rodadas_revisao,
      cliente:clientes!cliente_id(id, nome),
      tipo:tipos_demanda!tipo_id(nome)
    `)
    .eq('id', cardId)
    .single()

  if (error || !data) return { error: 'Demanda não encontrada.' }

  return {
    card: {
      id: data.id,
      titulo: data.titulo,
      status: data.status,
      rodadas_revisao: data.rodadas_revisao ?? 0,
      cliente: data.cliente as unknown as { id: string; nome: string },
      tipo: data.tipo as unknown as { nome: string },
    },
  }
}

// ---------------------------------------------------------------------------
// actionBuscarArquivosAprovacao — retorna entregas/revisões com URLs assinadas
// ---------------------------------------------------------------------------

export async function actionBuscarArquivosAprovacao(cardId: string): Promise<{
  arquivos?: ArquivoAprovacao[]
  error?: string
}> {
  await getCurrentProfile()
  const supabase = await createClient()
  const service = createServiceClient()

  const { data, error } = await supabase
    .from('arquivos')
    .select(`
      id, tipo, versao, nome_arquivo, mime_type, tamanho_bytes, created_at, url,
      uploader:profiles!uploaded_by(nome)
    `)
    .eq('card_id', cardId)
    .in('tipo', ['entrega', 'revisao'])
    .order('created_at', { ascending: false })

  if (error) return { error: 'Erro ao buscar arquivos.' }

  const rows = data ?? []
  const paths = rows.map((r) => r.url)

  const { data: signedList } = paths.length > 0
    ? await service.storage.from('content-files').createSignedUrls(paths, 3600)
    : { data: [] }

  const urlPorPath = new Map(
    (signedList ?? []).map((s) => [s.path, s.signedUrl ?? '']),
  )

  return {
    arquivos: rows.map((r) => ({
      id: r.id,
      tipo: r.tipo as TipoArquivo,
      versao: r.versao,
      nome_arquivo: r.nome_arquivo,
      mime_type: r.mime_type,
      tamanho_bytes: r.tamanho_bytes,
      created_at: r.created_at,
      url_assinada: urlPorPath.get(r.url) ?? '',
      uploader: r.uploader as unknown as { nome: string },
    })),
  }
}
