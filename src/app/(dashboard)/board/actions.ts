'use server'

import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getCurrentProfile, requireEquipe, requirePapel } from '@/lib/dal'
import type { StatusCard, PrioridadeCard, CampoFormulario, Comentario, TipoArquivo } from '@/types/database'
import {
  buscarInfoResponsaveis,
  buscarInfoPerfilPorId,
  buscarEmailsEquipe,
  enviarEmail,
  emailParaAprovacao,
  emailCardAprovado,
  emailCardReprovado,
  emailCardCancelado,
} from '@/lib/email'
import { avaliarBadges } from '@/lib/gamificacao'
import { calcCreditosCard } from '@/lib/uso'
import { notificarClienteParaAprovacao } from '@/lib/whatsapp'

// ---------------------------------------------------------------------------
// Tipos compartilhados com o client
// ---------------------------------------------------------------------------

export interface BoardCard {
  id: string
  titulo: string
  status: StatusCard
  prioridade: PrioridadeCard
  prazo_cliente: string | null
  data_entrega_programada: string | null
  confidencial: boolean
  created_at: string
  sla_iniciado_em: string | null
  cliente: { id: string; nome: string }
  tipo: {
    id: string
    nome: string
    categoria: string
    sla_ativo: boolean
    sla_prazo_inicio_horas: number | null
    sla_prazo_resposta_horas: number | null
  }
  responsavel: { id: string; nome: string } | null
}

// ---------------------------------------------------------------------------
// actionMoverCard — atualiza status via drag-and-drop
// ---------------------------------------------------------------------------

export async function actionMoverCard(
  cardId: string,
  novoStatus: StatusCard,
): Promise<{ error?: string }> {
  const profile = await requireEquipe()
  const supabase = await createClient()

  const { data: card, error: fetchError } = await supabase
    .from('cards')
    .select('status, organization_id')
    .eq('id', cardId)
    .single()

  if (fetchError || !card) {
    return { error: 'Card não encontrado.' }
  }

  if (card.status === novoStatus) return {}

  const { error } = await supabase
    .from('cards')
    .update({ status: novoStatus })
    .eq('id', cardId)

  if (error) {
    console.error('[actionMoverCard]', error.message)
    return { error: 'Erro ao mover card.' }
  }

  // Histórico de status
  await supabase.from('card_status_history').insert({
    organization_id: card.organization_id,
    card_id: cardId,
    status_anterior: card.status,
    status_novo: novoStatus,
    alterado_por: profile.id,
  })

  // Audit log
  await supabase.from('audit_log').insert({
    organization_id: card.organization_id,
    usuario_id: profile.id,
    acao: 'card.status_changed',
    entidade: 'card',
    entidade_id: cardId,
    metadata: { de: card.status, para: novoStatus },
  })

  return {}
}

// ---------------------------------------------------------------------------
// actionCriarCard — cria uma nova demanda
// ---------------------------------------------------------------------------

export interface CriarCardInput {
  titulo: string
  cliente_id: string
  tipo_id: string
  prioridade: 'urgente' | 'alta' | 'normal' | 'baixa'
  prazo_cliente?: string
  data_entrega_programada?: string
  responsavel_id?: string
  confidencial?: boolean
}

const CreateCardSchema = z.object({
  titulo: z.string().trim().min(3, { message: 'Título deve ter pelo menos 3 caracteres.' }),
  cliente_id: z.string().min(1, { message: 'Selecione um cliente.' }),
  tipo_id: z.string().min(1, { message: 'Selecione o tipo de demanda.' }),
  prioridade: z.enum(['urgente', 'alta', 'normal', 'baixa'] as const),
  prazo_cliente: z.string().optional(),
  data_entrega_programada: z.string().optional(),
  responsavel_id: z.string().optional(),
  confidencial: z.boolean().default(false),
})

