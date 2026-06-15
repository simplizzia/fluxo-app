'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { requirePapel } from '@/lib/dal'
import Anthropic from '@anthropic-ai/sdk'
import type { Json } from '@/types/database'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type TipoSlide = 'capa' | 'titulo_secao' | 'texto' | 'imagem' | 'texto_imagem' | 'metricas' | 'citacao'
export type StatusApresentacao = 'rascunho' | 'publicada' | 'arquivada'

export interface SlideConteudo {
  // capa
  titulo?: string
  subtitulo?: string
  imagem_fundo_url?: string
  logo_url?: string
  // titulo_secao
  descricao?: string
  numero_secao?: number
  // texto
  corpo?: string
  // imagem
  imagem_url?: string
  legenda?: string
  // texto_imagem
  posicao?: 'esquerda' | 'direita'
  // metricas
  items?: { valor: string; label: string }[]
  // citacao
  texto?: string
  autor?: string
  cargo?: string
}

export interface Slide {
  id: string
  ordem: number
  tipo: TipoSlide
  conteudo: SlideConteudo
}

export interface Apresentacao {
  id: string
  titulo: string
  slug: string
  token: string
  status: StatusApresentacao
  tema: { corPrimaria?: string; corSecundaria?: string; fonteHeadline?: string }
  created_at: string
  updated_at: string
  slides?: Slide[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'apresentacao'
}

// ---------------------------------------------------------------------------
// actionListarApresentacoes
// ---------------------------------------------------------------------------

export async function actionListarApresentacoes(
  clienteId: string,
): Promise<{ data?: Apresentacao[]; error?: string }> {
  await requirePapel('socia', 'gestao', 'atendimento')
  const service = createServiceClient()

  const { data, error } = await service
    .from('apresentacoes')
    .select('id, titulo, slug, token, status, tema, created_at, updated_at')
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false })

  if (error) return { error: 'Erro ao listar apresentações.' }
  return { data: (data ?? []) as Apresentacao[] }
}

// ---------------------------------------------------------------------------
// actionCriarApresentacao
// ---------------------------------------------------------------------------

export async function actionCriarApresentacao(
  clienteId: string,
  titulo: string,
): Promise<{ data?: { id: string; token: string }; error?: string }> {
  const profile = await requirePapel('socia', 'gestao')
  const service = createServiceClient()

  // Garante slug único na org
  const baseSlug = slugify(titulo)
  let slug = baseSlug
  let tentativa = 0
  while (true) {
    const { data: existing } = await service
      .from('apresentacoes')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .eq('slug', slug)
      .maybeSingle()
    if (!existing) break
    tentativa++
    slug = `${baseSlug}-${tentativa}`
  }

  const { data: ap, error } = await service
    .from('apresentacoes')
    .insert({
      organization_id: profile.organization_id,
      cliente_id: clienteId,
      titulo,
      slug,
      created_by: profile.id,
    })
    .select('id, token')
    .single()

  if (error || !ap) return { error: 'Erro ao criar apresentação.' }

  // Cria slide capa inicial
  await service.from('apresentacao_slides').insert({
    organization_id: profile.organization_id,
    apresentacao_id: ap.id,
    ordem: 0,
    tipo: 'capa',
    conteudo: { titulo, subtitulo: '' } as Json,
  })

  revalidatePath(`/clientes/${clienteId}`)
  return { data: { id: ap.id, token: ap.token } }
}

// ---------------------------------------------------------------------------
// actionBuscarApresentacao (com slides)
// ---------------------------------------------------------------------------

export async function actionBuscarApresentacao(
  apresentacaoId: string,
): Promise<{ data?: Apresentacao; error?: string }> {
  await requirePapel('socia', 'gestao', 'atendimento')
  const service = createServiceClient()

  const { data: ap, error } = await service
    .from('apresentacoes')
    .select(`
      id, titulo, slug, token, status, tema, created_at, updated_at,
      slides:apresentacao_slides(id, ordem, tipo, conteudo)
    `)
    .eq('id', apresentacaoId)
    .single()

  if (error || !ap) return { error: 'Apresentação não encontrada.' }

  const slides = ((ap.slides ?? []) as Slide[]).sort((a, b) => a.ordem - b.ordem)
  return { data: { ...ap, slides } as Apresentacao }
}

