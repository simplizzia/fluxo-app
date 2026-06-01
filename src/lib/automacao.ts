/**
 * Motor de Automação — Simplizzia OS
 *
 * Helpers para verificar se uma regra está ativa e registrar execuções.
 * Usado pelos crons de automação (api/cron/*).
 *
 * Design:
 *  - verificarRegraAtiva(): consulta automation_rules por gatilho + org.
 *    Se a regra não existir (org sem seed), retorna ativa=true por segurança.
 *  - logAutomacao(): insere em automation_logs. Silencioso em falha.
 */
import 'server-only'

import { createServiceClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface RegraStatus {
  /** ID da regra em automation_rules (null se regra não existir no banco) */
  regra_id: string | null
  /** true = cron deve executar; false = regra desativada, pular */
  ativa: boolean
}

// ---------------------------------------------------------------------------
// verificarRegraAtiva
// ---------------------------------------------------------------------------

/**
 * Verifica se uma regra de automação está ativa para a organização.
 *
 * - Se a regra não existir (ex.: seed ainda não rodou), retorna ativa=true
 *   para não bloquear a execução dos crons antes do setup.
 * - Se existir e ativa=false, retorna ativa=false — cron deve pular a org.
 */
export async function verificarRegraAtiva(
  organizationId: string,
  gatilho: string,
): Promise<RegraStatus> {
  try {
    const service = createServiceClient()
    const { data } = await service
      .from('automation_rules')
      .select('id, ativa')
      .eq('organization_id', organizationId)
      .eq('gatilho', gatilho)
      .maybeSingle()

    if (!data) return { regra_id: null, ativa: true }   // regra não seedada → permissiva
    return { regra_id: data.id as string, ativa: data.ativa as boolean }
  } catch {
    // Falha na consulta → não bloqueia o cron
    return { regra_id: null, ativa: true }
  }
}

// ---------------------------------------------------------------------------
// logAutomacao
// ---------------------------------------------------------------------------

/**
 * Registra a execução de uma regra no automation_logs.
 * Silencioso — falha de log nunca propaga para o cron.
 */
export async function logAutomacao(opts: {
  organizationId: string
  regra_id: string
  entidade: string
  entidade_id: string
  sucesso: boolean
  detalhes?: Record<string, unknown>
}): Promise<void> {
  try {
    const service = createServiceClient()
    await service.from('automation_logs').insert({
      organization_id: opts.organizationId,
      rule_id: opts.regra_id,
      entidade: opts.entidade,
      entidade_id: opts.entidade_id,
      sucesso: opts.sucesso,
      detalhes: (opts.detalhes ?? {}) as unknown as import('@/types/database').Json,
    })
  } catch (err) {
    console.error('[automacao] Falha ao registrar log:', err)
  }
}
