'use server'

import { z } from 'zod'
import { requirePapel } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import type { Produto, StatusProduto } from './produtos-shared'

// ---------------------------------------------------------------------------
// listarProdutos — produtos de uma marca (RLS: equipe da própria org)
// ---------------------------------------------------------------------------

export async function listarProdutos(marcaId: string): Promise<{ produtos: Produto[]; error?: string }> {
  await requirePapel('socia', 'gestao', 'atendimento', 'executor')
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('produtos')
    .select('id, nome, sku, sabor, categoria, status, publico, observacoes')
    .eq('marca_id', marcaId)
    .order('status')
    .order('nome')

  if (error) return { produtos: [], error: 'Falha ao carregar produtos.' }
  return { produtos: (data ?? []) as Produto[] }
}

const ProdutoSchema = z.object({
  nome: z.string().trim().min(2, { message: 'Informe o nome do produto.' }),
  sku: z.string().trim().optional(),
  sabor: z.string().trim().optional(),
  categoria: z.string().trim().optional(),
  status: z.enum(['ativo', 'nao_lancado', 'producao_incerta', 'descontinuado', 'fora_de_escopo'] as const),
  publico: z.string().trim().optional(),
  observacoes: z.string().trim().optional(),
})

// ---------------------------------------------------------------------------
// salvarProduto — cria ou atualiza. O vínculo marca↔cliente é derivado da
// marca no servidor; nunca confiar em cliente_id vindo do formulário.
// ---------------------------------------------------------------------------

export async function salvarProduto(
  input: { id?: string; clienteId: string; marcaId: string } & Record<string, unknown>,
): Promise<{ produto?: Produto; error?: string; errors?: Record<string, string[]> }> {
  const profile = await requirePapel('socia', 'gestao', 'atendimento')
  const supabase = await createClient()

  const validated = ProdutoSchema.safeParse(input)
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors }

  // Confirma que a marca pertence a este cliente antes de gravar — o cliente_id
  // do formulário não é fonte de verdade. onboarding_marcas liga ao cliente por
  // `token` (via onboarding_clientes), não por cliente_id direto.
  const { data: onb } = await supabase
    .from('onboarding_clientes')
    .select('token')
    .eq('cliente_id', input.clienteId)
    .maybeSingle()

  const { data: marca } = onb
    ? await supabase
        .from('onboarding_marcas')
        .select('id')
        .eq('id', input.marcaId)
        .eq('token', onb.token)
        .maybeSingle()
    : { data: null }

  if (!marca) {
    return { error: 'Marca não encontrada para este cliente.' }
  }

  const v = validated.data
  const linha = {
    organization_id: profile.organization_id,
    cliente_id: input.clienteId,
    marca_id: input.marcaId,
    nome: v.nome,
    sku: v.sku || null,
    sabor: v.sabor || null,
    categoria: v.categoria || null,
    status: v.status,
    publico: v.publico || null,
    observacoes: v.observacoes || null,
  }

  const query = input.id
    ? supabase.from('produtos').update(linha).eq('id', input.id)
    : supabase.from('produtos').insert(linha)

  const { data, error } = await query
    .select('id, nome, sku, sabor, categoria, status, publico, observacoes')
    .single()

  if (error || !data) {
    console.error('[salvarProduto]', error?.message)
    return { error: 'Erro ao salvar o produto.' }
  }

  return { produto: data as Produto }
}

// ---------------------------------------------------------------------------
// excluirProduto
// ---------------------------------------------------------------------------

export async function excluirProduto(id: string): Promise<{ error?: string }> {
  await requirePapel('socia', 'gestao', 'atendimento')
  const supabase = await createClient()

  const { error } = await supabase.from('produtos').delete().eq('id', id)
  if (error) {
    console.error('[excluirProduto]', error.message)
    return { error: 'Erro ao excluir o produto.' }
  }
  return {}
}
