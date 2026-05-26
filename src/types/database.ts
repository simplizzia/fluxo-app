/**
 * Tipos do banco de dados Supabase.
 *
 * Este arquivo será SUBSTITUÍDO pelos tipos gerados automaticamente pelo CLI:
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 *
 * Por enquanto, exporta um tipo Database genérico para o projeto compilar.
 * Após conectar o Supabase, rodar o comando acima para gerar os tipos reais.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any

// ---------------------------------------------------------------------------
// Tipos manuais de conveniência (usados antes da geração automática)
// ---------------------------------------------------------------------------

export type PapelUsuario = 'socia' | 'gestao' | 'atendimento' | 'executor' | 'cliente'
export type SubPapelContato = 'responsavel' | 'colaborador' | 'observador'

export type StatusCard =
  | 'aguardando_info'
  | 'a_fazer'
  | 'em_andamento'
  | 'para_aprovacao'
  | 'necessita_ajustes'
  | 'concluido'
  | 'cancelado'

export type PrioridadeCard = 'urgente' | 'alta' | 'normal' | 'baixa'

export type CategoriaDemanda =
  | 'redes_sociais'
  | 'estrategia'
  | 'embalagem'
  | 'video'
  | 'trafego'
  | 'linkedin'
  | 'email'
  | 'apresentacao'
  | 'relatorio'
  | 'outros'

export type StatusCliente = 'ativo' | 'inativo' | 'prospecto'

export type StageProspect =
  | 'prospeccao'
  | 'reuniao_agendada'
  | 'reuniao_realizada'
  | 'proposta_enviada'
  | 'negociacao'
  | 'contrato_assinado'
  | 'cliente_ativo'
  | 'perdido'

// ---------------------------------------------------------------------------
// Interfaces de entidades principais
// ---------------------------------------------------------------------------

export interface Profile {
  id: string
  user_id: string
  organization_id: string
  papel: PapelUsuario
  nome: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Cliente {
  id: string
  organization_id: string
  nome: string
  slug: string
  logo_url: string | null
  status: StatusCliente
  data_inativacao: string | null
  created_at: string
  updated_at: string
}

export interface Card {
  id: string
  organization_id: string
  cliente_id: string
  tipo_id: string
  responsavel_id: string | null
  criado_por: string
  status: StatusCard
  prioridade: PrioridadeCard
  titulo: string
  confidencial: boolean
  prazo_cliente: string | null
  prazo_interno: string | null
  data_publicacao: string | null
  campos_publicos: Record<string, unknown>
  campos_internos: Record<string, unknown>
  rodadas_revisao: number
  versao_entrega_atual: number | null
  motivo_cancelamento: string | null
  created_at: string
  updated_at: string
}

export interface TipoDemanda {
  id: string
  organization_id: string
  nome: string
  slug: string
  categoria: CategoriaDemanda
  tem_publicacao: boolean
  fluxo_aprovacao_duplo: boolean
  campos_formulario: CampoFormulario[]
  ativo: boolean
  agente_slug: string | null
  created_at: string
  updated_at: string
}

export interface CampoFormulario {
  nome: string
  tipo: 'text' | 'textarea' | 'number' | 'select' | 'files' | 'date' | 'month' | 'boolean'
  obrigatorio: boolean
  visivel_para_cliente: boolean
  placeholder?: string
  opcoes?: string[]  // para tipo 'select'
}

export interface Organizacao {
  id: string
  nome: string
  slug: string
  logo_url: string | null
  cor_primaria: string
  assistente_nome: string
  plano_saas: 'interno' | 'starter' | 'pro' | 'enterprise'
  created_at: string
  updated_at: string
}
