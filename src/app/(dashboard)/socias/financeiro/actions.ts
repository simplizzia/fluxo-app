'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { requirePapel } from '@/lib/dal'
import { calcMRR, type ReceitaRow } from '@/lib/financeiro'

// ---------------------------------------------------------------------------
// Tipos exportados para o client
// ---------------------------------------------------------------------------

export type CicloCobranca = 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'projeto'
export type StatusPagamento = 'pago' | 'pendente' | 'em_atraso'
export type TipoDocFinanceiro = 'nota_fiscal' | 'comprovante' | 'contrato' | 'boleto' | 'outro'

export interface Receita {
  id: string
  cliente_id: string | null
  descricao: string
  valor_mensal: number
  ciclo: CicloCobranca
  status: StatusPagamento
  data_cobranca_dia: number
  ativo: boolean
  ultima_atualizacao_status: string
  observacoes: string | null
  competencia: string | null
  recebimento: string | null
  created_at: string
  cliente?: { id: string; nome: string } | null
}

export interface HistoricoItem {
  id: string
  receita_id: string
  competencia: string
  valor_cobrado: number
  status: StatusPagamento
  pago_em: string | null
  observacoes: string | null
}

export interface DocFinanceiro {
  id: string
  cliente_id: string | null
  tipo: TipoDocFinanceiro
  nome: string
  storage_path: string
  mime_type: string
  tamanho_bytes: number
  mes_referencia: string | null
  created_at: string
  url_assinada?: string
  cliente?: { nome: string } | null
}

export interface FinanceiroVisaoGeral {
  mrr: number
  total_receitas_ativas: number
  em_atraso: number
  valor_em_atraso: number
  pendentes: number
  valor_pendente: number
}

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------

export async function buscarReceitasFinanceiro(): Promise<Receita[]> {
  await requirePapel('socia')
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('financeiro_receitas')
    .select(`
      id, cliente_id, descricao, valor_mensal, ciclo, status,
      data_cobranca_dia, ativo, ultima_atualizacao_status, observacoes,
      competencia, recebimento, created_at,
      cliente:clientes!cliente_id(id, nome)
    `)
    .order('ativo', { ascending: false })
    .order('status')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[buscarReceitasFinanceiro]', error.message)
    return []
  }

  return (data ?? []) as unknown as Receita[]
}

export async function buscarVisaoGeral(receitas: Receita[]): Promise<FinanceiroVisaoGeral> {
  // Apenas receitas recorrentes entram no MRR e nos KPIs principais
  const recorrentes = receitas.filter((r) => r.ativo && r.ciclo !== 'projeto')
  const atrasadas = recorrentes.filter((r) => r.status === 'em_atraso')
  const pendentes = recorrentes.filter((r) => r.status === 'pendente')

  return {
    mrr: calcMRR(receitas as ReceitaRow[]),
    total_receitas_ativas: recorrentes.length,
    em_atraso: atrasadas.length,
    valor_em_atraso: atrasadas.reduce((s, r) => s + Number(r.valor_mensal), 0),
    pendentes: pendentes.length,
    valor_pendente: pendentes.reduce((s, r) => s + Number(r.valor_mensal), 0),
  }
}

export async function buscarHistoricoReceita(receitaId: string): Promise<HistoricoItem[]> {
  await requirePapel('socia')
  const supabase = await createClient()

  const { data } = await supabase
    .from('financeiro_historico')
    .select('id, receita_id, competencia, valor_cobrado, status, pago_em, observacoes')
    .eq('receita_id', receitaId)
    .order('competencia', { ascending: false })
    .limit(24)

  return (data ?? []) as HistoricoItem[]
}

