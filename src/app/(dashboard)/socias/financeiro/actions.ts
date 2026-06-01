'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { requirePapel } from '@/lib/dal'
import { calcMRR, type ReceitaRow } from '@/lib/financeiro'

// ---------------------------------------------------------------------------
// Tipos exportados para o client
// ---------------------------------------------------------------------------

export type CicloCobranca = 'mensal' | 'trimestral' | 'semestral' | 'anual'
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
      data_cobranca_dia, ativo, ultima_atualizacao_status, observacoes, created_at,
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
  const ativas = receitas.filter((r) => r.ativo)
  const atrasadas = ativas.filter((r) => r.status === 'em_atraso')
  const pendentes = ativas.filter((r) => r.status === 'pendente')

  return {
    mrr: calcMRR(receitas as ReceitaRow[]),
    total_receitas_ativas: ativas.length,
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
  ciclo: z.enum(['mensal', 'trimestral', 'semestral', 'anual'] as const),
  data_cobranca_dia: z.number().int().min(1).max(28),
  observacoes: z.string().optional(),
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
      observacoes: validated.data.observacoes ?? null,
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
