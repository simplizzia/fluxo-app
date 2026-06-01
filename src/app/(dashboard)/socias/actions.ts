'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { requirePapel } from '@/lib/dal'
import { createHash } from 'crypto'
import { calcSla } from '@/lib/sla'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type AreaSocia = 'financeiro' | 'contabilidade' | 'juridico' | 'rh' | 'cultura' | 'outros'
export type RegimeColaborador = 'clt' | 'pj' | 'freelancer'
export type StatusColaborador = 'ativo' | 'inativo' | 'em_avaliacao'

export interface SociaDocumento {
  id: string
  area: AreaSocia
  nome: string
  descricao: string | null
  url: string
  nome_arquivo: string
  mime_type: string
  tamanho_bytes: number
  mes_competencia: string | null
  tags: string[]
  created_at: string
  uploaded_by_nome?: string
}

export interface ExternalShareLink {
  id: string
  area: AreaSocia
  documentos_ids: string[]
  token: string
  descricao: string
  expira_em: string
  revogado: boolean
  created_at: string
  criado_por_nome?: string
  acessos?: number
}

export interface Colaborador {
  id: string
  user_id: string
  regime: RegimeColaborador
  data_inicio: string
  especialidades: string[]
  status: StatusColaborador
  observacoes: string | null
  created_at: string
  nome?: string
  papel?: string
}

export interface MrrData {
  mrr_atual: number
  clientes_ativos: number
  clientes_inativos: number
  prospects_total: number
  planos_renovar_60d: number
  historico: { mes: string; valor: number }[]
}

// ---------------------------------------------------------------------------
// MRR e Painel Executivo
// ---------------------------------------------------------------------------

export async function buscarMrr(): Promise<MrrData> {
  await requirePapel('socia')
  const supabase = await createClient()

  // Buscar IDs de clientes ativos para calcular MRR corretamente
  const { data: clientesAtivosData } = await supabase
    .from('clientes')
    .select('id')
    .eq('status', 'ativo')

  const clienteAtivoIds = (clientesAtivosData ?? []).map((c) => c.id)

  const [
    { data: planos },
    { count: clientesAtivos },
    { count: clientesInativos },
    { count: prospectsTotal },
    { count: renovar60d },
  ] = await Promise.all([
    clienteAtivoIds.length > 0
      ? supabase
          .from('planos_cliente')
          .select('valor_mensal')
          .in('cliente_id', clienteAtivoIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from('clientes')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'ativo'),
    supabase
      .from('clientes')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'inativo'),
    supabase
      .from('prospects')
      .select('id', { count: 'exact', head: true })
      .not('stage', 'in', '("cliente_ativo","perdido")'),
    supabase
      .from('planos_cliente')
      .select('id', { count: 'exact', head: true })
      .gte('data_renovacao', new Date().toISOString().slice(0, 10))
      .lte('data_renovacao', new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)),
  ])

  const mrr_atual = (planos ?? []).reduce(
    (sum, p) => sum + (Number(p.valor_mensal) || 0),
    0,
  )

  return {
    mrr_atual,
    clientes_ativos: clientesAtivos ?? 0,
    clientes_inativos: clientesInativos ?? 0,
    prospects_total: prospectsTotal ?? 0,
    planos_renovar_60d: renovar60d ?? 0,
    historico: [],
  }
}

// ---------------------------------------------------------------------------
// Documentos
// ---------------------------------------------------------------------------

export async function buscarDocumentos(area?: AreaSocia): Promise<SociaDocumento[]> {
  await requirePapel('socia')
  const supabase = await createClient()

  let query = supabase
    .from('socias_documentos')
    .select(`
      id, area, nome, descricao, url, nome_arquivo, mime_type,
      tamanho_bytes, mes_competencia, tags, created_at,
      profiles!uploaded_by(nome)
    `)
    .order('created_at', { ascending: false })

  if (area) query = query.eq('area', area)

  const { data } = await query

  return (data ?? []).map((d) => ({
    ...d,
    tags: (d.tags ?? []) as string[],
    uploaded_by_nome: (d.profiles as unknown as { nome: string } | null)?.nome,
  })) as SociaDocumento[]
}

