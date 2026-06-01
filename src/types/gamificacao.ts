// Tipos compartilhados de Gamificação
// Importável em Client Components e Server Components sem restrição.

export interface Badge {
  id: string
  nome: string
  descricao: string
  icone: string
  tipo: 'colaborador' | 'cliente'
  criterios: Record<string, unknown>
  beneficio_descricao: string | null
  ativo: boolean
}

export interface BadgeConquistado {
  id: string
  badge_id: string
  conquistado_em: string
  card_id: string | null
  badge?: Badge
}

export interface PontuacaoMensal {
  usuario_id: string
  mes_referencia: string
  pontos: number
  detalhes: { badge: string; pontos: number; icone?: string }[]
}

export interface RankingEntry {
  usuario_id: string
  nome: string
  pontos: number
  badges_mes: number
}