export async function buscarDocumentosFinanceiros(
  mesReferencia?: string,
  clienteId?: string,
): Promise<DocFinanceiro[]> {
  await requirePapel('socia')
  const supabase = await createClient()
  const service = createServiceClient()

  let query = supabase
    .from('financeiro_documentos')
    .select(`
      id, cliente_id, tipo, nome, storage_path, mime_type,
      tamanho_bytes, mes_referencia, created_at,
      cliente:clientes!cliente_id(nome)
    `)
    .order('created_at', { ascending: false })

  if (mesReferencia) query = query.eq('mes_referencia', mesReferencia)
  if (clienteId) query = query.eq('cliente_id', clienteId)

  const { data } = await query

  if (!data?.length) return []

  // URLs assinadas em batch
  const paths = data.map((d) => d.storage_path)
  const { data: signedList } = await service.storage
    .from('socias-docs')
    .createSignedUrls(paths, 3600)

  const urlMap = new Map((signedList ?? []).map((s) => [s.path, s.signedUrl ?? '']))

  return data.map((d) => ({
    ...(d as unknown as DocFinanceiro),
    url_assinada: urlMap.get(d.storage_path) ?? '',
  }))
}

// ---------------------------------------------------------------------------
// Mutações — Receitas
// ---------------------------------------------------------------------------

const ReceitaSchema = z.object({
  descricao: z.string().trim().min(1, 'Descrição obrigatória'),
  cliente_id: z.string().uuid().nullable().optional(),
  valor_mensal: z.number().positive('Valor deve ser positivo'),
  ciclo: z.enum(['mensal', 'trimestral', 'semestral', 'anual', 'projeto'] as const),
  data_cobranca_dia: z.number().int().min(1).max(28),
  observacoes: z.string().optional(),
  competencia: z.string().optional().nullable(),
  recebimento: z.string().optional().nullable(),
})

