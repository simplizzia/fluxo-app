import type { StatusCard } from '@/types/database'

// ---------------------------------------------------------------------------
// Camada de FLUXO (Fase 2 do redesenho do Kanban).
//
// O status canonico (status.ts) continua sendo a fonte para RLS, para a regra
// dura e para as colunas do board. Esta camada e ADITIVA: descreve a etapa fina
// em que o card esta dentro do fluxo da sua familia de demanda, e responde
// "qual a proxima etapa" e "o card deve andar sozinho agora?".
//
// As definicoes vivem no banco (tabelas fluxos / fluxo_etapas, migration
// 20260806000001_fluxos.sql). Estes helpers sao PUROS: recebem a definicao ja
// carregada e nao tocam o banco — assim servem Server e Client Components com a
// mesma logica, do mesmo jeito que status.ts.
//
// Tipos escritos a mao (e nao derivados de database.generated) porque o gerado
// so tera as tabelas novas apos `db:push` + `db:types`. Quando regenerar, dá
// para trocar por Database['public']['Tables'][...] sem mudar os helpers.
// ---------------------------------------------------------------------------

export type KindEtapa = 'execucao' | 'agente' | 'portao_humano' | 'terminal'

export type GatilhoAvanco =
  | 'checklist'
  | 'arquivo_entrega'
  | 'agente_ok'
  | 'cron_data_cliente'
  | 'manual'
  | 'nenhum'

export type EsforcoTipico = 'baixo' | 'medio' | 'alto'

export interface Fluxo {
  id: string
  organization_id: string
  slug: string
  nome: string
  descricao: string | null
  esforco_tipico: EsforcoTipico
  /** Familia de risco: exige aprovacao interna dupla. */
  aprovacao_dupla: boolean
  ativo: boolean
}

export interface FluxoEtapa {
  id: string
  organization_id: string
  fluxo_id: string
  slug: string
  label: string
  ordem: number
  kind: KindEtapa
  avanca_por: GatilhoAvanco
  /**
   * Agente da etapa. Em `kind === 'agente'` ele GATEIA (passa → avanca,
   * reprova → necessita_ajustes). Em outras kinds e ASSISTIVO
   * (pre-desenvolvimento): roda na entrada e apenas rascunha, sem gatear.
   */
  agente_slug: string | null
  visivel_cliente: boolean
  status_canonico: StatusCard
  ativo: boolean
}

/** Sinais de conclusao observados no card, para decidir o auto-avanco. */
export interface SinaisEtapa {
  checklistCompleto?: boolean
  arquivoEntregue?: boolean
  agenteAprovou?: boolean
}

/** Etapas ativas do fluxo, em ordem. */
export function etapasOrdenadas(etapas: readonly FluxoEtapa[]): FluxoEtapa[] {
  return etapas
    .filter((e) => e.ativo)
    .slice()
    .sort((a, b) => a.ordem - b.ordem)
}

export function etapaPorId(
  etapas: readonly FluxoEtapa[],
  etapaId: string | null | undefined,
): FluxoEtapa | null {
  if (!etapaId) return null
  return etapas.find((e) => e.id === etapaId) ?? null
}

export function etapaPorSlug(
  etapas: readonly FluxoEtapa[],
  slug: string,
): FluxoEtapa | null {
  return etapas.find((e) => e.slug === slug) ?? null
}

/** Proxima etapa do fluxo (por ordem), ou `null` se a atual for a ultima. */
export function proximaEtapa(
  etapas: readonly FluxoEtapa[],
  etapaAtualId: string | null | undefined,
): FluxoEtapa | null {
  const ordenadas = etapasOrdenadas(etapas)
  if (ordenadas.length === 0) return null

  const atual = etapaPorId(ordenadas, etapaAtualId)
  // Sem etapa atual: o fluxo comeca na primeira.
  if (!atual) return ordenadas[0] ?? null

  const idx = ordenadas.findIndex((e) => e.id === atual.id)
  return ordenadas[idx + 1] ?? null
}

export function isPortaoHumano(etapa: FluxoEtapa): boolean {
  return etapa.kind === 'portao_humano'
}

export function isTerminal(etapa: FluxoEtapa): boolean {
  return etapa.kind === 'terminal'
}

/** Etapa de agente que GATEIA o avanco (roda IA e decide passar/ajustar). */
export function isAgenteGate(etapa: FluxoEtapa): boolean {
  return etapa.kind === 'agente'
}

/**
 * Agente assistivo (pre-desenvolvimento): a etapa nao e do tipo `agente`, mas
 * tem um agente para rodar na entrada e rascunhar. Nao gateia o avanco.
 */
export function temAgenteAssistivo(etapa: FluxoEtapa): boolean {
  return etapa.kind !== 'agente' && etapa.agente_slug != null
}

/**
 * O card deve avancar sozinho AGORA, dados os sinais?
 *
 * Nunca cruza um portao humano nem um envio agendado (`cron_data_cliente`) —
 * esses sao acionados por acao humana ou pelo pg_cron, jamais por sinal de
 * conclusao. Preserva a regra dura (para_aprovacao/concluido nunca automaticos
 * por aqui). Consumido na Fase 3 (auto-avanco).
 */
