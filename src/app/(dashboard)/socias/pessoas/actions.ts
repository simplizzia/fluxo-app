'use server'

/**
 * Server Actions — Pessoas & Cultura
 *
 * Cobre: perfis de parceiros, convites de onboarding,
 * avisos em popup e atividades/mimos com sugestão da Izzi.
 */

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { requirePapel } from '@/lib/dal'
import Anthropic from '@anthropic-ai/sdk'
import { enviarEmail, emailConviteParceiro, emailAviso, buscarEmailUsuario } from '@/lib/email'

// ---------------------------------------------------------------------------
// Tipos exportados
// ---------------------------------------------------------------------------

export type StatusToken = 'pendente' | 'completado' | 'expirado'
export type TipoAtividade =
  | 'atividade_equipe' | 'brinde' | 'mimo_individual'
  | 'reconhecimento' | 'evento' | 'celebracao' | 'outro'
export type StatusAtividade =
  | 'ideia' | 'planejada' | 'em_andamento' | 'executada' | 'cancelada'

export interface OnboardingToken {
  id: string
  token: string
  parceiro_email: string
  parceiro_nome: string
  status: StatusToken
  created_at: string
  expires_at: string
}

export interface ParceiroPerfilResumo {
  id: string
  nome: string
  email: string
  whatsapp: string | null
  cidade: string | null
  nascimento: string | null
  dados_pessoais: Record<string, unknown>
  dados_profissionais: Record<string, unknown>
  datas_importantes: Record<string, unknown>
  perfil_markdown: string | null
  onboarding_completado_em: string | null
  created_at: string
}

export interface AvisoEquipe {
  id: string
  criado_por: string
  titulo: string
  conteudo: string
  imagem_url: string | null
  link_url: string | null
  link_label: string | null
  destinatarios: 'todos' | 'ativos' | 'especificos'
  parceiro_ids: string[]
  agendado_para: string | null
  publicado_em: string | null
  created_at: string
  criado_por_nome?: string
  total_visualizacoes?: number
}

export interface AtividadeParceiro {
  id: string
  titulo: string
  descricao: string | null
  tipo: TipoAtividade
  status: StatusAtividade
  destinatario_tipo: 'todos' | 'especificos'
  parceiro_ids: string[]
  data_prevista: string | null
  custo_estimado: number | null
  observacoes: string | null
  gerado_por_ia: boolean
  criado_por: string | null
  created_at: string
  updated_at: string
}

export interface SugestaoIzzi {
  titulo: string
  descricao: string
  tipo: TipoAtividade
  justificativa: string
  custo_estimado: string
}

// ---------------------------------------------------------------------------
// Onboarding Tokens — convites de parceiros
// ---------------------------------------------------------------------------

export async function buscarTokens(): Promise<OnboardingToken[]> {
  await requirePapel('socia')
  const supabase = await createClient()

  const { data } = await supabase
    .from('onboarding_tokens')
    .select('id, token, parceiro_email, parceiro_nome, status, created_at, expires_at')
    .order('created_at', { ascending: false })

  return (data ?? []) as OnboardingToken[]
}

export async function actionConvidarParceiro(formData: FormData): Promise<void> {
  const profile = await requirePapel('socia')
  const service = createServiceClient()

  const nome = (formData.get('nome') as string).trim()
  const email = (formData.get('email') as string).trim().toLowerCase()

  if (!nome || !email) throw new Error('Nome e e-mail são obrigatórios.')

  // Inserir token (o token UUID é gerado pelo banco com DEFAULT gen_random_uuid())
  const { data, error } = await service
    .from('onboarding_tokens')
    .insert({
      organization_id: profile.organization_id,
      parceiro_email: email,
      parceiro_nome: nome,
    })
    .select('token, parceiro_nome')
    .single()

  if (error) throw new Error(error.message)

  const { token, parceiro_nome } = data as { token: string; parceiro_nome: string }
  const link = `${process.env.ONBOARDING_URL ?? 'https://onboarding.simplizzia.com.br'}/parceiro?token=${token}`

  // Enviar e-mail de convite (best-effort)
  const { subject, html } = emailConviteParceiro({ nome: parceiro_nome, link })
  await enviarEmail(email, subject, html)

  revalidatePath('/socias/pessoas')
}

// ---------------------------------------------------------------------------
// Perfis de Parceiros
// ---------------------------------------------------------------------------

