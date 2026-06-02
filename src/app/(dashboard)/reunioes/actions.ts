'use server'

import { revalidatePath } from 'next/cache'
import Anthropic from '@anthropic-ai/sdk'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { requireEquipe, requirePapel } from '@/lib/dal'
import {
  getValidAccessToken,
  criarEventoCalendar,
  excluirEventoCalendar,
} from '@/lib/google/calendar'
import { extractMeetSpaceId, importGeminiMeetNotes, type TranscricaoStatus } from '@/lib/transcricao'
import { gerarModo3 } from '@/lib/onboarding/geradores'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type TipoReuniao = 'prospeccao' | 'cliente' | 'interna' | 'onboarding'

export interface ParticipanteExterno {
  nome: string
  empresa?: string
  email?: string
}

export interface Reuniao {
  id: string
  tipo: TipoReuniao
  data_reuniao: string
  duracao_minutos: number | null
  prospect_id: string | null
  cliente_id: string | null
  confidencial: boolean
  participantes_internos: string[]
  participantes_externos: ParticipanteExterno[]
  notas_brutas: string | null
  resumo_gerado: string | null
  created_by: string
  created_at: string
  updated_at: string
  // joins
  cliente_nome?: string
  prospect_nome?: string
  criador_nome?: string
  // Sprint 5.3 — transcrição (buscados em query secundária, opcionais)
  audio_storage_path?: string | null
  meet_space_id?: string | null
  transcricao_bruta?: string | null
  transcricao_status?: TranscricaoStatus
}

export interface ActionItem {
  id: string
  reuniao_id: string
  descricao: string
  responsavel_sugerido_id: string | null
  responsavel_nome?: string
  prazo_sugerido: string | null
  card_id: string | null
  confirmado: boolean
  created_at: string
}

// ---------------------------------------------------------------------------
// QUERIES
// ---------------------------------------------------------------------------

export async function buscarReunioes(): Promise<Reuniao[]> {
  await requireEquipe()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('reunioes')
    .select(`
      id, tipo, data_reuniao, duracao_minutos, prospect_id, cliente_id,
      participantes_internos, participantes_externos, notas_brutas,
      resumo_gerado, created_by, created_at, updated_at,
      clientes(nome),
      prospects(nome),
      profiles!created_by(nome)
    `)
    .order('data_reuniao', { ascending: false })

  if (error) throw new Error(error.message)

  const rows = data ?? []

  // Busca `confidencial` separadamente — campo adicionado em migração posterior.
  // Se a coluna ainda não existir, `data` volta null e usamos `false` como padrão.
  const ids = rows.map((r) => r.id)
  const { data: confData } = ids.length > 0
    ? await supabase
        .from('reunioes')
        .select('id, confidencial')
        .in('id', ids)
    : { data: [] as { id: string; confidencial?: boolean }[] }

  const confMap = new Map(
    (confData ?? []).map((r) => [
      r.id,
      (r as { id: string; confidencial?: boolean }).confidencial ?? false,
    ]),
  )

  return rows.map((r) => ({
    ...r,
    confidencial: confMap.get(r.id) ?? false,
    participantes_externos: (r.participantes_externos ?? []) as unknown as ParticipanteExterno[],
    cliente_nome: (r.clientes as unknown as { nome: string } | null)?.nome,
    prospect_nome: (r.prospects as unknown as { nome: string } | null)?.nome,
    criador_nome: (r.profiles as unknown as { nome: string } | null)?.nome,
  })) as Reuniao[]
}