export async function actionCriarCard(
  input: CriarCardInput,
  camposPublicos: Record<string, string>,
  camposInternos: Record<string, string>,
): Promise<{ card?: BoardCard; error?: string; errors?: Record<string, string[]> }> {
  const profile = await requireEquipe()
  const supabase = await createClient()

  const validated = CreateCardSchema.safeParse({
    titulo: input.titulo,
    cliente_id: input.cliente_id,
    tipo_id: input.tipo_id,
    prioridade: input.prioridade || 'normal',
    prazo_cliente: input.prazo_cliente || undefined,
    data_entrega_programada: input.data_entrega_programada || undefined,
    responsavel_id: input.responsavel_id || undefined,
    confidencial: input.confidencial ?? false,
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const { titulo, cliente_id, tipo_id, prioridade, prazo_cliente, data_entrega_programada, responsavel_id, confidencial } =
    validated.data

  // Passo 1: inserir e pegar apenas o ID
  const { data: newRow, error: insertError } = await supabase
    .from('cards')
    .insert({
      organization_id: profile.organization_id,
      cliente_id,
      tipo_id,
      criado_por: profile.id,
      responsavel_id: responsavel_id || null,
      titulo,
      prioridade,
      prazo_cliente: prazo_cliente || null,
      data_entrega_programada: data_entrega_programada || null,
      confidencial,
      status: 'aguardando_info',
      campos_publicos: camposPublicos,
    })
    .select('id')
    .single()

  if (insertError || !newRow) {
    console.error('[actionCriarCard] insert:', insertError?.message)
    return { error: 'Erro ao criar demanda. Tente novamente.' }
  }

  // Campos internos vivem em tabela isolada (RLS nega acesso direto via API).
  // Escrita server-side via service role.
  if (camposInternos && Object.keys(camposInternos).length > 0) {
    const svc = createServiceClient()
    await (svc.from('cards_internos' as never) as unknown as { insert: (v: unknown) => Promise<unknown> })
      .insert({
        card_id: newRow.id,
        organization_id: profile.organization_id,
        dados: camposInternos,
      })
  }

  // Calcula créditos consumidos (best-effort — não bloqueia se migração pendente)
  if (tipo_id) {
    calcCreditosCard(tipo_id, profile.organization_id).then(async (creditos) => {
      if (creditos > 0) {
        const svc = createServiceClient()
        await Promise.resolve(
          svc.from('cards')
            .update({ creditos_consumidos: creditos })
            .eq('id', newRow.id)
        ).catch(() => {})
      }
    }).catch(() => {})
  }

  // Passo 2: buscar o card completo com joins (mesmo padrão da board page)
  const { data: card, error: selectError } = await supabase
    .from('cards')
    .select(`
      id, titulo, status, prioridade, prazo_cliente, confidencial, created_at,
      cliente:clientes!cliente_id(id, nome),
      tipo:tipos_demanda!tipo_id(id, nome, categoria),
      responsavel:profiles!responsavel_id(id, nome)
    `)
    .eq('id', newRow.id)
    .single()

  if (selectError || !card) {
    console.error('[actionCriarCard] select:', selectError?.message)
    return { error: 'Demanda criada mas houve um erro ao carregá-la. Recarregue o board.' }
  }

  // Histórico de status inicial
  await supabase.from('card_status_history').insert({
    organization_id: profile.organization_id,
    card_id: card.id,
    status_anterior: null,
    status_novo: 'aguardando_info',
    alterado_por: profile.id,
  })

  // Audit log
  await supabase.from('audit_log').insert({
    organization_id: profile.organization_id,
    usuario_id: profile.id,
    acao: 'card.created',
    entidade: 'card',
    entidade_id: card.id,
    metadata: { titulo, tipo_id, cliente_id },
  })

  return { card: { ...card, data_entrega_programada } as unknown as BoardCard }
}

// ---------------------------------------------------------------------------
// actionBuscarTipo — retorna campos_formulario de um tipo específico
// ---------------------------------------------------------------------------

export async function actionBuscarTipo(tipoId: string): Promise<{
  campos?: CampoFormulario[]
  tem_publicacao?: boolean
  error?: string
}> {
  await getCurrentProfile()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tipos_demanda')
    .select('campos_formulario, tem_publicacao')
    .eq('id', tipoId)
    .single()

  if (error || !data) return { error: 'Tipo não encontrado.' }

  return {
    campos: data.campos_formulario as unknown as CampoFormulario[],
    tem_publicacao: data.tem_publicacao,
  }
}

// ---------------------------------------------------------------------------
// actionBuscarCardDetalhes — retorna campos dinâmicos de um card específico
// ---------------------------------------------------------------------------

export async function actionBuscarCardDetalhes(cardId: string): Promise<{
  campos_publicos?: Record<string, unknown>
  campos_internos?: Record<string, unknown> | null
  campos_formulario?: CampoFormulario[]
  rodadas_revisao?: number
  motivo_cancelamento?: string | null
  agente_chave?: string | null
  tem_publicacao?: boolean
  error?: string
}> {
  const profile = await getCurrentProfile()
  const supabase = await createClient()

  const { data: card, error } = await supabase
    .from('cards')
    .select(
      'campos_publicos, rodadas_revisao, motivo_cancelamento, tipo:tipos_demanda!tipo_id(campos_formulario, agente_slug, tem_publicacao)',
    )
    .eq('id', cardId)
    .single()

  if (error || !card) return { error: 'Card não encontrado.' }

  const ehEquipe = profile.papel !== 'cliente'
  const tipo = card.tipo as unknown as { campos_formulario: CampoFormulario[]; agente_slug: string | null; tem_publicacao: boolean | null } | null

  // campos_internos vive em tabela isolada; só a equipe lê, via service role.
  // A RLS de `cards` acima já garantiu que este usuário pode ver este card.
  let camposInternos: Record<string, unknown> | null = null
  if (ehEquipe) {
    const svc = createServiceClient()
    const { data: internos } = await (svc.from('cards_internos' as never) as unknown as {
      select: (c: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: { dados: unknown } | null }> } }
    }).select('dados').eq('card_id', cardId).maybeSingle()
    camposInternos = (internos?.dados as Record<string, unknown>) ?? {}
  }

  return {
    campos_publicos: (card.campos_publicos as Record<string, unknown>) ?? {},
    campos_internos: camposInternos,
    campos_formulario: tipo?.campos_formulario ?? [],
    rodadas_revisao: card.rodadas_revisao ?? 0,
    motivo_cancelamento: card.motivo_cancelamento ?? null,
    agente_chave: ehEquipe ? (tipo?.agente_slug ?? null) : null,
    tem_publicacao: ehEquipe ? (tipo?.tem_publicacao ?? false) : false,
  }
}