export async function buscarPerfis(): Promise<ParceiroPerfilResumo[]> {
  await requirePapel('socia')
  const supabase = await createClient()

  const { data } = await supabase
    .from('parceiros_perfil')
    .select(`
      id, nome, email, whatsapp, cidade, nascimento,
      dados_pessoais, dados_profissionais, datas_importantes,
      perfil_markdown, onboarding_completado_em, created_at
    `)
    .order('nome')

  return (data ?? []) as ParceiroPerfilResumo[]
}

// ---------------------------------------------------------------------------
// Avisos em Popup
// ---------------------------------------------------------------------------

export async function buscarAvisos(): Promise<AvisoEquipe[]> {
  await requirePapel('socia')
  const supabase = await createClient()

  const { data } = await supabase
    .from('avisos_equipe')
    .select(`
      id, titulo, conteudo, imagem_url, link_url, link_label,
      destinatarios, parceiro_ids, agendado_para, publicado_em, created_at, criado_por,
      profiles!criado_por(nome)
    `)
    .order('created_at', { ascending: false })

  if (!data) return []

  // Contar visualizações por aviso
  const avisoIds = data.map((a) => a.id)
  const { data: vizCounts } = await supabase
    .from('avisos_visualizacoes')
    .select('aviso_id')
    .in('aviso_id', avisoIds)

  const countMap: Record<string, number> = {}
  for (const v of vizCounts ?? []) {
    countMap[v.aviso_id] = (countMap[v.aviso_id] ?? 0) + 1
  }

  return data.map((a) => ({
    ...a,
    parceiro_ids: (a.parceiro_ids ?? []) as string[],
    criado_por_nome: (a.profiles as unknown as { nome: string } | null)?.nome,
    total_visualizacoes: countMap[a.id] ?? 0,
  })) as AvisoEquipe[]
}

