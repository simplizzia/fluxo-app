// Tipos e rótulos de produtos. Vive fora do arquivo 'use server' porque um
// módulo de Server Actions só pode exportar funções async.
import type { Database } from '@/types/database'

export type StatusProduto = Database['public']['Enums']['status_produto']

export interface Produto {
  id: string
  nome: string
  sku: string | null
  sabor: string | null
  categoria: string | null
  status: StatusProduto
  publico: string | null
  observacoes: string | null
}

export const STATUS_PRODUTO_LABEL: Record<StatusProduto, string> = {
  ativo: 'Ativo',
  nao_lancado: 'Não lançado',
  producao_incerta: 'Produção incerta',
  descontinuado: 'Descontinuado',
  fora_de_escopo: 'Fora de escopo',
}