export async function buscarReuniaoDetalhe(reuniaoId: string) {
  await requireEquipe()
  const supabase = await createClient()

  const [{ data: reuniao }, { data: actionItems }] = await Promise.all([
    supabase
      .from('reunioes')
      .select(`
        id, tipo, data_reuniao, duracao_minutos, prospect_id, cliente_id,
        participantes_internos, participantes_externos, notas_brutas,
        resumo_gerado, created_by, created_at, updated_at,
        clientes(nome),
        prospects(nome),
        profiles!created_by(nome)
      `)
      .eq('id', reuniaoId)
      .single(),

    supabase
      .from('action_items_reuniao')
      .select(`
        id, reuniao_id, descricao, responsavel_sugerido_id,
        prazo_sugerido, card_id, confirmado, created_at,
        profiles!responsavel_sugerido_id(nome)
      `)
      .eq('reuniao_id', reuniaoId)
      .order('created_at'),
  ])

  if (!reuniao) return null

  // Busca campos adicionados em migrações posteriores (resiliente — não quebra se coluna não existir)
  const { data: extraRow } = await supabase
    .from('reunioes')
    .select('confidencial, audio_storage_path, meet_space_id, transcricao_bruta, transcricao_status')
    .eq('id', reuniaoId)
    .single()

  type ExtraFields = {
    confidencial?: boolean
    audio_storage_path?: string | null
    meet_space_id?: string | null
    transcricao_bruta?: string | null
    transcricao_status?: string | null
  }
  const extra = (extraRow as ExtraFields | null) ?? {}

  return {
    reuniao: {
      ...reuniao,
      confidencial:          extra.confidencial          ?? false,
      audio_storage_path:    extra.audio_storage_path    ?? null,
      meet_space_id:         extra.meet_space_id         ?? null,
      transcricao_bruta:     extra.transcricao_bruta     ?? null,
      transcricao_status:    (extra.transcricao_status   ?? 'nenhuma') as TranscricaoStatus,
      participantes_externos: (reuniao.participantes_externos ?? []) as unknown as ParticipanteExterno[],
      cliente_nome: (reuniao.clientes as unknown as { nome: string } | null)?.nome,
      prospect_nome: (reuniao.prospects as unknown as { nome: string } | null)?.nome,
      criador_nome: (reuniao.profiles as unknown as { nome: string } | null)?.nome,
    } as Reuniao,
    actionItems: (actionItems ?? []).map((a) => ({
      ...a,
      responsavel_nome: (a.profiles as unknown as { nome: string } | null)?.nome,
    })) as ActionItem[],
  }
}

/** Lista de perfis ativos para selecionar participantes */
export async function buscarPerfilsEquipe() {
  await requireEquipe()
  const supabase = await createClient()

  const { data } = await supabase
    .from('profiles')
    .select('id, nome, papel')
    .not('papel', 'eq', 'cliente')
    .order('nome')

  return (data ?? []) as { id: string; nome: string; papel: string }[]
}

/** Clientes e prospects ativos para vincular à reunião */
export async function buscarClientesEProspects() {
  await requireEquipe()
  const supabase = await createClient()

  const [{ data: clientes }, { data: prospects }] = await Promise.all([
    supabase.from('clientes').select('id, nome').eq('status', 'ativo').order('nome'),
    supabase.from('prospects').select('id, nome').not('stage', 'in', '("cliente_ativo","perdido")').order('nome'),
  ])

  return {
    clientes: (clientes ?? []) as { id: string; nome: string }[],
    prospects: (prospects ?? []) as { id: string; nome: string }[],
  }
}

// ---------------------------------------------------------------------------
// MUTAÇÕES
// ---------------------------------------------------------------------------