// ---------------------------------------------------------------------------
// actionSalvarSlide
// ---------------------------------------------------------------------------

export async function actionSalvarSlide(
  slideId: string,
  conteudo: SlideConteudo,
  clienteId: string,
): Promise<{ error?: string }> {
  await requirePapel('socia', 'gestao', 'atendimento')
  const service = createServiceClient()

  const { error } = await service
    .from('apresentacao_slides')
    .update({ conteudo: conteudo as Json })
    .eq('id', slideId)

  if (error) return { error: 'Erro ao salvar slide.' }
  revalidatePath(`/clientes/${clienteId}`)
  return {}
}

// ---------------------------------------------------------------------------
// actionAdicionarSlide
// ---------------------------------------------------------------------------

export async function actionAdicionarSlide(
  apresentacaoId: string,
  tipo: TipoSlide,
  clienteId: string,
): Promise<{ data?: Slide; error?: string }> {
  const profile = await requirePapel('socia', 'gestao', 'atendimento')
  const service = createServiceClient()

  // Descobre a próxima ordem
  const { data: ultimo } = await service
    .from('apresentacao_slides')
    .select('ordem')
    .eq('apresentacao_id', apresentacaoId)
    .order('ordem', { ascending: false })
    .limit(1)
    .maybeSingle()

  const proxOrdem = (ultimo?.ordem ?? -1) + 1

  const conteudoInicial: SlideConteudo = tipo === 'metricas'
    ? { titulo: '', items: [{ valor: '', label: '' }] }
    : tipo === 'texto_imagem'
    ? { titulo: '', corpo: '', posicao: 'direita' }
    : { titulo: '' }

  const { data, error } = await service
    .from('apresentacao_slides')
    .insert({
      organization_id: profile.organization_id,
      apresentacao_id: apresentacaoId,
      ordem: proxOrdem,
      tipo,
      conteudo: conteudoInicial as Json,
    })
    .select('id, ordem, tipo, conteudo')
    .single()

  if (error || !data) return { error: 'Erro ao adicionar slide.' }
  revalidatePath(`/clientes/${clienteId}`)
  return { data: data as Slide }
}

// ---------------------------------------------------------------------------
// actionRemoverSlide
// ---------------------------------------------------------------------------

export async function actionRemoverSlide(
  slideId: string,
  clienteId: string,
): Promise<{ error?: string }> {
  await requirePapel('socia', 'gestao')
  const service = createServiceClient()

  const { error } = await service
    .from('apresentacao_slides')
    .delete()
    .eq('id', slideId)

  if (error) return { error: 'Erro ao remover slide.' }
  revalidatePath(`/clientes/${clienteId}`)
  return {}
}

// ---------------------------------------------------------------------------
// actionReordenarSlides
// ---------------------------------------------------------------------------

export async function actionReordenarSlides(
  slides: { id: string; ordem: number }[],
  clienteId: string,
): Promise<{ error?: string }> {
  await requirePapel('socia', 'gestao', 'atendimento')
  const service = createServiceClient()

  // Atualiza cada slide com a nova ordem em paralelo
  await Promise.all(
    slides.map(({ id, ordem }) =>
      service.from('apresentacao_slides').update({ ordem }).eq('id', id),
    ),
  )

  revalidatePath(`/clientes/${clienteId}`)
  return {}
}

// ---------------------------------------------------------------------------
// actionSalvarTemaApresentacao
// ---------------------------------------------------------------------------

export async function actionSalvarTemaApresentacao(
  apresentacaoId: string,
  tema: Apresentacao['tema'],
  clienteId: string,
): Promise<{ error?: string }> {
  await requirePapel('socia', 'gestao')
  const service = createServiceClient()

  const { error } = await service
    .from('apresentacoes')
    .update({ tema })
    .eq('id', apresentacaoId)

  if (error) return { error: 'Erro ao salvar tema.' }
  revalidatePath(`/clientes/${clienteId}`)
  return {}
}

