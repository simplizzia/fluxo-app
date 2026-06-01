import type { Metadata } from 'next'
import Link from 'next/link'
import { Users, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { buscarClientes } from './actions'
import { UsageBarra } from '@/components/plano/UsageBarra'
import { NovoClienteDialog } from './NovoClienteDialog'

export const metadata: Metadata = {
  title: 'Clientes — Simplizzia',
}

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  ativo:     { label: 'Ativo',     className: 'bg-green-100 text-green-700 border-green-200' },
  inativo:   { label: 'Inativo',   className: 'bg-zinc-100 text-zinc-500 border-zinc-200' },
  prospecto: { label: 'Prospecto', className: 'bg-blue-100 text-blue-700 border-blue-200' },
}

function ScoreIcon({ score }: { score: number | null }) {
  if (score == null) return <Minus className="h-3.5 w-3.5 text-zinc-300" />
  if (score >= 70) return <TrendingUp className="h-3.5 w-3.5 text-green-500" />
  if (score >= 40) return <Minus className="h-3.5 w-3.5 text-amber-500" />
  return <TrendingDown className="h-3.5 w-3.5 text-red-500" />
}

export default async function ClientesPage() {
  const { clientes, error } = await buscarClientes()

  if (error) return <p className="text-sm text-red-600">{error}</p>

  const lista = clientes ?? []
  const ativos = lista.filter((c) => c.status === 'ativo')

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
            <Users className="h-6 w-6 text-brand" />
            Clientes
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {ativos.length} ativo{ativos.length !== 1 ? 's' : ''} de {lista.length} no total
          </p>
        </div>
        <NovoClienteDialog />
      </div>

      {/* Lista */}
      {lista.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-10 text-center">
          <p className="text-sm text-zinc-400">Nenhum cliente cadastrado ainda.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <div className="divide-y divide-zinc-100">
            {lista.map((cliente) => {
              const statusCfg = STATUS_LABEL[cliente.status] ?? STATUS_LABEL.inativo
              return (
                <Link
                  key={cliente.id}
                  href={`/clientes/${cliente.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition hover:bg-zinc-50/70"
                >
                  {/* Avatar inicial */}
                  <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-gradient-brand text-sm font-bold text-white">
                    {cliente.nome[0].toUpperCase()}
                  </div>

                  {/* Nome + status */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-zinc-900">{cliente.nome}</span>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusCfg.className}`}>
                        {statusCfg.label}
                      </span>
                    </div>

                    {/* Barra de plano */}
                    {cliente.plano && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="w-28 flex-none">
                          <UsageBarra
                            usados={cliente.plano.usados}
                            limite={cliente.plano.limite}
                            porcentagem={cliente.plano.porcentagem}
                            showLabel={false}
                            height="sm"
                          />
                        </div>
                        <span className="text-[10px] text-zinc-400">
                          {cliente.plano.usados}/{cliente.plano.limite} demandas
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Health score */}
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <div className="flex items-center gap-1">
                      <ScoreIcon score={cliente.scoreAtual} />
                      <span className={`text-sm font-bold ${
                        cliente.scoreAtual == null ? 'text-zinc-300'
                        : cliente.scoreAtual >= 70 ? 'text-green-600'
                        : cliente.scoreAtual >= 40 ? 'text-amber-600'
                        : 'text-red-600'
                      }`}>
                        {cliente.scoreAtual ?? '—'}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400">health score</span>
                  </div>

                  <ChevronRight className="h-4 w-4 flex-none text-zinc-300" />
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
