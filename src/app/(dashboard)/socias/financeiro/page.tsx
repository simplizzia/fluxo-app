import { DollarSign } from 'lucide-react'
import { requirePapel } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import {
  buscarReceitasFinanceiro,
  buscarVisaoGeral,
  buscarDocumentosFinanceiros,
} from './actions'
import { FinanceiroPainel } from './FinanceiroPainel'

export const metadata = { title: 'Módulo Financeiro · Simplizzia' }

export default async function FinanceiroPage() {
  await requirePapel('socia')
  const supabase = await createClient()

  // Busca paralela: receitas + docs + clientes ativos (para dropdowns)
  const [receitas, documentos, { data: clientesRaw }] = await Promise.all([
    buscarReceitasFinanceiro(),
    buscarDocumentosFinanceiros(),
    supabase
      .from('clientes')
      .select('id, nome')
      .eq('status', 'ativo')
      .order('nome')
      .limit(200),
  ])

  const visaoGeral = await buscarVisaoGeral(receitas)

  const clientes = (clientesRaw ?? []) as { id: string; nome: string }[]

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-emerald-600">
          <DollarSign className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-zinc-900">
            Módulo Financeiro
          </h1>
          <p className="text-xs text-zinc-500">
            MRR, receitas recorrentes, inadimplência e documentos
          </p>
        </div>
      </div>

      <FinanceiroPainel
        receitas={receitas}
        visaoGeral={visaoGeral}
        documentos={documentos}
        clientes={clientes}
      />
    </div>
  )
}
