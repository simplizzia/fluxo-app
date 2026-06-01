/**
 * SLA por demanda — helpers de cálculo de prazo.
 * Agnóstico de banco: recebe timestamps e horas, retorna status.
 */

export type SlaStatus = 'ok' | 'atencao' | 'violado'

export interface SlaInfo {
  status: SlaStatus
  horasDecorridas: number
  horasPrazo: number
  percentual: number
}

/**
 * Calcula o status de um SLA com base em um timestamp de início e prazo em horas.
 *
 * - 'atencao': >80% do prazo consumido
 * - 'violado': prazo esgotado
 */
export function calcSla(
  iniciadoEm: string | null | undefined,
  prazoHoras: number | null | undefined,
  agora: Date = new Date(),
): SlaInfo | null {
  if (!iniciadoEm || !prazoHoras || prazoHoras <= 0) return null

  const inicio = new Date(iniciadoEm).getTime()
  const prazoMs = prazoHoras * 60 * 60 * 1000
  const elapsed = agora.getTime() - inicio
  const percentual = elapsed / prazoMs
  const horasDecorridas = Math.max(0, Math.floor(elapsed / (1000 * 60 * 60)))

  let status: SlaStatus
  if (percentual >= 1) status = 'violado'
  else if (percentual >= 0.8) status = 'atencao'
  else status = 'ok'

  return { status, horasDecorridas, horasPrazo: prazoHoras, percentual: Math.min(percentual, 1) }
}

/**
 * Retorna o SLA relevante para um card conforme seu status atual:
 * - a_fazer / aguardando_info: SLA de início (tempo para entrar em produção)
 * - em_andamento: SLA de resposta (tempo para ir para aprovação)
 * - outros status: null (SLA não se aplica)
 */
export function slaParaCard(card: {
  status: string
  created_at: string
  sla_iniciado_em: string | null
  tipo: {
    sla_ativo: boolean
    sla_prazo_inicio_horas: number | null
    sla_prazo_resposta_horas: number | null
  } | null
}): SlaInfo | null {
  const tipo = card.tipo
  if (!tipo?.sla_ativo) return null

  if (card.status === 'a_fazer' || card.status === 'aguardando_info') {
    return calcSla(card.created_at, tipo.sla_prazo_inicio_horas)
  }

  if (card.status === 'em_andamento') {
    return calcSla(card.sla_iniciado_em, tipo.sla_prazo_resposta_horas)
  }

  return null
}

/** Label legível para exibir no badge de SLA. */
export function slaLabel(info: SlaInfo): string {
  const { horasDecorridas, horasPrazo, status } = info
  if (status === 'violado') {
    const atraso = horasDecorridas - horasPrazo
    return atraso > 0 ? `SLA +${atraso}h` : 'SLA violado'
  }
  const restantes = horasPrazo - horasDecorridas
  return `SLA ${restantes}h`
}