export async function actionCriarReuniao(formData: FormData): Promise<string> {
  const profile = await requireEquipe()
  const supabase = await createClient()

  const tipo = formData.get('tipo') as TipoReuniao
  const data_reuniao = formData.get('data_reuniao') as string
  const duracao_str = formData.get('duracao_minutos') as string
  const duracao_minutos = duracao_str ? parseInt(duracao_str) : null
  const prospect_id = (formData.get('prospect_id') as string) || null
  const cliente_id = (formData.get('cliente_id') as string) || null
  const notas_brutas = (formData.get('notas_brutas') as string) || null
  const confidencial = formData.get('confidencial') === 'true'

  // Sprint 5.3 — Meet space ID extraído do link (se fornecido)
  const meetLink = (formData.get('meet_link') as string) || null
  const meet_space_id = meetLink ? extractMeetSpaceId(meetLink) : null

  // Participantes internos: array de IDs separados por vírgula
  const participantesStr = formData.get('participantes_internos') as string
  const participantes_internos = participantesStr
    ? participantesStr.split(',').filter(Boolean)
    : [profile.id]

  // Participantes externos: JSON
  const externasStr = formData.get('participantes_externos') as string
  let participantes_externos: ParticipanteExterno[] = []
  try {
    participantes_externos = JSON.parse(externasStr || '[]')
  } catch { /* ignore */ }

  const { data, error } = await supabase
    .from('reunioes')
    .insert({
      organization_id: profile.organization_id,
      tipo,
      data_reuniao,
      duracao_minutos,
      prospect_id,
      cliente_id,
      confidencial,
      participantes_internos,
      participantes_externos: participantes_externos as unknown as import('@/types/database').Json,
      notas_brutas,
      created_by: profile.id,
      ...(meet_space_id ? { meet_space_id } : {}),
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/reunioes')

  const reuniaoId = data.id as string

  // ---------------------------------------------------------------------------
  // Best-effort: sincroniza com Google Calendar do criador (se conectado)
  // Falhas aqui NÃO bloqueiam a criação da reunião.
  // ---------------------------------------------------------------------------
  try {
    const accessToken = await getValidAccessToken(profile.id)
    if (accessToken) {
      const TIPO_LABELS: Record<TipoReuniao, string> = {
        prospeccao: 'Prospecção',
        cliente:    'Cliente',
        interna:    'Interna',
        onboarding: 'Onboarding',
      }

      // Busca nomes de cliente/prospect para o título do evento
      let contextLabel = 'Interna'
      if (cliente_id) {
        const supabaseC = await createClient()
        const { data: c } = await supabaseC
          .from('clientes')
          .select('nome')
          .eq('id', cliente_id)
          .single()
        if (c) contextLabel = (c as { nome: string }).nome
      } else if (prospect_id) {
        const supabaseP = await createClient()
        const { data: p } = await supabaseP
          .from('prospects')
          .select('nome')
          .eq('id', prospect_id)
          .single()
        if (p) contextLabel = (p as { nome: string }).nome
      }

      const duracaoMs = (duracao_minutos ?? 60) * 60 * 1000
      const startDt   = new Date(data_reuniao).toISOString()
      const endDt     = new Date(new Date(data_reuniao).getTime() + duracaoMs).toISOString()

      // Participantes externos com email viram convidados do evento
      const attendees = participantes_externos
        .filter((e) => e.email)
        .map((e) => ({ email: e.email!, displayName: e.nome }))

      const googleEventId = await criarEventoCalendar(accessToken, {
        summary:       `[Simplizzia] Reunião ${TIPO_LABELS[tipo]} — ${contextLabel}`,
        description:   notas_brutas ?? '',
        startDateTime: startDt,
        endDateTime:   endDt,
        attendees,
      })

      // Salva o google_event_id na reunião (best-effort — ignora erro se coluna não existir)
      const service = createServiceClient()
      await service
        .from('reunioes')
        .update({ google_event_id: googleEventId })
        .eq('id', reuniaoId)
    }
  } catch (err) {
    console.error('[actionCriarReuniao] Google Calendar sync:', err)
    // Não propaga — reunião já foi criada com sucesso
  }

  return reuniaoId
}

export async function actionSalvarNotas(reuniaoId: string, notas: string) {
  await requireEquipe()
  const supabase = await createClient()

  const { error } = await supabase
    .from('reunioes')
    .update({ notas_brutas: notas, updated_at: new Date().toISOString() })
    .eq('id', reuniaoId)

  if (error) throw new Error(error.message)
  revalidatePath(`/reunioes/${reuniaoId}`)
}

/** Gera resumo + action items via Claude */
export async function actionGerarResumo(reuniaoId: string): Promise<{
  resumo: string
  actionItems: { descricao: string; prazo_sugerido: string | null }[]
}> {
  const profile = await requireEquipe()
  const service = createServiceClient()

  const { data: reuniao } = await service
    .from('reunioes')
    .select('notas_brutas, tipo, data_reuniao, participantes_externos')
    .eq('id', reuniaoId)
    .eq('organization_id', profile.organization_id)
    .single()

  if (!reuniao?.notas_brutas) {
    throw new Error('Sem notas brutas para analisar.')
  }

  const tipo_label: Record<TipoReuniao, string> = {
    prospeccao: 'Prospecção',
    cliente: 'Cliente',
    interna: 'Interna',
    onboarding: 'Onboarding',
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  const systemPrompt = `Você é uma assistente de reuniões da Simplizzia.
Analise as notas brutas e retorne um JSON com EXATAMENTE este formato (sem markdown, só JSON puro):
{
  "resumo": ["• ponto 1", "• ponto 2", "• ponto 3"],
  "action_items": [
    {"descricao": "Ação clara e específica", "prazo_sugerido": "2026-06-15 ou null"}
  ]
}

Regras:
- resumo: 3 a 5 bullets, cada um começando com "• "
- action_items: apenas ações concretas com responsável implícito na Simplizzia (ex: "Enviar proposta", "Agendar nova reunião")
- prazo_sugerido: ISO date se mencionado nas notas, senão null
- Se não houver action items claros, retorne lista vazia`

  const userMsg = `Tipo de reunião: ${tipo_label[reuniao.tipo as TipoReuniao]}
Data: ${new Date(reuniao.data_reuniao as string).toLocaleDateString('pt-BR')}

Notas brutas:
${reuniao.notas_brutas}`

  const response = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMsg }],
  })

  const texto = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')

  // Parse JSON da resposta
  let parsed: { resumo: string[]; action_items: { descricao: string; prazo_sugerido: string | null }[] }
  try {
    const jsonMatch = texto.match(/\{[\s\S]*\}/)
    parsed = JSON.parse(jsonMatch?.[0] ?? texto)
  } catch {
    throw new Error('Falha ao interpretar resposta da IA.')
  }

  const resumoTexto = parsed.resumo.join('\n')

  // Salva resumo na reunião
  await service
    .from('reunioes')
    .update({
      resumo_gerado: resumoTexto,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reuniaoId)

  // Insere action items (se houver)
  if (parsed.action_items.length > 0) {
    await service.from('action_items_reuniao').insert(
      parsed.action_items.map((item) => ({
        organization_id: profile.organization_id,
        reuniao_id: reuniaoId,
        descricao: item.descricao,
        prazo_sugerido: item.prazo_sugerido,
      })),
    )
  }

  revalidatePath(`/reunioes/${reuniaoId}`)
  return { resumo: resumoTexto, actionItems: parsed.action_items }
}

