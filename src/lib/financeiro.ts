/**
 * Módulo Financeiro — helpers de cálculo.
 * Trabalha com dados já buscados do banco (agnóstico de Supabase).
 */
import 'server-only'

export interface ReceitaRow {
  id: string
  cliente_id: string | null
  descricao: string
  valor_mensal: number
  ciclo: 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'projeto'
  status: 'pago' | 'pendente' | 'em_atraso'
  data_cobranca_dia: number
  ativo: boolean
  ultima_atualizacao_status: string
  cliente?: { nome: string } | null
}

/** MRR = soma das receitas recorrentes ativas (projetos são excluídos). */
export function calcMRR(receitas: ReceitaRow[]): number {
  return receitas
    .filter((r) => r.ativo && r.ciclo !== 'projeto')
    .reduce((sum, r) => sum + (Number(r.valor_mensal) || 0), 0)
}

/** Receitas em atraso: ativas e com status em_atraso. */
export function receitasEmAtraso(receitas: ReceitaRow[]): ReceitaRow[] {
  return receitas.filter((r) => r.ativo && r.status === 'em_atraso')
}

/** Próximas cobranças no mês corrente (dia de cobrança a partir de hoje). */
export function proximasCobrancas(
  receitas: ReceitaRow[],
  hoje: Date = new Date(),
): ReceitaRow[] {
  const diaHoje = hoje.getDate()
  return receitas
    .filter((r) => r.ativo && r.data_cobranca_dia >= diaHoje)
    .sort((a, b) => a.data_cobranca_dia - b.data_cobranca_dia)
}

/** Formata BRL. */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

/** Primeiro dia do mês dado. */
export function primeiroDiaMes(ano: number, mes: number): Date {
  return new Date(ano, mes - 1, 1)
}

/** Label de competência: "Maio 2026". */
export function labelCompetencia(data: string | Date): string {
  const d = typeof data === 'string' ? new Date(data) : data
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}