export async function actionPublicarAviso(formData: FormData): Promise<void> {
  const profile = await requirePapel('socia')
  const service = createServiceClient()

  const titulo = (formData.get('titulo') as string).trim()
  const conteudo = (formData.get('conteudo') as string).trim()
  const link_url = (formData.get('link_url') as string) || null
  const link_label = (formData.get('link_label') as string) || null
  const destinatarios = (formData.get('destinatarios') as string) as 'todos' | 'ativos' | 'especificos'
  const agendado_para = (formData.get('agendado_para') as string) || null
  const parceiro_ids_raw = (formData.get('parceiro_ids') as string) || '[]'
  const parceiro_ids = JSON.parse(parceiro_ids_raw) as string[]

  // Upload de imagem se houver
  let imagem_url: string | null = null
  const imagemFile = formData.get('imagem') as File | null
  if (imagemFile && imagemFile.size > 0) {
    const ext = imagemFile.name.split('.').pop() ?? 'jpg'
    const path = `avisos/${profile.organization_id}/${Date.now()}.${ext}`
    const bytes = await imagemFile.arrayBuffer()
    const { data: uploadData, error: uploadErr } = await service.storage
      .from('avisos')
      .upload(path, bytes, { contentType: imagemFile.type, upsert: false })
    if (!uploadErr && uploadData) {
      const { data: { publicUrl } } = service.storage.from('avisos').getPublicUrl(path)
      imagem_url = publicUrl
    }
  }

  const publicado_em = agendado_para ? null : new Date().toISOString()

  const { data: aviso, error } = await service
    .from('avisos_equipe')
    .insert({
      organization_id: profile.organization_id,
      criado_por: profile.id,
      titulo,
      conteudo,
      imagem_url,
      link_url,
      link_label,
      destinatarios,
      parceiro_ids: destinatarios === 'especificos' ? parceiro_ids : [],
      agendado_para,
      publicado_em,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  // Se publicar agora: inserir in_app_notificacoes + enviar e-mails
  if (publicado_em && aviso) {
    await _entregarAviso(
      service,
      profile.organization_id,
      (aviso as { id: string }).id,
      titulo,
      conteudo,
      link_url,
      destinatarios,
      parceiro_ids,
    )
  }

  revalidatePath('/socias/pessoas')
}

export async function actionExcluirAviso(avisoId: string): Promise<void> {
  await requirePapel('socia')
  const supabase = await createClient()
  await supabase.from('avisos_equipe').delete().eq('id', avisoId)
  revalidatePath('/socias/pessoas')
}

/** Chamado pelo popup modal quando o usuário fecha o aviso. */
export async function actionMarcarAvisoLido(avisoId: string): Promise<void> {
  const profile = await requirePapel('socia', 'gestao', 'atendimento', 'executor')
  const supabase = await createClient()
  // ON CONFLICT DO NOTHING via upsert
  await supabase
    .from('avisos_visualizacoes')
    .upsert({ aviso_id: avisoId, user_id: profile.id }, { onConflict: 'aviso_id,user_id', ignoreDuplicates: true })
}

/** Busca avisos não lidos para o usuário atual — usado pelo AvisoPopupModal. */
export async function buscarAvisosNaoLidos(): Promise<AvisoEquipe[]> {
  const profile = await requirePapel('socia', 'gestao', 'atendimento', 'executor')
  const supabase = await createClient()

  const { data } = await supabase
    .from('avisos_equipe')
    .select('id, titulo, conteudo, imagem_url, link_url, link_label, destinatarios, parceiro_ids, publicado_em, created_at, criado_por, agendado_para')
    .not('publicado_em', 'is', null)
    .order('publicado_em', { ascending: true })

  if (!data?.length) return []

  // Filtrar os que o usuário ainda não leu
  const avisoIds = data.map((a) => a.id)
  const { data: vistas } = await supabase
    .from('avisos_visualizacoes')
    .select('aviso_id')
    .eq('user_id', profile.id)
    .in('aviso_id', avisoIds)

  const vistaSet = new Set((vistas ?? []).map((v) => v.aviso_id))

  return data
    .filter((a) => {
      if (vistaSet.has(a.id)) return false
      if (a.destinatarios === 'todos') return true
      if (a.destinatarios === 'ativos') return true // simplificado: todos os membros ativos
      if (a.destinatarios === 'especificos') {
        return (a.parceiro_ids ?? []).includes(profile.id)
      }
      return false
    })
    .map((a) => ({
      ...a,
      parceiro_ids: (a.parceiro_ids ?? []) as string[],
    })) as AvisoEquipe[]
}

// ---------------------------------------------------------------------------
// Atividades & Mimos
// ---------------------------------------------------------------------------

export async function buscarAtividades(): Promise<AtividadeParceiro[]> {
  await requirePapel('socia')
  const supabase = await createClient()

  const { data } = await supabase
    .from('atividades_parceiros')
    .select('*')
    .order('created_at', { ascending: false })

  return (data ?? []).map((a) => ({
    ...a,
    parceiro_ids: (a.parceiro_ids ?? []) as string[],
  })) as AtividadeParceiro[]
}

export async function actionCriarAtividade(formData: FormData): Promise<void> {
  const profile = await requirePapel('socia')
  const service = createServiceClient()

  const titulo = (formData.get('titulo') as string).trim()
  const descricao = (formData.get('descricao') as string) || null
  const tipo = (formData.get('tipo') as TipoAtividade) ?? 'outro'
  const destinatario_tipo = (formData.get('destinatario_tipo') as string) as 'todos' | 'especificos'
  const parceiro_ids = JSON.parse((formData.get('parceiro_ids') as string) || '[]') as string[]
  const data_prevista = (formData.get('data_prevista') as string) || null
  const custo_estimado = formData.get('custo_estimado')
    ? parseFloat(formData.get('custo_estimado') as string)
    : null
  const gerado_por_ia = formData.get('gerado_por_ia') === 'true'

  const { error } = await service.from('atividades_parceiros').insert({
    organization_id: profile.organization_id,
    titulo,
    descricao,
    tipo,
    destinatario_tipo,
    parceiro_ids: destinatario_tipo === 'especificos' ? parceiro_ids : [],
    data_prevista,
    custo_estimado,
    gerado_por_ia,
    criado_por: profile.id,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/socias/pessoas')
}

export async function actionAtualizarStatusAtividade(
  atividadeId: string,
  status: StatusAtividade,
): Promise<void> {
  await requirePapel('socia')
  const supabase = await createClient()
  await supabase
    .from('atividades_parceiros')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', atividadeId)
  revalidatePath('/socias/pessoas')
}

export async function actionExcluirAtividade(atividadeId: string): Promise<void> {
  await requirePapel('socia')
  const supabase = await createClient()
  await supabase.from('atividades_parceiros').delete().eq('id', atividadeId)
  revalidatePath('/socias/pessoas')
}

// ---------------------------------------------------------------------------
// Izzi — Sugestão de Atividades
// ---------------------------------------------------------------------------

export async function actionSugerirAtividadesIzzi(opts: {
  parceiroIds?: string[]
  contexto?: string
}): Promise<SugestaoIzzi[]> {
  await requirePapel('socia')
  const supabase = await createClient()

  // Buscar perfis relevantes
  let query = supabase
    .from('parceiros_perfil')
    .select('nome, dados_pessoais, dados_profissionais, datas_importantes, perfil_markdown')

  if (opts.parceiroIds?.length) {
    query = query.in('id', opts.parceiroIds)
  }

  const { data: perfis } = await query.limit(10)

  if (!perfis?.length) {
    throw new Error('Nenhum perfil encontrado. Complete o onboarding de pelo menos um parceiro.')
  }

  // Montar contexto dos perfis
  const contextosPerfis = perfis
    .map((p) => {
      const md = p.perfil_markdown
      if (md) return `### ${p.nome}\n${md.slice(0, 800)}`
      return `### ${p.nome}\n${JSON.stringify({ ...(p.dados_pessoais as Record<string, unknown>), ...(p.dados_profissionais as Record<string, unknown>) })}`
    })
    .join('\n\n---\n\n')

  const systemPrompt = `Você é a Izzi, especialista em cultura organizacional da Simplizzia.
Sua missão é sugerir atividades, mimos e ações de cultura criativas e personalizadas para os parceiros da empresa.

Valores da Simplizzia: cultura leve, comunicação honesta, qualidade no trabalho, sem pressão desnecessária.

Responda SEMPRE em JSON válido, com um array de exatamente 4 sugestões no formato:
[
  {
    "titulo": "string curto (max 60 chars)",
    "descricao": "string detalhada (2-3 frases)",
    "tipo": "atividade_equipe|brinde|mimo_individual|reconhecimento|evento|celebracao|outro",
    "justificativa": "por que faz sentido para esta(s) pessoa(s) com base no perfil",
    "custo_estimado": "string como 'R$ 50–100' ou 'Sem custo'"
  }
]

Regras:
- Baseie-se nos dados pessoais (hobbies, gostos, pets, etc.) para personalizar
- Mix de custo: 2 sugestões de baixo custo, 1 média, 1 especial
- Seja criativa, calorosa e autêntica — não genérica
- Se forem vários parceiros: busque ponto em comum OU sugira ações diversas com tags
- Nunca mencione Notion, Claude Code ou ferramentas internas`

  const userMsg = `Perfis dos parceiros:\n\n${contextosPerfis}\n\n${opts.contexto ? `Contexto adicional: ${opts.contexto}` : ''}\n\nGere 4 sugestões personalizadas.`

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1500,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMsg }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  try {
    // Extrair JSON do texto (pode ter texto ao redor)
    const match = text.match(/\[[\s\S]*\]/)
    const json = match ? match[0] : text
    return JSON.parse(json) as SugestaoIzzi[]
  } catch {
    throw new Error('Izzi retornou um formato inesperado. Tente novamente.')
  }
}

// ---------------------------------------------------------------------------
// Função interna: entrega efetiva de um aviso publicado
// ---------------------------------------------------------------------------

async function _entregarAviso(
  service: ReturnType<typeof createServiceClient>,
  organizationId: string,
  avisoId: string,
  titulo: string,
  conteudo: string,
  linkUrl: string | null,
  destinatarios: 'todos' | 'ativos' | 'especificos',
  parceiroIds: string[],
): Promise<void> {
  // Buscar perfis destinatários
  let perfilQuery = service
    .from('profiles')
    .select('id, user_id, nome')
    .eq('organization_id', organizationId)
    .not('papel', 'eq', 'cliente')

  if (destinatarios === 'ativos') {
    // Só colaboradores com status ativo
    const { data: colabs } = await service
      .from('colaboradores_mapa')
      .select('user_id')
      .eq('organization_id', organizationId)
      .eq('status', 'ativo')
    const userIds = (colabs ?? []).map((c) => c.user_id)
    if (userIds.length) {
      perfilQuery = perfilQuery.in('user_id', userIds)
    }
  } else if (destinatarios === 'especificos' && parceiroIds.length) {
    perfilQuery = perfilQuery.in('id', parceiroIds)
  }

  const { data: perfis } = await perfilQuery

  if (!perfis?.length) return

  // Inserir notificações in-app
  const notificacoes = perfis.map((p) => ({
    organization_id: organizationId,
    usuario_id: (p as { id: string }).id,
    tipo: 'geral' as const,
    titulo,
    mensagem: conteudo.slice(0, 200),
    link: `/socias/pessoas?aviso=${avisoId}`,
  }))

  await service.from('in_app_notificacoes').insert(notificacoes)

  // Enviar e-mails (best-effort, cada um individualmente)
  for (const p of perfis) {
    const typedP = p as { id: string; user_id: string; nome: string }
    const emailAddr = await buscarEmailUsuario(typedP.user_id)
    if (!emailAddr) continue
    const { subject, html } = emailAviso({
      destinatarioNome: typedP.nome,
      titulo,
      conteudo,
      linkUrl,
    })
    await enviarEmail(emailAddr, subject, html)
  }
}