/** Converte um action item em card no kanban */
export async function actionConverterItemEmCard(
  actionItemId: string,
  clienteId: string,
  tipoDemandaId: string,
  prioridade: string,
): Promise<string> {
  const profile = await requireEquipe()
  const supabase = await createClient()

  // Busca o action item
  const { data: item } = await supabase
    .from('action_items_reuniao')
    .select('descricao, prazo_sugerido')
    .eq('id', actionItemId)
    .single()

  if (!item) throw new Error('Action item não encontrado')

  // Cria o card
  const { data: card, error: errCard } = await supabase
    .from('cards')
    .insert({
      organization_id: profile.organization_id,
      cliente_id: clienteId,
      tipo_id: tipoDemandaId,
      criado_por: profile.id,
      titulo: item.descricao,
      prioridade: (prioridade ?? 'normal') as 'urgente' | 'alta' | 'normal' | 'baixa',
      prazo_cliente: item.prazo_sugerido ?? null,
      status: 'a_fazer',
    })
    .select('id')
    .single()

  if (errCard) throw new Error(errCard.message)

  // Vincula card ao action item
  await supabase
    .from('action_items_reuniao')
    .update({ card_id: card.id, confirmado: true })
    .eq('id', actionItemId)

  revalidatePath('/board')
  return card.id as string
}

export async function actionConfirmarActionItem(actionItemId: string, confirmado: boolean) {
  await requireEquipe()
  const supabase = await createClient()

  await supabase
    .from('action_items_reuniao')
    .update({ confirmado })
    .eq('id', actionItemId)

  revalidatePath('/reunioes')
}

