'use server'

import { revalidatePath } from 'next/cache'
import { requirePapel } from '@/lib/dal'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface RegraAutomacao {
  id: string
  nome: string
  descricao: string | null
  gatilho: string
  ativa: boolean
  condicoes: Record<string, unknown>
  acoes: string[]
  updated_at: string
}

export interface LogAutomacao {
  id: string
  entidade: string
  entidade_id: string
  sucesso: boolean
  detalhes: Record<string, unknown>
  executado_em: string
  regra: { nome: string; gatilho: string }
}

// ---------------------------------------------------------------------------
// buscarRegras — listagem completa (socia + gestao + atendimento)
// ---------------------------------------------------------------------------

export async function buscarRegras(): Promise<{
  regras?: RegraAutomacao[]
  error?: string
}> {
  await requirePapel('socia', 'gestao', 'atendimento')
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('automation_rules')
    .select('id, nome, descricao, gatilho, ativa, condicoes, acoes, updated_at')
    .order('nome')

  if (error) return { error: 'Erro ao buscar regras.' }

  return {
    regras: (data ?? []).map((r) => ({
      id: r.id,
      nome: r.nome,
      descricao: r.descricao,
      gatilho: r.gatilho,
      ativa: r.ativa,
      condicoes: (r.condicoes ?? {}) as Record<string, unknown>,
      acoes: (r.acoes ?? []) as string[],
      updated_at: r.updated_at,
    })),
  }
}

// ---------------------------------------------------------------------------
// buscarLogs — últimos 50 logs de automação (socia + gestao + atendimento)
// ---------------------------------------------------------------------------

export async function buscarLogs(): Promise<{
  logs?: LogAutomacao[]
  error?: string
}> {
  await requirePapel('socia', 'gestao', 'atendimento')
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('automation_logs')
    .select(`
      id, entidade, entidade_id, sucesso, detalhes, executado_em,
      regra:automation_rules!rule_id(nome, gatilho)
    `)
    .order('executado_em', { ascending: false })
    .limit(50)

  if (error) return { error: 'Erro ao buscar logs.' }

  return {
    logs: (data ?? []).map((l) => ({
      id: l.id,
      entidade: l.entidade,
      entidade_id: l.entidade_id,
      sucesso: l.sucesso,
      detalhes: (l.detalhes ?? {}) as Record<string, unknown>,
      executado_em: l.executado_em,
      regra: l.regra as unknown as { nome: string; gatilho: string },
    })),
  }
}

// ---------------------------------------------------------------------------
// actionToggleRegra — ativa/desativa uma regra (socia only)
// ---------------------------------------------------------------------------

export async function actionToggleRegra(
  regraId: string,
  ativa: boolean,
): Promise<{ error?: string }> {
  await requirePapel('socia')

  // Usa service client para garantir que a escrita sempre funciona
  // (a RLS policy permite socias, mas o service role é mais seguro para mutations críticas)
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('automation_rules')
    .update({ ativa, updated_at: new Date().toISOString() })
    .eq('id', regraId)

  if (error) return { error: 'Erro ao atualizar regra.' }

  revalidatePath('/automacoes')
  return {}
}
