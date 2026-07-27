// Tipos e mapeamentos do fluxo de cronograma. Fora do arquivo 'use server'
// (que só exporta funções async). Ver spec 2026-07-24-fluxo-cronograma-design.
import type { Database } from '@/types/database'

export type StatusCronograma = Database['public']['Enums']['status_cronograma']
export type ViabilidadeItem = Database['public']['Enums']['viabilidade_item']

// As etapas da cadeia, na ordem. A chave casa com o agente em agent_catalog.
export const ETAPAS = [
  { chave: 'cronograma.briefing', campo: 'briefing', label: 'Briefing' },
  { chave: 'cronograma.temas-pilares', campo: 'temas_pilares', label: 'Temas e Pilares' },
  { chave: 'cronograma.calendario', campo: null, label: 'Calendário' }, // gera os itens
  { chave: 'cronograma.coerencia', campo: 'analise_coerencia', label: 'Análise de Coerência' },
  { chave: 'cronograma.angulos-alternativos', campo: null, label: 'Ângulos Alternativos' },
] as const

export type EtapaChave = (typeof ETAPAS)[number]['chave']

export const VIABILIDADE_LABEL: Record<ViabilidadeItem, string> = {
  proposta: 'Proposta',
  roteiro_a_fechar: 'Roteiro a fechar',
  so_ia: 'Só via IA',
  depende_registro: 'Depende de registro',
}

// Formato do post → slug de tipos_demanda, para o desmembramento criar o card
// certo. Video vira reel (formato de vídeo curto mais próximo).
export const FORMATO_PARA_TIPO_SLUG: Record<string, string> = {
  reel: 'reel',
  carrossel: 'post-carrossel',
  estatico: 'post-feed',
  story: 'story',
  video: 'reel',
}

export interface CronogramaItem {
  id: string
  data_publicacao: string | null
  horario: string | null
  pilar: string | null
  marca_id: string | null
  produto_id: string | null
  formato: string | null
  tema: string | null
  legenda: string | null
  viabilidade: ViabilidadeItem
  pendencia: string | null
  detalhamento: string | null
  ordem: number
  card_id: string | null
}

export interface CronogramaMensagem {
  id: string
  papel: 'equipe' | 'agente'
  conteudo: string
  created_at: string
}

export interface CronogramaResumo {
  id: string
  cliente_id: string
  marca_id: string
  mes_referencia: string
  status: StatusCronograma
  marca_nome: string
  cliente_nome: string
  card_origem_id: string | null
}

// ---------------------------------------------------------------------------
// Parse do calendário devolvido pelo agente — o ponto mais frágil do fluxo.
// O modelo às vezes embrulha o JSON em prosa ou em ```json … ```; extraímos o
// array e validamos. Pura, para ser testável fora do servidor.
// ---------------------------------------------------------------------------

export interface ItemBruto {
  data_publicacao?: string
  horario?: string
  pilar?: string
  sub_marca?: string
  produto?: string
  formato?: string
  tema?: string
  legenda?: string
  viabilidade?: string
  pendencia?: string
  detalhamento?: string
  ordem?: number
}

export function parseCalendario(output: string): ItemBruto[] | null {
  // Pega do primeiro '[' ao último ']' — tolera prosa e cercas de código à volta.
  const inicio = output.indexOf('[')
  const fim = output.lastIndexOf(']')
  if (inicio === -1 || fim === -1 || fim < inicio) return null
  try {
    const arr = JSON.parse(output.slice(inicio, fim + 1))
    return Array.isArray(arr) ? (arr as ItemBruto[]) : null
  } catch {
    return null
  }
}

const VIABILIDADES_VALIDAS = new Set<ViabilidadeItem>([
  'proposta',
  'roteiro_a_fechar',
  'so_ia',
  'depende_registro',
])

/** Normaliza a viabilidade vinda do modelo; desconhecida vira 'proposta'. */
export function normalizarViabilidade(v: string | undefined): ViabilidadeItem {
  return v && VIABILIDADES_VALIDAS.has(v as ViabilidadeItem) ? (v as ViabilidadeItem) : 'proposta'
}

// A demanda "Calendário Editorial" é o gatilho do cronograma: o card guarda o
// mês no campo mes_referencia (input tipo month, formato "AAAA-MM").
export const SLUG_DEMANDA_CRONOGRAMA = 'calendario-editorial'

/**
 * Converte o mês do card ("AAAA-MM") para a data de referência do cronograma
 * ("AAAA-MM-01"). Devolve null se não for um mês válido. Pura, para testar.
 */
export function mesReferenciaParaData(mesYYYYMM: string | null | undefined): string | null {
  if (!mesYYYYMM) return null
  const m = mesYYYYMM.trim().match(/^(\d{4})-(\d{2})$/)
  if (!m) return null
  const mes = Number(m[2])
  if (mes < 1 || mes > 12) return null
  return `${m[1]}-${m[2]}-01`
}