// ---------------------------------------------------------------------------
// actionBuscarComentarios — retorna comentários de um card
// ---------------------------------------------------------------------------

export async function actionBuscarComentarios(cardId: string): Promise<{
  comentarios?: Comentario[]
  error?: string
}> {
  await getCurrentProfile()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('comentarios')
    .select(`
      id, organization_id, card_id, autor_id, texto, visivel_para_cliente, created_at,
      autor:profiles!autor_id(id, nome, papel)
    `)
    .eq('card_id', cardId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[actionBuscarComentarios]', error.message)
    return { error: 'Erro ao carregar comentários.' }
  }

  return { comentarios: data as unknown as Comentario[] }
}

// ---------------------------------------------------------------------------
// actionCriarComentario — cria um comentário em um card
// ---------------------------------------------------------------------------

export async function actionCriarComentario(
  cardId: string,
  texto: string,
  visivelParaCliente: boolean,
): Promise<{ comentario?: Comentario; error?: string }> {
  const profile = await getCurrentProfile()
  const supabase = await createClient()

  // Executor: comentários sempre internos (nunca visíveis ao cliente)
  // Cliente: comentários sempre visíveis (não há toggle pra eles)
  let visivelFinal = visivelParaCliente
  if (profile.papel === 'executor') visivelFinal = false
  if (profile.papel === 'cliente') visivelFinal = true

  const textoTrimado = texto.trim()
  if (!textoTrimado) return { error: 'Comentário não pode ser vazio.' }

  // Buscar organization_id do card para o insert
  const { data: card, error: cardError } = await supabase
    .from('cards')
    .select('organization_id')
    .eq('id', cardId)
    .single()

  if (cardError || !card) return { error: 'Card não encontrado.' }

  const { data, error } = await supabase
    .from('comentarios')
    .insert({
      organization_id: card.organization_id,
      card_id: cardId,
      autor_id: profile.id,
      texto: textoTrimado,
      visivel_para_cliente: visivelFinal,
    })
    .select(`
      id, organization_id, card_id, autor_id, texto, visivel_para_cliente, created_at,
      autor:profiles!autor_id(id, nome, papel)
    `)
    .single()

  if (error || !data) {
    console.error('[actionCriarComentario]', error?.message)
    return { error: 'Erro ao criar comentário.' }
  }

  // Audit log
  await supabase.from('audit_log').insert({
    organization_id: card.organization_id,
    usuario_id: profile.id,
    acao: 'comentario.created',
    entidade: 'card',
    entidade_id: cardId,
    metadata: { visivel_para_cliente: visivelFinal },
  })

  return { comentario: data as unknown as Comentario }
}

// ---------------------------------------------------------------------------
// Tipos de arquivo — compartilhados com o client
// ---------------------------------------------------------------------------

export interface ArquivoComUrl {
  id: string
  card_id: string
  tipo: TipoArquivo
  versao: number | null
  nome_arquivo: string
  mime_type: string
  tamanho_bytes: number
  created_at: string
  url_assinada: string
  uploader: { id: string; nome: string }
}

// ---------------------------------------------------------------------------
// actionBuscarArquivos — lista arquivos de um card com URLs assinadas (1h)
// ---------------------------------------------------------------------------