/** Exclui uma reunião e remove o evento do Google Calendar (se existir) */
export async function actionExcluirReuniao(reuniaoId: string): Promise<{ error?: string }> {
  const profile = await requirePapel('socia', 'gestao', 'atendimento')
  const supabase = await createClient()
  const service  = createServiceClient()

  // Busca o google_event_id antes de deletar (best-effort)
  let googleEventId: string | null = null
  try {
    const { data: row } = await service
      .from('reunioes')
      .select('google_event_id, created_by')
      .eq('id', reuniaoId)
      .single()

    googleEventId = (row as { google_event_id?: string | null; created_by: string } | null)
      ?.google_event_id ?? null

    // Verificação de acesso: atendimento só pode excluir reuniões que criou
    const criadoPor = (row as { created_by: string } | null)?.created_by
    if (profile.papel === 'atendimento' && criadoPor !== profile.id) {
      return { error: 'Você só pode excluir reuniões que criou.' }
    }
  } catch { /* ignora */ }

  const { error } = await supabase
    .from('reunioes')
    .delete()
    .eq('id', reuniaoId)

  if (error) {
    console.error('[actionExcluirReuniao]', error.message)
    return { error: 'Erro ao excluir reunião.' }
  }

  // Remove do Google Calendar do criador (best-effort)
  if (googleEventId) {
    try {
      const accessToken = await getValidAccessToken(profile.id)
      if (accessToken) {
        await excluirEventoCalendar(accessToken, googleEventId)
      }
    } catch (err) {
      console.error('[actionExcluirReuniao] Google Calendar cleanup:', err)
    }
  }

  revalidatePath('/reunioes')
  return {}
}

/** Alterna flag de confidencialidade — só sócias */
export async function actionToggleConfidencial(
  reuniaoId: string,
  confidencial: boolean,
): Promise<{ error?: string }> {
  await requirePapel('socia')
  const supabase = await createClient()

  const { error } = await supabase
    .from('reunioes')
    .update({ confidencial, updated_at: new Date().toISOString() })
    .eq('id', reuniaoId)

  if (error) {
    console.error('[actionToggleConfidencial]', error.message)
    return { error: 'Erro ao atualizar confidencialidade.' }
  }

  revalidatePath(`/reunioes/${reuniaoId}`)
  revalidatePath('/reunioes')
  return {}
}

// ---------------------------------------------------------------------------
// Sprint 5.3 — Transcrição de áudio + Google Meet
// ---------------------------------------------------------------------------

const MIME_AUDIO = new Set([
  'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac',
  'video/mp4', 'video/webm', 'video/quicktime',
])
const AUDIO_MAX_BYTES = 200 * 1024 * 1024 // 200 MB

