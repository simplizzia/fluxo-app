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
}