export async function actionBuscarArquivos(cardId: string): Promise<{
  arquivos?: ArquivoComUrl[]
  error?: string
}> {
  await getCurrentProfile()
  const supabase = await createClient()
  const service = createServiceClient()

  const { data, error } = await supabase
    .from('arquivos')
    .select(`
      id, card_id, tipo, versao, nome_arquivo, mime_type, tamanho_bytes, created_at, url,
      uploader:profiles!uploaded_by(id, nome)
    `)
    .eq('card_id', cardId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[actionBuscarArquivos]', error.message)
    return { error: 'Erro ao carregar arquivos.' }
  }

  const rows = data ?? []

  // Uma única chamada bulk ao invés de N chamadas individuais
  const paths = rows.map((arq) => arq.url)
  const { data: signedList } = paths.length > 0
    ? await service.storage.from('content-files').createSignedUrls(paths, 3600)
    : { data: [] }

  // Indexa URLs assinadas por path para lookup O(1)
  const urlPorPath = new Map(
    (signedList ?? []).map((s) => [s.path, s.signedUrl ?? '']),
  )

  const arquivosComUrl: ArquivoComUrl[] = rows.map((arq) => ({
    id: arq.id,
    card_id: arq.card_id,
    tipo: arq.tipo as TipoArquivo,
    versao: arq.versao,
    nome_arquivo: arq.nome_arquivo,
    mime_type: arq.mime_type,
    tamanho_bytes: arq.tamanho_bytes,
    created_at: arq.created_at,
    url_assinada: urlPorPath.get(arq.url) ?? '',
    uploader: arq.uploader as unknown as { id: string; nome: string },
  }))

  return { arquivos: arquivosComUrl }
}

// ---------------------------------------------------------------------------
// actionUploadArquivo — valida, faz upload e registra no banco
// ---------------------------------------------------------------------------

const MIME_PERMITIDOS = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'video/mp4', 'video/quicktime', 'video/webm',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
])

const TAMANHO_MAX = 10 * 1024 * 1024 // 10 MB