export async function actionUploadDocumento(formData: FormData): Promise<void> {
  const profile = await requirePapel('socia')
  const service = createServiceClient()

  const area = formData.get('area') as AreaSocia
  const nome = formData.get('nome') as string
  const descricao = (formData.get('descricao') as string) || null
  const url = formData.get('url') as string
  const nome_arquivo = formData.get('nome_arquivo') as string
  const mime_type = formData.get('mime_type') as string
  const tamanho_bytes = parseInt(formData.get('tamanho_bytes') as string) || 0
  const mes_competencia = (formData.get('mes_competencia') as string) || null
  const tagsStr = (formData.get('tags') as string) || ''
  const tags = tagsStr.split(',').map((t) => t.trim()).filter(Boolean)

  const { error } = await service.from('socias_documentos').insert({
    organization_id: profile.organization_id,
    area,
    nome,
    descricao,
    url,
    nome_arquivo,
    mime_type,
    tamanho_bytes,
    mes_competencia: mes_competencia || null,
    tags,
    uploaded_by: profile.id,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/socias')
}

export async function actionExcluirDocumento(documentoId: string): Promise<void> {
  await requirePapel('socia')
  const supabase = await createClient()

  const { error } = await supabase
    .from('socias_documentos')
    .delete()
    .eq('id', documentoId)

  if (error) throw new Error(error.message)
  revalidatePath('/socias')
}

// ---------------------------------------------------------------------------
// Links de compartilhamento externo
// ---------------------------------------------------------------------------

export async function buscarShareLinks(): Promise<ExternalShareLink[]> {
  await requirePapel('socia')
  const supabase = await createClient()

  const { data } = await supabase
    .from('external_share_links')
    .select(`
      id, area, documentos_ids, token, descricao, expira_em, revogado, created_at,
      profiles!criado_por(nome)
    `)
    .order('created_at', { ascending: false })

  if (!data) return []

  // Conta acessos por link
  const linkIds = data.map((l) => l.id)
  const { data: accessCounts } = await supabase
    .from('external_share_access_log')
    .select('link_id')
    .in('link_id', linkIds)

  const countMap: Record<string, number> = {}
  for (const a of accessCounts ?? []) {
    countMap[a.link_id] = (countMap[a.link_id] ?? 0) + 1
  }

  return data.map((l) => ({
    ...l,
    documentos_ids: (l.documentos_ids ?? []) as string[],
    criado_por_nome: (l.profiles as unknown as { nome: string } | null)?.nome,
    acessos: countMap[l.id] ?? 0,
  })) as ExternalShareLink[]
}

export async function actionCriarShareLink(formData: FormData): Promise<string> {
  const profile = await requirePapel('socia')
  const service = createServiceClient()

  const area = formData.get('area') as AreaSocia
  const descricao = formData.get('descricao') as string
  const documentos_ids = JSON.parse(formData.get('documentos_ids') as string) as string[]
  const expira_em = formData.get('expira_em') as string
  const senhaRaw = (formData.get('senha') as string) || null

  const senha_hash = senhaRaw
    ? createHash('sha256').update(senhaRaw).digest('hex')
    : null

  const { data, error } = await service
    .from('external_share_links')
    .insert({
      organization_id: profile.organization_id,
      criado_por: profile.id,
      area,
      descricao,
      documentos_ids,
      expira_em,
      senha_hash,
    })
    .select('token')
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/socias')

  return (data as { token: string }).token
}

export async function actionRevogarShareLink(linkId: string): Promise<void> {
  await requirePapel('socia')
  const supabase = await createClient()

  const { error } = await supabase
    .from('external_share_links')
    .update({ revogado: true })
    .eq('id', linkId)

  if (error) throw new Error(error.message)
  revalidatePath('/socias')
}

// ---------------------------------------------------------------------------
// Colaboradores
// ---------------------------------------------------------------------------

export async function buscarColaboradores(): Promise<Colaborador[]> {
  await requirePapel('socia')
  const supabase = await createClient()

  const { data } = await supabase
    .from('colaboradores_mapa')
    .select(`
      id, user_id, regime, data_inicio, especialidades, status, observacoes, created_at,
      profiles!user_id(nome, papel)
    `)
    .order('status')
    .order('data_inicio')

  return (data ?? []).map((c) => ({
    ...c,
    especialidades: (c.especialidades ?? []) as string[],
    nome: (c.profiles as unknown as { nome: string; papel: string } | null)?.nome,
    papel: (c.profiles as unknown as { nome: string; papel: string } | null)?.papel,
  })) as Colaborador[]
}

export async function actionAdicionarColaborador(formData: FormData): Promise<void> {
  const profile = await requirePapel('socia')
  const service = createServiceClient()

  const user_id = formData.get('user_id') as string
  const regime = formData.get('regime') as RegimeColaborador
  const data_inicio = formData.get('data_inicio') as string
  const especialidadesStr = (formData.get('especialidades') as string) || ''
  const especialidades = especialidadesStr.split(',').map((e) => e.trim()).filter(Boolean)
  const observacoes = (formData.get('observacoes') as string) || null

  const { error } = await service.from('colaboradores_mapa').insert({
    organization_id: profile.organization_id,
    user_id,
    regime,
    data_inicio,
    especialidades,
    observacoes,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/socias')
}

export async function actionAtualizarStatusColaborador(
  colaboradorId: string,
  status: StatusColaborador,
): Promise<void> {
  await requirePapel('socia')
  const supabase = await createClient()

  await supabase
    .from('colaboradores_mapa')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', colaboradorId)

  revalidatePath('/socias')
}

// ---------------------------------------------------------------------------
// Buscar perfis disponíveis (equipe) para mapa de colaboradores
// ---------------------------------------------------------------------------

export async function buscarPerfisEquipe(): Promise<{ id: string; nome: string; papel: string }[]> {
  await requirePapel('socia')
  const supabase = await createClient()

  const { data } = await supabase
    .from('profiles')
    .select('id, nome, papel')
    .not('papel', 'eq', 'cliente')
    .eq('ativo', true)
    .order('nome')

  return (data ?? []) as { id: string; nome: string; papel: string }[]
}

// ---------------------------------------------------------------------------
// SLA Compliance
// ---------------------------------------------------------------------------

export interface SlaComplianceRow {
  tipo_nome: string
  total: number
  ok: number
  atencao: number
  violado: number
  compliance_rate: number
}

export interface SlaComplianceData {
  total_monitorados: number
  total_violados: number
  total_atencao: number
  por_tipo: SlaComplianceRow[]
}

export async function buscarSlaCompliance(): Promise<SlaComplianceData> {
  await requirePapel('socia')
  const supabase = await createClient()

  // Cards ativos com SLA habilitado no seu tipo
  const { data: cards } = await supabase
    .from('cards')
    .select(`
      id, status, created_at, sla_iniciado_em,
      tipo:tipos_demanda!tipo_id(
        nome, sla_ativo, sla_prazo_inicio_horas, sla_prazo_resposta_horas
      )
    `)
    .in('status', ['a_fazer', 'aguardando_info', 'em_andamento'])

  if (!cards?.length) {
    return { total_monitorados: 0, total_violados: 0, total_atencao: 0, por_tipo: [] }
  }

  const agora = new Date()
  const porTipo: Record<string, SlaComplianceRow> = {}

  let totalViolados = 0
  let totalAtencao = 0
  let totalMonitorados = 0

  for (const card of cards) {
    const tipo = card.tipo as unknown as {
      nome: string
      sla_ativo: boolean
      sla_prazo_inicio_horas: number | null
      sla_prazo_resposta_horas: number | null
    } | null

    if (!tipo?.sla_ativo) continue

    let info = null
    if (card.status === 'a_fazer' || card.status === 'aguardando_info') {
      info = calcSla(card.created_at, tipo.sla_prazo_inicio_horas, agora)
    } else if (card.status === 'em_andamento') {
      info = calcSla(
        card.sla_iniciado_em as string | null,
        tipo.sla_prazo_resposta_horas,
        agora,
      )
    }

    if (!info) continue

    totalMonitorados++
    const tipoNome = tipo.nome

    if (!porTipo[tipoNome]) {
      porTipo[tipoNome] = { tipo_nome: tipoNome, total: 0, ok: 0, atencao: 0, violado: 0, compliance_rate: 100 }
    }

    porTipo[tipoNome].total++

    if (info.status === 'violado') {
      porTipo[tipoNome].violado++
      totalViolados++
    } else if (info.status === 'atencao') {
      porTipo[tipoNome].atencao++
      totalAtencao++
    } else {
      porTipo[tipoNome].ok++
    }
  }

  const porTipoList = Object.values(porTipo).map((row) => ({
    ...row,
    compliance_rate: row.total > 0
      ? Math.round(((row.ok + row.atencao) / row.total) * 100)
      : 100,
  })).sort((a, b) => a.compliance_rate - b.compliance_rate)

  return {
    total_monitorados: totalMonitorados,
    total_violados: totalViolados,
    total_atencao: totalAtencao,
    por_tipo: porTipoList,
  }
}
