'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/dal'

// ---------------------------------------------------------------------------
// Tipos exportados
// ---------------------------------------------------------------------------

export interface UsoClientePlano {
  cliente_id: string
  cliente_nome: string
  limite: number
  tipo_plano: string
  usados: number
  porcentagem: number
}

export interface CardResumoMes {
  id: string
  titulo: string
  status: string
  prioridade: string
  created_at: string
  tipo: { nome: string }
}

// ---------------------------------------------------------------------------
// buscarConfigUsoOrg — configuração de controle de uso da organização (socia)
// ---------------------------------------------------------------------------

export async function buscarConfigUsoOrg(): Promise<{
  unidadeControle: 'demandas' | 'horas' | 'creditos'
  creditosPorTipo: Record<string, number>
  tiposDemanda: { id: string; nome: string }[]
  error?: string
}> {
  const profile = await getCurrentProfile()
  if (profile.papel !== 'socia') return { unidadeControle: 'demandas', creditosPorTipo: {}, tiposDemanda: [] }

  const supabase = await createClient()

  const [{ data: org }, { data: tipos }] = await Promise.all([
    supabase
      .from('organizacoes')
      .select('unidade_controle, creditos_por_tipo')
      .eq('id', profile.organization_id)
      .single(),
    supabase
      .from('tipos_demanda')
      .select('id, nome')
      .eq('organization_id', profile.organization_id)
      .eq('ativo', true)
      .order('nome'),
  ])

  return {
    unidadeControle: ((org?.unidade_controle as string) ?? 'demandas') as 'demandas' | 'horas' | 'creditos',
    creditosPorTipo: (org?.creditos_por_tipo as Record<string, number>) ?? {},
    tiposDemanda: (tipos ?? []) as { id: string; nome: string }[],
  }
}

// ---------------------------------------------------------------------------
// actionSalvarConfigUsoOrg — salva configuração de controle (socia only)
// ---------------------------------------------------------------------------

const SchemaConfigUso = z.object({
  unidade_controle: z.enum(['demandas', 'horas', 'creditos']),
  creditos_por_tipo: z.string().optional(),
})

export async function actionSalvarConfigUsoOrg(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const profile = await getCurrentProfile()
  if (profile.papel !== 'socia') return { error: 'Acesso negado.' }

  const parsed = SchemaConfigUso.safeParse({
    unidade_controle: formData.get('unidade_controle'),
    creditos_por_tipo: formData.get('creditos_por_tipo'),
  })

  if (!parsed.success) return { error: 'Dados inválidos.' }

  let creditosPorTipo: Record<string, number> = {}
  if (parsed.data.creditos_por_tipo) {
    try {
      creditosPorTipo = JSON.parse(parsed.data.creditos_por_tipo)
    } catch {
      return { error: 'JSON de créditos inválido.' }
    }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('organizacoes')
    .update({
      unidade_controle:  parsed.data.unidade_controle,
      creditos_por_tipo: creditosPorTipo,
    })
    .eq('id', profile.organization_id)

  if (error) return { error: 'Erro ao salvar configuração.' }
  return { success: true }
}

// ---------------------------------------------------------------------------
// buscarUsoPlanoEquipe — uso de todos os clientes ativos (socia/atendimento/gestao)
// ---------------------------------------------------------------------------

export async function buscarUsoPlanoEquipe(): Promise<{
  dados?: UsoClientePlano[]
  mesRef?: string
  error?: string
}> {
  const profile = await getCurrentProfile()

  if (!['socia', 'gestao', 'atendimento'].includes(profile.papel)) {
    return { error: 'Acesso negado.' }
  }

  const supabase = await createClient()

  // Mês corrente
  const agora = new Date()
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)
  const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59)
  const mesRef = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`

  // 1. Todos os clientes ativos
  const { data: clientes, error: err1 } = await supabase
    .from('clientes')
    .select('id, nome')
    .eq('status', 'ativo')
    .order('nome')

  if (err1 || !clientes) {
    console.error('[buscarUsoPlanoEquipe] clientes:', err1?.message)
    return { error: 'Erro ao carregar clientes.' }
  }

  if (clientes.length === 0) return { dados: [], mesRef }

  const clienteIds = clientes.map((c) => c.id)

  // 2. Planos dos clientes (pode não existir para todos)
  const { data: planos } = await supabase
    .from('planos_cliente')
    .select('cliente_id, limite_demandas_mes, tipo_plano')
    .in('cliente_id', clienteIds)

  const planosPorCliente = new Map(
    (planos ?? []).map((p) => [p.cliente_id, p]),
  )

  // 3. Cards não cancelados criados no mês corrente
  const { data: cards } = await supabase
    .from('cards')
    .select('cliente_id')
    .in('cliente_id', clienteIds)
    .neq('status', 'cancelado')
    .gte('created_at', inicioMes.toISOString())
    .lte('created_at', fimMes.toISOString())

  const usoPorCliente = new Map<string, number>()
  for (const card of cards ?? []) {
    usoPorCliente.set(card.cliente_id!, (usoPorCliente.get(card.cliente_id!) ?? 0) + 1)
  }

  // 4. Montar resultado
  const dados: UsoClientePlano[] = clientes.map((c) => {
    const plano = planosPorCliente.get(c.id)
    const limite = plano?.limite_demandas_mes ?? 10
    const usados = usoPorCliente.get(c.id) ?? 0
    return {
      cliente_id: c.id,
      cliente_nome: c.nome,
      limite,
      tipo_plano: plano?.tipo_plano ?? 'mensal',
      usados,
      porcentagem: Math.round((usados / limite) * 100),
    }
  })

  // Ordena por maior percentual de uso
  dados.sort((a, b) => b.porcentagem - a.porcentagem)

  return { dados, mesRef }
}

// ---------------------------------------------------------------------------
// buscarUsoPlanoCliente — uso do próprio plano (papel cliente)
// ---------------------------------------------------------------------------

export async function buscarUsoPlanoCliente(): Promise<{
  plano?: { limite: number; tipo_plano: string }
  usados?: number
  porcentagem?: number
  cards?: CardResumoMes[]
  mesRef?: string
  error?: string
}> {
  const profile = await getCurrentProfile()

  if (profile.papel !== 'cliente') {
    return { error: 'Acesso negado.' }
  }

  const supabase = await createClient()

  const agora = new Date()
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)
  const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59)
  const mesRef = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`

  // Plano do cliente (RLS filtra por cliente_id via auth_cliente_ids())
  const { data: plano } = await supabase
    .from('planos_cliente')
    .select('limite_demandas_mes, tipo_plano')
    .maybeSingle()

  const limite = plano?.limite_demandas_mes ?? 10

  // Cards do mês
  const { data: cards, error } = await supabase
    .from('cards')
    .select(`
      id, titulo, status, prioridade, created_at,
      tipo:tipos_demanda!tipo_id(nome)
    `)
    .neq('status', 'cancelado')
    .gte('created_at', inicioMes.toISOString())
    .lte('created_at', fimMes.toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[buscarUsoPlanoCliente]', error.message)
    return { error: 'Erro ao carregar dados do plano.' }
  }

  const usados = cards?.length ?? 0

  return {
    plano: { limite, tipo_plano: plano?.tipo_plano ?? 'mensal' },
    usados,
    porcentagem: Math.round((usados / limite) * 100),
    cards: cards as unknown as CardResumoMes[],
    mesRef,
  }
}