// ---------------------------------------------------------------------------
// actionPublicarApresentacao
// ---------------------------------------------------------------------------

export async function actionPublicarApresentacao(
  apresentacaoId: string,
  clienteId: string,
): Promise<{ error?: string }> {
  await requirePapel('socia', 'gestao')
  const service = createServiceClient()

  const { error } = await service
    .from('apresentacoes')
    .update({ status: 'publicada' })
    .eq('id', apresentacaoId)

  if (error) return { error: 'Erro ao publicar.' }
  revalidatePath(`/clientes/${clienteId}`)
  return {}
}

// ---------------------------------------------------------------------------
// actionArquivarApresentacao
// ---------------------------------------------------------------------------

export async function actionArquivarApresentacao(
  apresentacaoId: string,
  clienteId: string,
): Promise<{ error?: string }> {
  await requirePapel('socia', 'gestao')
  const service = createServiceClient()

  const { error } = await service
    .from('apresentacoes')
    .update({ status: 'arquivada' })
    .eq('id', apresentacaoId)

  if (error) return { error: 'Erro ao arquivar.' }
  revalidatePath(`/clientes/${clienteId}`)
  return {}
}

// ---------------------------------------------------------------------------
// actionExcluirApresentacao
// ---------------------------------------------------------------------------

export async function actionExcluirApresentacao(
  apresentacaoId: string,
  clienteId: string,
): Promise<{ error?: string }> {
  await requirePapel('socia', 'gestao')
  const service = createServiceClient()

  const { error } = await service
    .from('apresentacoes')
    .delete()
    .eq('id', apresentacaoId)

  if (error) return { error: 'Erro ao excluir apresentação.' }
  revalidatePath(`/clientes/${clienteId}`)
  return {}
}

// ---------------------------------------------------------------------------
// actionUploadSlideImagem — upload de imagem para brand-assets/apresentacoes
// ---------------------------------------------------------------------------

export async function actionUploadSlideImagem(
  clienteId: string,
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  const profile = await requirePapel('socia', 'gestao', 'atendimento')
  const service = createServiceClient()

  const file = formData.get('file') as File | null
  if (!file) return { error: 'Arquivo obrigatório.' }

  const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const storagePath = `${profile.organization_id}/${clienteId}/apresentacoes/${Date.now()}.${ext}`

  const buffer = await file.arrayBuffer()
  const { error: uploadError } = await service.storage
    .from('brand-assets')
    .upload(storagePath, buffer, { contentType: file.type, upsert: false })

  if (uploadError) return { error: `Erro no upload: ${uploadError.message}` }

  return { url: storagePath }
}

// ---------------------------------------------------------------------------
// actionCarregarLogoCliente — retorna signed URL do logo do cliente (se existir)
// ---------------------------------------------------------------------------

export async function actionCarregarLogoCliente(
  clienteId: string,
): Promise<{ url?: string; storagePath?: string; error?: string }> {
  await requirePapel('socia', 'gestao', 'atendimento')
  const service = createServiceClient()

  const { data } = await service
    .from('identidade_visual_ativos')
    .select('url')
    .eq('cliente_id', clienteId)
    .eq('categoria', 'logo')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data?.url) return { error: 'Nenhum logo cadastrado para este cliente.' }

  const { data: signed } = await service.storage
    .from('brand-assets')
    .createSignedUrl(data.url, 3600)

  return { url: signed?.signedUrl, storagePath: data.url }
}

// ---------------------------------------------------------------------------
// actionGerarSlidesComIA — usa Claude para gerar slides a partir dos dados do cliente
// ---------------------------------------------------------------------------