export async function actionUploadArquivo(
  cardId: string,
  tipo: TipoArquivo,
  formData: FormData,
): Promise<{ arquivo?: ArquivoComUrl; error?: string }> {
  const profile = await requireEquipe()
  const supabase = await createClient()
  const service = createServiceClient()

  // Validação do arquivo
  const file = formData.get('arquivo') as File | null
  if (!file || file.size === 0) return { error: 'Nenhum arquivo selecionado.' }
  if (!MIME_PERMITIDOS.has(file.type)) return { error: 'Tipo de arquivo não permitido.' }
  if (file.size > TAMANHO_MAX) return { error: 'Arquivo muito grande. Máximo: 10 MB.' }

  // Busca organization_id do card (RLS garante acesso)
  const { data: card, error: cardError } = await supabase
    .from('cards')
    .select('organization_id')
    .eq('id', cardId)
    .single()

  if (cardError || !card) return { error: 'Card não encontrado.' }

  // Próxima versão para entregas/revisões
  let versao: number | null = null
  if (tipo === 'entrega' || tipo === 'revisao') {
    const { data: ultimo } = await supabase
      .from('arquivos')
      .select('versao')
      .eq('card_id', cardId)
      .in('tipo', ['entrega', 'revisao'])
      .not('versao', 'is', null)
      .order('versao', { ascending: false })
      .limit(1)
      .maybeSingle()

    versao = (ultimo?.versao ?? 0) + 1
  }

  // Path no Storage: {org_id}/{card_id}/{tipo}/{ts}-{nome}
  const nomeSeguro = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${card.organization_id}/${cardId}/${tipo}/${Date.now()}-${nomeSeguro}`

  // Upload via service role (bucket privado)
  const buffer = await file.arrayBuffer()
  const { error: uploadError } = await service.storage
    .from('content-files')
    .upload(storagePath, buffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    console.error('[actionUploadArquivo] storage:', uploadError.message)
    return { error: 'Erro ao enviar arquivo. Tente novamente.' }
  }

  // Registra na tabela (service role para evitar ambiguidade de RLS no insert)
  const { data: novoArquivo, error: insertError } = await service
    .from('arquivos')
    .insert({
      organization_id: card.organization_id,
      card_id: cardId,
      tipo,
      versao,
      uploaded_by: profile.id,
      url: storagePath,
      nome_arquivo: file.name,
      mime_type: file.type,
      tamanho_bytes: file.size,
    })
    .select(`
      id, card_id, tipo, versao, nome_arquivo, mime_type, tamanho_bytes, created_at, url,
      uploader:profiles!uploaded_by(id, nome)
    `)
    .single()

  if (insertError || !novoArquivo) {
    console.error('[actionUploadArquivo] insert:', insertError?.message)
    // Desfaz o upload caso a inserção falhe
    await service.storage.from('content-files').remove([storagePath])
    return { error: 'Erro ao registrar arquivo.' }
  }

  // URL assinada para uso imediato (1h)
  const { data: signed } = await service.storage
    .from('content-files')
    .createSignedUrl(storagePath, 3600)

  // Atualiza versao_entrega_atual no card (entregas e revisões)
  if (versao !== null) {
    await service
      .from('cards')
      .update({ versao_entrega_atual: versao })
      .eq('id', cardId)
  }

  // Audit log
  await service.from('audit_log').insert({
    organization_id: card.organization_id,
    usuario_id: profile.id,
    acao: 'arquivo.uploaded',
    entidade: 'card',
    entidade_id: cardId,
    metadata: { tipo, nome: file.name, tamanho: file.size, versao },
  })

  return {
    arquivo: {
      id: novoArquivo.id,
      card_id: novoArquivo.card_id,
      tipo: novoArquivo.tipo as TipoArquivo,
      versao: novoArquivo.versao,
      nome_arquivo: novoArquivo.nome_arquivo,
      mime_type: novoArquivo.mime_type,
      tamanho_bytes: novoArquivo.tamanho_bytes,
      created_at: novoArquivo.created_at,
      url_assinada: signed?.signedUrl ?? '',
      uploader: novoArquivo.uploader as unknown as { id: string; nome: string },
    },
  }
}

// ---------------------------------------------------------------------------
// actionEnviarParaAprovacao — socia/gestao/atendimento envia card ao cliente
// ---------------------------------------------------------------------------

export async function actionEnviarParaAprovacao(
  cardId: string,
): Promise<{ error?: string }> {
  const profile = await requirePapel('socia', 'gestao', 'atendimento')
  const supabase = await createClient()
  const service = createServiceClient()

  const { data: card, error: fetchError } = await supabase
    .from('cards')
    .select('status, organization_id, titulo, cliente_id, tipo_id, cliente:clientes!cliente_id(nome, contato), tipo:tipos_demanda!tipo_id(nome)')
    .eq('id', cardId)
    .single()

  if (fetchError || !card) return { error: 'Card não encontrado.' }

  type CardEnvio = typeof card & {
    titulo: string
    cliente_id: string
    tipo_id: string | null
    cliente: { nome: string; contato: Record<string, string> | null }
    tipo: { nome: string } | null
  }
  const cardT = card as unknown as CardEnvio

  if (card.status !== 'em_andamento' && card.status !== 'necessita_ajustes') {
    return { error: 'Apenas cards em andamento ou com ajustes pendentes podem ser enviados para aprovação.' }
  }

  // Exige pelo menos um arquivo de entrega ou revisão
  const { data: arquivoEntrega } = await supabase
    .from('arquivos')
    .select('id')
    .eq('card_id', cardId)
    .in('tipo', ['entrega', 'revisao'])
    .limit(1)
    .maybeSingle()

  if (!arquivoEntrega) {
    return { error: 'Adicione um arquivo de entrega antes de enviar para aprovação.' }
  }

  const statusAnterior = card.status

  const { error } = await service
    .from('cards')
    .update({ status: 'para_aprovacao' })
    .eq('id', cardId)

  if (error) {
    console.error('[actionEnviarParaAprovacao]', error.message)
    return { error: 'Erro ao atualizar status.' }
  }

  await service.from('card_status_history').insert({
    organization_id: card.organization_id,
    card_id: cardId,
    status_anterior: statusAnterior,
    status_novo: 'para_aprovacao',
    alterado_por: profile.id,
  })

  await service.from('audit_log').insert({
    organization_id: card.organization_id,
    usuario_id: profile.id,
    acao: 'card.enviado_para_aprovacao',
    entidade: 'card',
    entidade_id: cardId,
    metadata: { de: statusAnterior },
  })

  // Email: notifica cada responsável do cliente com deep-link (best-effort)
  const clienteNomeEnvio = cardT.cliente?.nome ?? ''
  const responsaveis = await buscarInfoResponsaveis(cardT.cliente_id, card.organization_id)
  await Promise.all(
    responsaveis.map(({ email, nome }) => {
      const { subject, html } = emailParaAprovacao({
        destinatarioNome: nome,
        cardTitulo: cardT.titulo,
        clienteNome: clienteNomeEnvio,
        cardId,   // deep-link para /aprovacao/[cardId]
      })
      return enviarEmail(email, subject, html)
    }),
  )

  // WhatsApp outbound: notifica cliente se tiver número cadastrado (best-effort)
  const contatoCliente = cardT.cliente?.contato ?? {}
  const telefoneWa = (contatoCliente as Record<string, string>).whatsapp
    ?? (contatoCliente as Record<string, string>).telefone
    ?? null
  notificarClienteParaAprovacao({
    clienteTelefone: telefoneWa,
    cardTitulo: cardT.titulo,
    tipoNome: cardT.tipo?.nome ?? '',
    cardId,
  }).catch(() => {})

  return {}
}

// ---------------------------------------------------------------------------
// actionAprovarCard — cliente ou equipe aprova o card (status → concluido)
// ---------------------------------------------------------------------------

export async function actionAprovarCard(
  cardId: string,
): Promise<{ error?: string }> {
  const profile = await getCurrentProfile()
  const supabase = await createClient()
  const service = createServiceClient()

  const { data: card, error: fetchError } = await supabase
    .from('cards')
    .select('status, organization_id, rodadas_revisao, titulo, cliente_id, cliente:clientes!cliente_id(nome)')
    .eq('id', cardId)
    .single()

  if (fetchError || !card) return { error: 'Card não encontrado.' }
  if (card.status !== 'para_aprovacao') return { error: 'Este card não está aguardando aprovação.' }

  type CardAprov = typeof card & { titulo: string; cliente_id: string; cliente: { nome: string } }
  const cardT = card as unknown as CardAprov

  const interna = profile.papel !== 'cliente'
  const rodada = (card.rodadas_revisao ?? 0) + 1

  // INSERT aprovação — RLS permite: equipe via aprovacoes_insert_equipe,
  // cliente via aprovacoes_insert_cliente (exige status = para_aprovacao)
  const { error: aprovError } = await supabase
    .from('aprovacoes')
    .insert({
      organization_id: card.organization_id,
      card_id: cardId,
      aprovado_por: profile.id,
      decisao: 'aprovado',
      rodada,
      interna,
    })

  if (aprovError) {
    console.error('[actionAprovarCard] aprovacoes:', aprovError.message)
    return { error: 'Erro ao registrar aprovação.' }
  }

  // UPDATE status — service role pois cliente não tem UPDATE policy em cards
  const { error: updateError } = await service
    .from('cards')
    .update({ status: 'concluido' })
    .eq('id', cardId)

  if (updateError) {
    console.error('[actionAprovarCard] cards update:', updateError.message)
    return { error: 'Erro ao concluir card.' }
  }

  await service.from('card_status_history').insert({
    organization_id: card.organization_id,
    card_id: cardId,
    status_anterior: 'para_aprovacao',
    status_novo: 'concluido',
    alterado_por: profile.id,
  })

  await service.from('audit_log').insert({
    organization_id: card.organization_id,
    usuario_id: profile.id,
    acao: 'card.aprovado',
    entidade: 'card',
    entidade_id: cardId,
    metadata: { interna, rodada },
  })

  // Email: notifica equipe (sócia + atendimento) que o card foi aprovado (best-effort)
  const emailsAprov = await buscarEmailsEquipe(card.organization_id, ['socia', 'atendimento'])
  if (emailsAprov.length) {
    const { subject, html } = emailCardAprovado({
      cardTitulo: cardT.titulo,
      clienteNome: cardT.cliente?.nome ?? '',
    })
    await enviarEmail(emailsAprov, subject, html)
  }

  // Gamificação — avalia badges ao concluir (best-effort)
  avaliarBadges(cardId).catch(() => {})

  return {}
}

// ---------------------------------------------------------------------------
// actionReprovarCard — cliente ou equipe reprova; incrementa rodadas_revisao
// ---------------------------------------------------------------------------

export async function actionReprovarCard(
  cardId: string,
  comentario: string,
): Promise<{ error?: string }> {
  const profile = await getCurrentProfile()
  const textoTrimado = comentario.trim()
  if (!textoTrimado) return { error: 'Descreva os ajustes necessários.' }

  const supabase = await createClient()
  const service = createServiceClient()

  const { data: card, error: fetchError } = await supabase
    .from('cards')
    .select('status, organization_id, rodadas_revisao, titulo, cliente_id, responsavel_id, cliente:clientes!cliente_id(nome)')
    .eq('id', cardId)
    .single()

  if (fetchError || !card) return { error: 'Card não encontrado.' }
  if (card.status !== 'para_aprovacao') return { error: 'Este card não está aguardando aprovação.' }

  type CardRepr = typeof card & {
    titulo: string
    cliente_id: string
    responsavel_id: string | null
    cliente: { nome: string }
  }
  const cardT = card as unknown as CardRepr

  const interna = profile.papel !== 'cliente'
  const novasRodadas = (card.rodadas_revisao ?? 0) + 1

  // INSERT reprovação
  const { error: aprovError } = await supabase
    .from('aprovacoes')
    .insert({
      organization_id: card.organization_id,
      card_id: cardId,
      aprovado_por: profile.id,
      decisao: 'reprovado',
      comentario: textoTrimado,
      rodada: novasRodadas,
      interna,
    })

  if (aprovError) {
    console.error('[actionReprovarCard] aprovacoes:', aprovError.message)
    return { error: 'Erro ao registrar reprovação.' }
  }

  // UPDATE status + incrementa rodadas_revisao (service role)
  const { error: updateError } = await service
    .from('cards')
    .update({ status: 'necessita_ajustes', rodadas_revisao: novasRodadas })
    .eq('id', cardId)

  if (updateError) {
    console.error('[actionReprovarCard] cards update:', updateError.message)
    return { error: 'Erro ao atualizar card.' }
  }

  // Registra o feedback como comentário visível ao executor e ao cliente
  await service.from('comentarios').insert({
    organization_id: card.organization_id,
    card_id: cardId,
    autor_id: profile.id,
    texto: `[Ajustes solicitados — Rodada ${novasRodadas}]: ${textoTrimado}`,
    visivel_para_cliente: true,
  })

  await service.from('card_status_history').insert({
    organization_id: card.organization_id,
    card_id: cardId,
    status_anterior: 'para_aprovacao',
    status_novo: 'necessita_ajustes',
    alterado_por: profile.id,
  })

  await service.from('audit_log').insert({
    organization_id: card.organization_id,
    usuario_id: profile.id,
    acao: 'card.reprovado',
    entidade: 'card',
    entidade_id: cardId,
    metadata: { interna, rodada: novasRodadas },
  })

  // Email: notifica executor (responsavel) + atendimento (best-effort)
  const clienteNomeRepr = cardT.cliente?.nome ?? ''
  const cardTituloRepr = cardT.titulo
  if (cardT.responsavel_id) {
    const infoExecutor = await buscarInfoPerfilPorId(cardT.responsavel_id)
    if (infoExecutor) {
      const { subject, html } = emailCardReprovado({
        destinatarioNome: infoExecutor.nome,
        cardTitulo: cardTituloRepr,
        clienteNome: clienteNomeRepr,
        feedback: textoTrimado,
      })
      await enviarEmail(infoExecutor.email, subject, html)
    }
  }
  const emailsAtend = await buscarEmailsEquipe(card.organization_id, ['atendimento'])
  if (emailsAtend.length) {
    const { subject, html } = emailCardReprovado({
      destinatarioNome: 'Equipe',
      cardTitulo: cardTituloRepr,
      clienteNome: clienteNomeRepr,
      feedback: textoTrimado,
    })
    await enviarEmail(emailsAtend, subject, html)
  }

  return {}
}

// ---------------------------------------------------------------------------
// actionAgendarEntrega — define (ou remove) a data de entrega programada
// ---------------------------------------------------------------------------

export async function actionAgendarEntrega(
  cardId: string,
  dataIso: string | null,
): Promise<{ error?: string }> {
  const profile = await requirePapel('socia', 'gestao', 'atendimento')
  const supabase = await createClient()

  const { data: card, error: fetchError } = await supabase
    .from('cards')
    .select('organization_id, status')
    .eq('id', cardId)
    .single()

  if (fetchError || !card) return { error: 'Card não encontrado.' }

  const { error } = await supabase
    .from('cards')
    .update({ data_entrega_programada: dataIso || null })
    .eq('id', cardId)

  if (error) {
    console.error('[actionAgendarEntrega]', error.message)
    return { error: 'Erro ao agendar entrega.' }
  }

  await supabase.from('audit_log').insert({
    organization_id: card.organization_id,
    usuario_id: profile.id,
    acao: 'card.entrega_agendada',
    entidade: 'card',
    entidade_id: cardId,
    metadata: { data_entrega_programada: dataIso },
  })

  return {}
}

// ---------------------------------------------------------------------------
// actionCancelarCard — equipe cancela com motivo obrigatório
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// actionBulkUpdate — atualiza múltiplos cards de uma vez (socia e gestao apenas)
// Statuses cancelado, concluido e para_aprovacao são bloqueados aqui pois
// exigem fluxos específicos (motivo, notificação, gamificação).
// ---------------------------------------------------------------------------

export async function actionBulkUpdate(
  ids: string[],
  update: {
    status?: Exclude<StatusCard, 'para_aprovacao' | 'concluido' | 'cancelado'>
    responsavel_id?: string | null
    prioridade?: PrioridadeCard
  },
): Promise<{ error?: string; atualizados: number }> {
  if (!ids.length) return { atualizados: 0 }

  const profile = await requirePapel('socia', 'gestao')
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {}
  if (update.status !== undefined) updateData.status = update.status
  if ('responsavel_id' in update) updateData.responsavel_id = update.responsavel_id ?? null
  if (update.prioridade !== undefined) updateData.prioridade = update.prioridade

  if (!Object.keys(updateData).length) return { atualizados: 0 }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('cards') as any)
    .update(updateData)
    .in('id', ids)

  if (error) {
    console.error('[actionBulkUpdate]', error.message)
    return { error: 'Erro ao atualizar cards.', atualizados: 0 }
  }

  // Registra histórico de status para cada card atualizado
  if (update.status) {
    const service = createServiceClient()
    const { data: cardsAntes } = await supabase
      .from('cards')
      .select('id, status, organization_id')
      .in('id', ids)

    if (cardsAntes?.length && update.status) {
      const novoStatus = update.status
      await service.from('card_status_history').insert(
        cardsAntes.map((c) => ({
          organization_id: c.organization_id,
          card_id: c.id,
          status_anterior: c.status,
          status_novo: novoStatus,
          alterado_por: profile.id,
        })),
      )
    }
  }

  return { atualizados: ids.length }
}

// ---------------------------------------------------------------------------
// actionDuplicarCard — cria cópia de um card existente
// ---------------------------------------------------------------------------

export async function actionDuplicarCard(cardId: string): Promise<{
  card?: BoardCard
  error?: string
}> {
  const profile = await requireEquipe()
  const supabase = await createClient()

  const { data: original, error: fetchError } = await supabase
    .from('cards')
    .select(`
      organization_id, cliente_id, tipo_id, prioridade,
      prazo_cliente, campos_publicos, confidencial,
      titulo,
      tipo:tipos_demanda!tipo_id(id, nome, categoria, sla_ativo, sla_prazo_inicio_horas, sla_prazo_resposta_horas),
      cliente:clientes!cliente_id(id, nome)
    `)
    .eq('id', cardId)
    .single()

  if (fetchError || !original) return { error: 'Card não encontrado.' }

  const { data: novo, error: insertError } = await supabase
    .from('cards')
    .insert({
      organization_id: original.organization_id,
      cliente_id:      original.cliente_id,
      tipo_id:         original.tipo_id,
      titulo:          `${original.titulo} (cópia)`,
      status:          'a_fazer',
      prioridade:      original.prioridade,
      prazo_cliente:   original.prazo_cliente,
      campos_publicos: original.campos_publicos ?? {},
      confidencial:    original.confidencial,
      responsavel_id:  null,
      criado_por:      profile.id,
    })
    .select(`
      id, titulo, status, prioridade, prazo_cliente, data_entrega_programada,
      confidencial, created_at, sla_iniciado_em,
      cliente:clientes!cliente_id(id, nome),
      tipo:tipos_demanda!tipo_id(id, nome, categoria, sla_ativo, sla_prazo_inicio_horas, sla_prazo_resposta_horas),
      responsavel:profiles!responsavel_id(id, nome)
    `)
    .single()

  if (insertError || !novo) {
    console.error('[actionDuplicarCard]', insertError?.message)
    return { error: 'Erro ao duplicar card.' }
  }

  return { card: novo as unknown as BoardCard }
}

export async function actionCancelarCard(
  cardId: string,
  motivo: string,
): Promise<{ error?: string }> {
  const profile = await requireEquipe()
  const motivoTrimado = motivo.trim()
  if (!motivoTrimado) return { error: 'Informe o motivo do cancelamento.' }

  const supabase = await createClient()
  const service = createServiceClient()

  const { data: card, error: fetchError } = await supabase
    .from('cards')
    .select('status, organization_id, titulo, cliente_id, cliente:clientes!cliente_id(nome)')
    .eq('id', cardId)
    .single()

  if (fetchError || !card) return { error: 'Card não encontrado.' }
  if (card.status === 'cancelado') return { error: 'Card já está cancelado.' }
  if (card.status === 'concluido') return { error: 'Card concluído não pode ser cancelado.' }

  type CardCancel = typeof card & { titulo: string; cliente_id: string; cliente: { nome: string } }
  const cardT = card as unknown as CardCancel

  const statusAnterior = card.status

  const { error } = await service
    .from('cards')
    .update({ status: 'cancelado', motivo_cancelamento: motivoTrimado })
    .eq('id', cardId)

  if (error) {
    console.error('[actionCancelarCard]', error.message)
    return { error: 'Erro ao cancelar card.' }
  }

  await service.from('card_status_history').insert({
    organization_id: card.organization_id,
    card_id: cardId,
    status_anterior: statusAnterior,
    status_novo: 'cancelado',
    alterado_por: profile.id,
  })

  await service.from('audit_log').insert({
    organization_id: card.organization_id,
    usuario_id: profile.id,
    acao: 'card.cancelado',
    entidade: 'card',
    entidade_id: cardId,
    metadata: { motivo: motivoTrimado, de: statusAnterior },
  })

  // Email: notifica equipe (sócia + atendimento) que o card foi cancelado (best-effort)
  const emailsCancel = await buscarEmailsEquipe(card.organization_id, ['socia', 'atendimento'])
  if (emailsCancel.length) {
    const { subject, html } = emailCardCancelado({
      cardTitulo: cardT.titulo,
      clienteNome: cardT.cliente?.nome ?? '',
      motivo: motivoTrimado,
    })
    await enviarEmail(emailsCancel, subject, html)
  }

  return {}
}