export function deveAutoAvancar(etapa: FluxoEtapa, sinais: SinaisEtapa): boolean {
  switch (etapa.avanca_por) {
    case 'checklist':
      return sinais.checklistCompleto === true
    case 'arquivo_entrega':
      return sinais.arquivoEntregue === true
    case 'agente_ok':
      return sinais.agenteAprovou === true
    case 'manual':
    case 'cron_data_cliente':
    case 'nenhum':
      return false
  }
}

/**
 * Rotulo de "proxima acao" para exibir no card ("de quem e a bola") — combate o
 * "os parceiros nao sabem mover o card". Consumido na Fase 4 (UI).
 */
export function proximaAcaoLabel(etapa: FluxoEtapa | null): string {
  if (!etapa) return 'Sem fluxo definido'
  switch (etapa.kind) {
    case 'portao_humano':
      return `Aguardando: ${etapa.label}`
    case 'agente':
      return `Revisao IA em andamento: ${etapa.label}`
    case 'execucao':
      return `Em produção: ${etapa.label}`
    case 'terminal':
      return etapa.label
  }
}

// ---------------------------------------------------------------------------
// Motor de avanco (Fase 3) — logica PURA. As server actions carregam o card +
// as etapas do seu fluxo e chamam estas funcoes; a persistencia (status,
// fluxo_etapa_id, card_status_history, executarAgente, pg_cron) fica na action.
// ---------------------------------------------------------------------------

/**
 * Status canonicos que a regra dura do projeto protege: nunca sao alcancados
 * por auto-avanco nem por arraste — so por acao dedicada (enviar para
 * aprovacao, aprovar, cancelar). Espelha os PROTEGIDOS de status.ts.
 */
const STATUS_PROTEGIDOS: readonly StatusCard[] = [
  'para_aprovacao',
  'concluido',
  'cancelado',
]

export function statusProtegido(status: StatusCard): boolean {
  return STATUS_PROTEGIDOS.includes(status)
}

/**
 * O card deve avancar AGORA por conta de um sinal de conclusao? Devolve a
 * proxima etapa, ou `null` para ficar onde esta.
 *
 * Garantias (a "regra dura" no nivel do fluxo):
 *   - nunca avanca a partir de um portao humano ou de um terminal;
 *   - so avanca se o gatilho da etapa atual foi satisfeito (deveAutoAvancar);
 *   - NUNCA entra por sinal num status canonico protegido — mesmo que a
 *     proxima etapa seja `para_aprovacao`/`concluido`/`cancelado`, ela exige
 *     acao dedicada. (O envio ao cliente e via pg_cron; a aprovacao, via acao.)
 */
export function avancoAutomatico(
  etapas: readonly FluxoEtapa[],
  etapaAtualId: string | null | undefined,
  sinais: SinaisEtapa,
): FluxoEtapa | null {
  const atual = etapaPorId(etapas, etapaAtualId)
  if (!atual) return null
  if (isPortaoHumano(atual) || isTerminal(atual)) return null
  if (!deveAutoAvancar(atual, sinais)) return null

  const prox = proximaEtapa(etapas, atual.id)
  if (!prox) return null
  if (statusProtegido(prox.status_canonico)) return null
  return prox
}

/** Resultado de uma etapa de agente que gateia o avanco. */
export type ResultadoAgente =
  | { tipo: 'avancar'; etapa: FluxoEtapa }
  | { tipo: 'ajustes' }
  | { tipo: 'nada' }

/**
 * Resolve uma etapa `kind === 'agente'` depois que o agente rodou.
 *   aprovado  -> avanca para a proxima etapa (nao-protegida);
 *   reprovado -> `ajustes` (a action seta status = necessita_ajustes + comentario);
 *   etapa nao e de agente, ou sem proxima -> `nada`.
 */
export function resolveAgente(
  etapas: readonly FluxoEtapa[],
  etapaAtualId: string | null | undefined,
  aprovado: boolean,
): ResultadoAgente {
  const atual = etapaPorId(etapas, etapaAtualId)
  if (!atual || !isAgenteGate(atual)) return { tipo: 'nada' }
  if (!aprovado) return { tipo: 'ajustes' }

  const prox = proximaEtapa(etapas, atual.id)
  if (!prox || statusProtegido(prox.status_canonico)) return { tipo: 'nada' }
  return { tipo: 'avancar', etapa: prox }
}

/**
 * Proxima etapa quando um humano conclui um portao (ex.: "Aprovar
 * internamente"). Devolve `null` se a etapa atual nao for um portao. A action
 * decide o que fazer se a proxima cair num status protegido (ex.: agendar o
 * envio, em vez de transicionar direto).
 */
export function avancarPortao(
  etapas: readonly FluxoEtapa[],
  etapaAtualId: string | null | undefined,
): FluxoEtapa | null {
  const atual = etapaPorId(etapas, etapaAtualId)
  if (!atual || !isPortaoHumano(atual)) return null
  return proximaEtapa(etapas, atual.id)
}
