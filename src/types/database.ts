// ---------------------------------------------------------------------------
// Tipos do banco — ponto de importação único da aplicação (`@/types/database`).
//
// O schema em si é gerado por `npm run db:types` em ./database.generated.ts,
// que NUNCA deve ser editado à mão. Este arquivo re-exporta tudo de lá e
// acrescenta os apelidos e tipos de aplicação abaixo.
//
// Antes desta separação os apelidos viviam no fim do arquivo gerado, com um
// comentário pedindo que fossem "recolados após cada db:types". A primeira
// regeneração os apagou e quebrou 10 arquivos. Agora regenerar é seguro.
// ---------------------------------------------------------------------------

export * from './database.generated'

import type { Database } from './database.generated'

export type StatusCard = Database['public']['Enums']['status_card']
export type PrioridadeCard = Database['public']['Enums']['prioridade_card']
export type PapelUsuario = Database['public']['Enums']['papel_usuario']
export type TipoArquivo = Database['public']['Enums']['tipo_arquivo']

export interface CampoFormulario {
  nome: string
  tipo:
    | 'text'
    | 'textarea'
    | 'number'
    | 'date'
    | 'select'
    | 'checkbox'
    | 'file'
    | 'files'
    | 'month'
    | 'boolean'
  obrigatorio: boolean
  visivel_para_cliente?: boolean
  placeholder?: string
  opcoes?: string[]
  rotulo?: string
}

export interface Comentario {
  id: string
  card_id: string
  autor_id: string
  organization_id: string
  texto: string
  visivel_para_cliente: boolean
  created_at: string
  autor?: {
    nome: string
    avatar_url: string | null
    papel?: PapelUsuario
  } | null
}