export async function actionGerarSlidesComIA(
  apresentacaoId: string,
  clienteId: string,
): Promise<{ error?: string; slidesGerados?: number }> {
  const profile = await requirePapel('socia', 'gestao')
  const service = createServiceClient()

  // Carrega dados do cliente para contexto
  const { data: cliente } = await service
    .from('clientes')
    .select('nome')
    .eq('id', clienteId)
    .single()

  if (!cliente) return { error: 'Cliente não encontrado.' }

  const { data: sessao } = await service
    .from('onboarding_clientes')
    .select('client_name, setor, servicos_contratados, objetivo_declarado, dores_identificadas')
    .eq('cliente_id', clienteId)
    .maybeSingle()

  const { data: marcasUniverse } = await service
    .from('universo_marca')
    .select('titulo, conteudo, subcategoria')
    .eq('cliente_id', clienteId)
    .in('subcategoria', ['briefing_completo', 'prep_reuniao'])
    .order('created_at', { ascending: false })
    .limit(3)

  const contexto = [
    `Cliente: ${sessao?.client_name ?? cliente.nome}`,
    sessao?.setor ? `Setor: ${sessao.setor}` : null,
    Array.isArray(sessao?.servicos_contratados) && sessao.servicos_contratados.length
      ? `Serviços: ${(sessao.servicos_contratados as string[]).join(', ')}`
      : null,
    sessao?.objetivo_declarado ? `Objetivo: ${sessao.objetivo_declarado}` : null,
    sessao?.dores_identificadas ? `Dores: ${sessao.dores_identificadas}` : null,
  ].filter(Boolean).join('\n')

  const universoBrief = (marcasUniverse ?? [])
    .map((r) => `### ${r.titulo}\n${(r.conteudo as { texto?: string })?.texto ?? ''}`)
    .join('\n\n')

  const prompt = `Você é um especialista em apresentações de branding e marketing.
Com base nos dados do cliente abaixo, gere uma apresentação de introdução/onboarding em português brasileiro.

## Dados do cliente
${contexto}

## Universo da marca
${universoBrief || '(sem dados de briefing disponíveis — crie conteúdo de placeholder coerente)'}

## Instrução
Retorne um array JSON com 6 a 10 slides. Use apenas os tipos disponíveis e os campos correspondentes.

Tipos e campos:
- "capa": { "titulo": string, "subtitulo": string }
- "titulo_secao": { "titulo": string, "descricao": string, "numero_secao": number }
- "texto": { "titulo": string, "corpo": string (markdown simples, use **negrito** e listas) }
- "metricas": { "titulo": string, "items": [{ "valor": string, "label": string }] }
- "citacao": { "texto": string, "autor": string, "cargo": string }

Retorne APENAS o array JSON, sem explicação, sem markdown code fence.
Exemplo: [{"tipo":"capa","conteudo":{"titulo":"...","subtitulo":"..."}},...]`

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = msg.content.find((b) => b.type === 'text')?.text ?? ''
    let slidesData: Array<{ tipo: TipoSlide; conteudo: SlideConteudo }>

    try {
      slidesData = JSON.parse(raw)
    } catch {
      return { error: 'A Izzi retornou um formato inválido. Tente novamente.' }
    }

    if (!Array.isArray(slidesData) || slidesData.length === 0) {
      return { error: 'Nenhum slide gerado. Tente novamente.' }
    }

    // Remove slides existentes e insere os novos
    await service.from('apresentacao_slides').delete().eq('apresentacao_id', apresentacaoId)

    const rows = slidesData.map((s, i) => ({
      organization_id: profile.organization_id,
      apresentacao_id: apresentacaoId,
      ordem: i,
      tipo: s.tipo,
      conteudo: (s.conteudo ?? {}) as Json,
    }))

    const { error: insertError } = await service.from('apresentacao_slides').insert(rows)
    if (insertError) return { error: 'Erro ao salvar slides gerados.' }

    revalidatePath(`/clientes/${clienteId}`)
    return { slidesGerados: rows.length }
  } catch (err) {
    return { error: `Erro ao chamar a Izzi: ${String(err)}` }
  }
}

// ---------------------------------------------------------------------------
// actionGetSignedUrl — retorna URL assinada para um storagePath (para exibir imagens)
// ---------------------------------------------------------------------------

export async function actionGetSignedUrl(
  storagePath: string,
): Promise<{ url?: string; error?: string }> {
  await requirePapel('socia', 'gestao', 'atendimento')
  const service = createServiceClient()

  const { data } = await service.storage
    .from('brand-assets')
    .createSignedUrl(storagePath, 3600)

  if (!data?.signedUrl) return { error: 'Erro ao gerar URL.' }
  return { url: data.signedUrl }
}