/** Faz upload do arquivo de áudio para o Storage e salva o path na reunião. */
export async function actionUploadAudio(
  reuniaoId: string,
  formData: FormData,
): Promise<{ path?: string; error?: string }> {
  const profile = await requireEquipe()
  const service = createServiceClient()

  const file = formData.get('audio') as File | null
  if (!file || file.size === 0) return { error: 'Nenhum arquivo selecionado.' }
  if (!MIME_AUDIO.has(file.type)) return { error: 'Formato não suportado. Use MP3, MP4, WAV, OGG ou WebM.' }
  if (file.size > AUDIO_MAX_BYTES) return { error: 'Arquivo muito grande. Máximo: 200 MB.' }

  // Verifica que a reunião pertence à org do usuário
  const { data: reuniao } = await service
    .from('reunioes')
    .select('id, organization_id')
    .eq('id', reuniaoId)
    .single()

  if (!reuniao || reuniao.organization_id !== profile.organization_id) {
    return { error: 'Reunião não encontrada.' }
  }

  const nomeSeguro = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${profile.organization_id}/${reuniaoId}/${Date.now()}-${nomeSeguro}`

  const { error: uploadError } = await service.storage
    .from('reunioes-audio')
    .upload(storagePath, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    console.error('[actionUploadAudio] storage:', uploadError.message)
    return { error: 'Erro ao enviar arquivo.' }
  }

  await service
    .from('reunioes')
    .update({
      audio_storage_path: storagePath,
      transcricao_status: 'nenhuma',
      updated_at: new Date().toISOString(),
    })
    .eq('id', reuniaoId)

  revalidatePath(`/reunioes/${reuniaoId}`)
  return { path: storagePath }
}

/** Salva o Meet space ID manualmente (extraído do link). */
export async function actionSalvarMeetSpaceId(
  reuniaoId: string,
  meetLink: string,
): Promise<{ spaceId?: string; error?: string }> {
  await requireEquipe()
  const supabase = await createClient()

  const spaceId = extractMeetSpaceId(meetLink)
  if (!spaceId) return { error: 'Link do Google Meet inválido.' }

  const { error } = await supabase
    .from('reunioes')
    .update({ meet_space_id: spaceId, updated_at: new Date().toISOString() })
    .eq('id', reuniaoId)

  if (error) return { error: 'Erro ao salvar.' }
  revalidatePath(`/reunioes/${reuniaoId}`)
  return { spaceId }
}

/**
 * Importa notas/transcrição do Google Meet (Gemini notes).
 * Requer que o usuário tenha autorizado o scope meetings.space.readonly.
 */
export async function actionImportarMeetNotes(
  reuniaoId: string,
): Promise<{ ok?: boolean; error?: string }> {
  const profile = await requireEquipe()
  const supabase = await createClient()
  const service = createServiceClient()

  // Busca meet_space_id + dados necessários para Modo 3
  const { data: row } = await supabase
    .from('reunioes')
    .select('meet_space_id, organization_id, tipo, cliente_id')
    .eq('id', reuniaoId)
    .single()

  if (!row) return { error: 'Reunião não encontrada.' }
  if (row.organization_id !== profile.organization_id) return { error: 'Acesso negado.' }

  const spaceId = (row as { meet_space_id?: string | null }).meet_space_id
  if (!spaceId) return { error: 'Nenhum Meet space ID configurado nesta reunião.' }

  const accessToken = await getValidAccessToken(profile.id)
  if (!accessToken) {
    return { error: 'Conecte sua conta do Google Calendar primeiro.' }
  }

  await service
    .from('reunioes')
    .update({ transcricao_status: 'processando', updated_at: new Date().toISOString() })
    .eq('id', reuniaoId)

  try {
    const texto = await importGeminiMeetNotes(accessToken, spaceId)

    if (!texto) {
      await service
        .from('reunioes')
        .update({ transcricao_status: 'erro', updated_at: new Date().toISOString() })
        .eq('id', reuniaoId)
      return { error: 'Nenhuma transcrição disponível neste Meeting. Verifique se o Gemini gerou notas automáticas.' }
    }

    await service
      .from('reunioes')
      .update({
        transcricao_bruta: texto,
        notas_brutas: texto,
        transcricao_status: 'concluida',
        updated_at: new Date().toISOString(),
      })
      .eq('id', reuniaoId)

    // Gera Briefing Completo (Modo 3) se for reunião de kickoff de onboarding.
    // Aguarda a conclusão — em serverless o processo morre após o retorno.
    const reuniaoRow = row as { tipo?: string; cliente_id?: string | null; organization_id: string }
    if (reuniaoRow.tipo === 'onboarding' && reuniaoRow.cliente_id) {
      await gerarModo3({
        clienteId: reuniaoRow.cliente_id,
        organizationId: reuniaoRow.organization_id,
        transcricao: texto,
      }).catch((err) => console.error('[actionImportarMeetNotes] gerarModo3', err))
      revalidatePath(`/clientes/${reuniaoRow.cliente_id}`)
    }

    revalidatePath(`/reunioes/${reuniaoId}`)
    return { ok: true }
  } catch (err) {
    console.error('[actionImportarMeetNotes]', err)
    await service
      .from('reunioes')
      .update({ transcricao_status: 'erro', updated_at: new Date().toISOString() })
      .eq('id', reuniaoId)
    return { error: 'Erro ao importar notas do Meet.' }
  }
}

/** Tipos de demanda para o seletor ao converter action item em card */
export async function buscarTiposDemanda() {
  await requireEquipe()
  const supabase = await createClient()

  const { data } = await supabase
    .from('tipos_demanda')
    .select('id, nome, categoria')
    .eq('ativo', true)
    .order('nome')

  return (data ?? []) as { id: string; nome: string; categoria: string }[]
}
