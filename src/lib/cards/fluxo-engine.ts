import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import {
  avancoAutomatico,
  etapasOrdenadas,
  type FluxoEtapa,
  type SinaisEtapa,
} from './fluxos'

// ---------------------------------------------------------------------------
// Motor de fluxo — lado servidor (Fase 3).
//
// Faz a ponte entre a logica PURA de src/lib/cards/fluxos.ts e o banco: carrega
// as etapas do fluxo de um card e persiste o avanco (fluxo_etapa_id + status
// canonico + card_status_history). As server actions chamam estes helpers nos
// pontos certos (criacao do card, upload de entrega, etc.).
//
// Robusto a cards sem fluxo: se o tipo nao tem fluxo_id, ou o card nao tem
// etapa, os helpers simplesmente nao fazem nada (o status canonico continua
// mandando). Assim a introducao dos fluxos nao quebra cards/tipos antigos.
// ---------------------------------------------------------------------------

type Cliente = SupabaseClient<Database>

const COLUNAS_ETAPA =
  'id, organization_id, fluxo_id, slug, label, ordem, kind, avanca_por, agente_slug, visivel_cliente, status_canonico, ativo'

/** Etapas ativas de um fluxo, em ordem. */
export async function carregarEtapas(
  supabase: Cliente,
  fluxoId: string,
): Promise<FluxoEtapa[]> {
  const { data } = await supabase
    .from('fluxo_etapas')
    .select(COLUNAS_ETAPA)
    .eq('fluxo_id', fluxoId)
    .eq('ativo', true)
    .order('ordem', { ascending: true })
  return (data ?? []) as FluxoEtapa[]
}

/** Fluxo do tipo de demanda (ou null se o tipo nao aponta para um fluxo). */
async function fluxoIdDoTipo(supabase: Cliente, tipoId: string): Promise<string | null> {
  const { data } = await supabase
    .from('tipos_demanda')
    .select('fluxo_id')
    .eq('id', tipoId)
    .maybeSingle()
  return data?.fluxo_id ?? null
}

/** Primeira etapa do fluxo de um tipo — usada para posicionar o card ao criar. */
export async function etapaInicialDoTipo(
  supabase: Cliente,
  tipoId: string,
): Promise<FluxoEtapa | null> {
  const fluxoId = await fluxoIdDoTipo(supabase, tipoId)
  if (!fluxoId) return null
  const etapas = await carregarEtapas(supabase, fluxoId)
  return etapasOrdenadas(etapas)[0] ?? null
}

/**
 * Aplica o auto-avanco a um card dado um sinal de conclusao. Persiste a nova
 * etapa, o status canonico correspondente e o historico. Devolve a nova etapa,
 * ou `null` se o card nao avancou (sem fluxo, sem etapa, portao humano, sinal
 * que nao casa, ou proxima etapa protegida — a logica pura decide).
 *
 * Best-effort: nunca lanca; em qualquer inconsistencia devolve null e deixa o
 * status canonico como estava.
 */
export async function aplicarAvancoAutomatico(
  supabase: Cliente,
  cardId: string,
  atorId: string,
  sinais: SinaisEtapa,
): Promise<FluxoEtapa | null> {
  const { data: card } = await supabase
    .from('cards')
    .select('organization_id, status, fluxo_etapa_id, tipo_id')
    .eq('id', cardId)
    .maybeSingle()
  if (!card || !card.tipo_id) return null

  const fluxoId = await fluxoIdDoTipo(supabase, card.tipo_id)
  if (!fluxoId) return null

  const etapas = await carregarEtapas(supabase, fluxoId)
  const prox = avancoAutomatico(etapas, card.fluxo_etapa_id, sinais)
  if (!prox) return null

  const { error } = await supabase
    .from('cards')
    .update({ fluxo_etapa_id: prox.id, status: prox.status_canonico })
    .eq('id', cardId)
  if (error) return null

  if (prox.status_canonico !== card.status) {
    await supabase.from('card_status_history').insert({
      organization_id: card.organization_id,
      card_id: cardId,
      status_anterior: card.status,
      status_novo: prox.status_canonico,
      alterado_por: atorId,
    })
  }
  return prox
}