export async function actionCriarReceita(
  input: z.infer<typeof ReceitaSchema>,
): Promise<{ id?: string; error?: string }> {
  const profile = await requirePapel('socia')
  const supabase = await createClient()

  const validated = ReceitaSchema.safeParse(input)
  if (!validated.success) return { error: 'Dados inválidos.' }

  const { data, error } = await supabase
    .from('financeiro_receitas')
    .insert({
      organization_id: profile.organization_id,
      ...validated.data,
      cliente_id: validated.data.cliente_id ?? null,
      observacoes: validated.data.observacoes || null,
      competencia: validated.data.competencia || null,
      recebimento: validated.data.recebimento || null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[actionCriarReceita]', error.message)
    return { error: 'Erro ao criar receita.' }
  }

  revalidatePath('/socias/financeiro')
  return { id: data.id }
}

export async function actionEditarReceita(
  id: string,
  input: z.infer<typeof ReceitaSchema>,
): Promise<{ error?: string }> {
  await requirePapel('socia')
  const supabase = await createClient()

  const validated = ReceitaSchema.safeParse(input)
  if (!validated.success) return { error: 'Dados inválidos.' }

  const { error } = await supabase
    .from('financeiro_receitas')
    .update({
      descricao: validated.data.descricao,
      cliente_id: validated.data.cliente_id ?? null,
      valor_mensal: validated.data.valor_mensal,
      ciclo: validated.data.ciclo,
      data_cobranca_dia: validated.data.data_cobranca_dia,
      observacoes: validated.data.observacoes || null,
      competencia: validated.data.competencia || null,
      recebimento: validated.data.recebimento || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('[actionEditarReceita]', error.message)
    return { error: 'Erro ao editar receita.' }
  }

  revalidatePath('/socias/financeiro')
  return {}
}

export async function actionAtualizarStatusReceita(
  receitaId: string,
  status: StatusPagamento,
): Promise<{ error?: string }> {
  await requirePapel('socia')
  const supabase = await createClient()

  const { error } = await supabase
    .from('financeiro_receitas')
    .update({ status, ultima_atualizacao_status: new Date().toISOString() })
    .eq('id', receitaId)

  if (error) return { error: 'Erro ao atualizar status.' }
  revalidatePath('/socias/financeiro')
  return {}
}

export async function actionArquivarReceita(receitaId: string): Promise<{ error?: string }> {
  await requirePapel('socia')
  const supabase = await createClient()

  const { error } = await supabase
    .from('financeiro_receitas')
    .update({ ativo: false })
    .eq('id', receitaId)

  if (error) return { error: 'Erro ao arquivar receita.' }
  revalidatePath('/socias/financeiro')
  return {}
}

export async function actionRegistrarHistorico(input: {
  receitaId: string
  competencia: string
  valorCobrado: number
  status: StatusPagamento
  pagoEm?: string
}): Promise<{ error?: string }> {
  await requirePapel('socia')
  const supabase = await createClient()

  const { data: receita } = await supabase
    .from('financeiro_receitas')
    .select('organization_id, valor_mensal')
    .eq('id', input.receitaId)
    .single()

  if (!receita) return { error: 'Receita não encontrada.' }

  const { error } = await supabase
    .from('financeiro_historico')
    .upsert({
      organization_id: receita.organization_id,
      receita_id: input.receitaId,
      competencia: input.competencia,
      valor_cobrado: input.valorCobrado,
      status: input.status,
      pago_em: input.pagoEm ?? null,
    }, { onConflict: 'receita_id,competencia' })

  if (error) return { error: 'Erro ao registrar histórico.' }
  revalidatePath('/socias/financeiro')
  return {}
}

// ---------------------------------------------------------------------------
// Mutações — Documentos
// ---------------------------------------------------------------------------

const MIME_FINANCEIRO = new Set([
  'application/pdf',
  'image/jpeg', 'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])

const TAMANHO_MAX = 20 * 1024 * 1024 // 20 MB

export async function actionUploadDocFinanceiro(
  formData: FormData,
): Promise<{ doc?: DocFinanceiro; error?: string }> {
  const profile = await requirePapel('socia')
  const service = createServiceClient()

  const file = formData.get('arquivo') as File | null
  if (!file || file.size === 0) return { error: 'Nenhum arquivo selecionado.' }
  if (!MIME_FINANCEIRO.has(file.type)) return { error: 'Tipo de arquivo não permitido.' }
  if (file.size > TAMANHO_MAX) return { error: 'Arquivo muito grande. Máximo: 20 MB.' }

  const tipo = (formData.get('tipo') as TipoDocFinanceiro) ?? 'outro'
  const nome = (formData.get('nome') as string) || file.name
  const mesReferencia = (formData.get('mes_referencia') as string) || null
  const clienteId = (formData.get('cliente_id') as string) || null

  const nomeSeguro = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${profile.organization_id}/financeiro/${Date.now()}-${nomeSeguro}`

  const buffer = await file.arrayBuffer()
  const { error: uploadError } = await service.storage
    .from('socias-docs')
    .upload(storagePath, buffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    console.error('[actionUploadDocFinanceiro] storage:', uploadError.message)
    return { error: 'Erro ao enviar arquivo.' }
  }

  const { data: novo, error: insertError } = await service
    .from('financeiro_documentos')
    .insert({
      organization_id: profile.organization_id,
      cliente_id: clienteId,
      tipo,
      nome,
      storage_path: storagePath,
      mime_type: file.type,
      tamanho_bytes: file.size,
      mes_referencia: mesReferencia ? `${mesReferencia}-01` : null,
      uploaded_by: profile.id,
    })
    .select('id, cliente_id, tipo, nome, storage_path, mime_type, tamanho_bytes, mes_referencia, created_at')
    .single()

  if (insertError || !novo) {
    await service.storage.from('socias-docs').remove([storagePath])
    return { error: 'Erro ao registrar documento.' }
  }

  const { data: signed } = await service.storage
    .from('socias-docs')
    .createSignedUrl(storagePath, 3600)

  revalidatePath('/socias/financeiro')
  return {
    doc: {
      ...(novo as unknown as DocFinanceiro),
      url_assinada: signed?.signedUrl ?? '',
    },
  }
}

export async function actionExcluirDocFinanceiro(docId: string): Promise<{ error?: string }> {
  await requirePapel('socia')
  const supabase = await createClient()
  const service = createServiceClient()

  const { data: doc } = await supabase
    .from('financeiro_documentos')
    .select('storage_path')
    .eq('id', docId)
    .single()

  if (!doc) return { error: 'Documento não encontrado.' }

  await service.storage.from('socias-docs').remove([doc.storage_path])
  await supabase.from('financeiro_documentos').delete().eq('id', docId)

  revalidatePath('/socias/financeiro')
  return {}
}

// ---------------------------------------------------------------------------
// Tipos — Despesas
// ---------------------------------------------------------------------------

export type CategoriaDespesa =
  | 'impostos' | 'colaboradores' | 'ferramentas' | 'fornecedores'
  | 'marketing' | 'escritorio' | 'outros'

export type StatusDespesa = 'pendente' | 'paga' | 'vencida'

export interface Despesa {
  id: string
  organization_id: string
  categoria: CategoriaDespesa
  descricao: string
  fornecedor: string | null
  valor: number
  competencia: string | null
  vencimento: string
  pago_em: string | null
  status: StatusDespesa
  recorrente: boolean
  ciclo: CicloCobranca | null
  comprovante_path: string | null
  observacoes: string | null
  ativo: boolean
  created_at: string
}

export interface FluxoCaixaMes {
  mes: string      // 'YYYY-MM-01'
  label: string    // 'jun. 2026'
  receitas: number
  despesas: number
  resultado: number
}

// ---------------------------------------------------------------------------
// Leitura — Despesas
// ---------------------------------------------------------------------------

export async function buscarDespesas(): Promise<Despesa[]> {
  await requirePapel('socia')
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('financeiro_despesas')
    .select(
      'id, organization_id, categoria, descricao, fornecedor, valor, competencia, vencimento, pago_em, status, recorrente, ciclo, comprovante_path, observacoes, ativo, created_at',
    )
    .eq('ativo', true)
    .order('vencimento', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[buscarDespesas]', error.message)
    return []
  }

  return (data ?? []) as unknown as Despesa[]
}

export async function buscarFluxoCaixa(meses = 6): Promise<FluxoCaixaMes[]> {
  await requirePapel('socia')
  const supabase = await createClient()

  const hoje = new Date()
  const inicioData = new Date(hoje.getFullYear(), hoje.getMonth() - (meses - 1), 1)
  const inicioISO = inicioData.toISOString().split('T')[0]

  const [{ data: historico }, { data: despesasPagas }, { data: receitasPagas }] = await Promise.all([
    // Receitas registradas via modal de Histórico (mês a mês)
    supabase
      .from('financeiro_historico')
      .select('competencia, valor_cobrado')
      .eq('status', 'pago')
      .gte('competencia', inicioISO),
    // Despesas pagas — OR para não perder despesas com competencia no período
    // mas pago_em fora dele (ou nulo)
    supabase
      .from('financeiro_despesas')
      .select('pago_em, competencia, valor')
      .eq('status', 'paga')
      .eq('ativo', true)
      .or(`pago_em.gte.${inicioISO}T00:00:00,competencia.gte.${inicioISO}`),
    // Receitas pagas diretamente (via campo recebimento na receita)
    supabase
      .from('financeiro_receitas')
      .select('competencia, recebimento, valor_mensal')
      .eq('status', 'pago')
      .eq('ativo', true)
      .not('recebimento', 'is', null)
      .gte('recebimento', inicioISO),
  ])

  // Monta buckets para cada mês no intervalo
  const buckets = new Map<string, { receitas: number; despesas: number }>()
  for (let i = 0; i < meses; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - (meses - 1 - i), 1)
    buckets.set(d.toISOString().split('T')[0], { receitas: 0, despesas: 0 })
  }

  // Fonte 1: historico (quem usa o modal de histórico mês a mês)
  for (const h of historico ?? []) {
    const b = buckets.get(h.competencia)
    if (b) b.receitas += Number(h.valor_cobrado)
  }

  // Fonte 2: receitas com recebimento direto
  // Prioridade: competencia (mês contábil) > recebimento (data real)
  for (const r of receitasPagas ?? []) {
    if (!r.recebimento) continue
    const dataRef = r.competencia ?? r.recebimento
    const dt = new Date(dataRef + 'T12:00:00')
    const key = new Date(dt.getFullYear(), dt.getMonth(), 1).toISOString().split('T')[0]
    const b = buckets.get(key)
    if (b) b.receitas += Number(r.valor_mensal)
  }

  // Despesas pagas — prioridade: competencia (mês contábil) > pago_em (data real)
  for (const d of despesasPagas ?? []) {
    if (!d.competencia && !d.pago_em) continue
    const dt = d.competencia
      ? new Date(d.competencia + 'T12:00:00')
      : new Date(d.pago_em!)
    const key = new Date(dt.getFullYear(), dt.getMonth(), 1).toISOString().split('T')[0]
    const b = buckets.get(key)
    if (b) b.despesas += Number(d.valor)
  }

  return Array.from(buckets.entries()).map(([mes, { receitas, despesas }]) => ({
    mes,
    label: new Date(mes + 'T12:00:00').toLocaleDateString('pt-BR', {
      month: 'short',
      year: 'numeric',
    }),
    receitas,
    despesas,
    resultado: receitas - despesas,
  }))
}

// ---------------------------------------------------------------------------
// Mutações — Despesas
// ---------------------------------------------------------------------------

const DespesaSchema = z.object({
  categoria: z.enum([
    'impostos', 'colaboradores', 'ferramentas', 'fornecedores',
    'marketing', 'escritorio', 'outros',
  ] as const),
  descricao: z.string().trim().min(1, 'Descrição obrigatória'),
  fornecedor: z.string().trim().optional(),
  valor: z.number().positive('Valor deve ser positivo'),
  competencia: z.string().optional().nullable(),
  vencimento: z.string().min(1, 'Vencimento obrigatório'),
  recorrente: z.boolean().default(false),
  ciclo: z.enum(['mensal', 'trimestral', 'semestral', 'anual', 'projeto'] as const).optional().nullable(),
  observacoes: z.string().optional(),
  status: z.enum(['pendente', 'paga', 'vencida'] as const).optional(),
  pago_em: z.string().optional().nullable(),
})

export async function actionCriarDespesa(
  input: z.infer<typeof DespesaSchema>,
): Promise<{ id?: string; error?: string }> {
  const profile = await requirePapel('socia')
  const supabase = await createClient()

  const validated = DespesaSchema.safeParse(input)
  if (!validated.success) return { error: 'Dados inválidos.' }

  const { data, error } = await supabase
    .from('financeiro_despesas')
    .insert({
      organization_id: profile.organization_id,
      ...validated.data,
      fornecedor: validated.data.fornecedor || null,
      competencia: validated.data.competencia || null,
      ciclo: validated.data.ciclo ?? null,
      observacoes: validated.data.observacoes || null,
      status: validated.data.status ?? 'pendente',
      pago_em: validated.data.pago_em || null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[actionCriarDespesa]', error.message)
    return { error: 'Erro ao criar despesa.' }
  }

  revalidatePath('/socias/financeiro')
  return { id: data.id }
}

export async function actionEditarDespesa(
  id: string,
  input: z.infer<typeof DespesaSchema>,
): Promise<{ error?: string }> {
  await requirePapel('socia')
  const supabase = await createClient()

  const validated = DespesaSchema.safeParse(input)
  if (!validated.success) return { error: 'Dados inválidos.' }

  const { error } = await supabase
    .from('financeiro_despesas')
    .update({
      ...validated.data,
      fornecedor: validated.data.fornecedor || null,
      competencia: validated.data.competencia || null,
      ciclo: validated.data.ciclo ?? null,
      observacoes: validated.data.observacoes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('[actionEditarDespesa]', error.message)
    return { error: 'Erro ao editar despesa.' }
  }

  revalidatePath('/socias/financeiro')
  return {}
}

export async function actionAtualizarStatusDespesa(
  id: string,
  status: StatusDespesa,
  pagoEm?: string,
): Promise<{ error?: string }> {
  await requirePapel('socia')
  const supabase = await createClient()

  const { error } = await supabase
    .from('financeiro_despesas')
    .update({
      status,
      pago_em: pagoEm ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: 'Erro ao atualizar despesa.' }
  revalidatePath('/socias/financeiro')
  return {}
}

export async function actionArquivarDespesa(id: string): Promise<{ error?: string }> {
  await requirePapel('socia')
  const supabase = await createClient()

  const { error } = await supabase
    .from('financeiro_despesas')
    .update({ ativo: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: 'Erro ao arquivar despesa.' }
  revalidatePath('/socias/financeiro')
  return {}
}

// ---------------------------------------------------------------------------
// Export CSV para contabilidade
// ---------------------------------------------------------------------------

export async function actionExportarCSV(
  mesInicio: string,
  mesFim: string,
): Promise<{ csv?: string; error?: string }> {
  await requirePapel('socia')
  const supabase = await createClient()

  // Receitas: competencia entre mesInicio-01 e mesFim-01 (inclusive)
  const dataInicioReceitas = `${mesInicio}-01`
  const dataFimReceitas = `${mesFim}-01`

  // Despesas: vencimento no período (dia a dia)
  const dataInicioDespesas = `${mesInicio}-01`
  const ultimoDia = new Date(
    parseInt(mesFim.split('-')[0]),
    parseInt(mesFim.split('-')[1]),
    0,
  ).getDate()
  const dataFimDespesas = `${mesFim}-${String(ultimoDia).padStart(2, '0')}`

  const [{ data: historico }, receitasRes, { data: despesas }] = await Promise.all([
    supabase
      .from('financeiro_historico')
      .select('competencia, valor_cobrado, status, receita_id')
      .gte('competencia', dataInicioReceitas)
      .lte('competencia', dataFimReceitas)
      .order('competencia'),
    supabase
      .from('financeiro_receitas')
      .select('id, descricao, cliente:clientes!cliente_id(nome)'),
    supabase
      .from('financeiro_despesas')
      .select('vencimento, pago_em, valor, status, categoria, descricao, fornecedor')
      .gte('vencimento', dataInicioDespesas)
      .lte('vencimento', dataFimDespesas)
      .eq('ativo', true)
      .order('vencimento'),
  ])

  // Mapa de receitas para join manual
  const receitaMap = new Map(
    (receitasRes.data ?? []).map((r) => [
      r.id,
      { descricao: r.descricao, cliente: (r.cliente as { nome?: string } | null)?.nome ?? '' },
    ]),
  )

  const LABEL_CATEGORIA: Record<string, string> = {
    impostos: 'Impostos',
    colaboradores: 'Colaboradores',
    ferramentas: 'Ferramentas/Software',
    fornecedores: 'Fornecedores',
    marketing: 'Marketing',
    escritorio: 'Escritório',
    outros: 'Outros',
  }

  // BOM para Excel UTF-8 + delimitador ponto-e-vírgula (padrão PT-BR)
  const linhas: string[] = [
    '﻿Tipo;Data;Descrição;Categoria/Cliente;Fornecedor;Valor (R$);Status',
  ]

  for (const h of historico ?? []) {
    const receita = receitaMap.get(h.receita_id)
    const data = new Date(h.competencia + 'T12:00:00').toLocaleDateString('pt-BR', {
      month: '2-digit',
      year: 'numeric',
    })
    const descricao = (receita?.descricao ?? h.receita_id).replace(/;/g, ',')
    const cliente = (receita?.cliente ?? '').replace(/;/g, ',')
    const valor = Number(h.valor_cobrado).toFixed(2).replace('.', ',')
    const statusLabel =
      h.status === 'pago' ? 'Pago' : h.status === 'pendente' ? 'Pendente' : 'Em atraso'
    linhas.push(`Receita;${data};"${descricao}";"${cliente}";;${valor};${statusLabel}`)
  }

  for (const d of despesas ?? []) {
    const data = new Date(d.vencimento + 'T12:00:00').toLocaleDateString('pt-BR')
    const descricao = (d.descricao ?? '').replace(/;/g, ',')
    const fornecedor = (d.fornecedor ?? '').replace(/;/g, ',')
    const cat = LABEL_CATEGORIA[d.categoria] ?? d.categoria
    const valor = Number(d.valor).toFixed(2).replace('.', ',')
    const statusLabel =
      d.status === 'paga' ? 'Paga' : d.status === 'pendente' ? 'Pendente' : 'Vencida'
    linhas.push(`Despesa;${data};"${descricao}";${cat};"${fornecedor}";${valor};${statusLabel}`)
  }

  return { csv: linhas.join('\n') }
}
