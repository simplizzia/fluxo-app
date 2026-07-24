import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarRange } from 'lucide-react'
import { requirePapel } from '@/lib/dal'
import { listarCronogramas } from './actions'
import { buscarClientesAtivos } from '@/app/(dashboard)/agentes/actions'
import { NovoCronogramaDialog } from './NovoCronogramaDialog'
import { STATUS_CRONOGRAMA_LABEL, STATUS_CRONOGRAMA_COR } from './status-ui'

export const metadata: Metadata = { title: 'Cronogramas — Simplizzia' }

const MES_FMT = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })

function mesLabel(data: string): string {
  // data = 'AAAA-MM-01'; monta como data local para não escorregar de mês.
  const [ano, mes] = data.split('-').map(Number)
  return MES_FMT.format(new Date(ano, mes - 1, 1))
}

export default async function CronogramasPage() {
  await requirePapel('socia', 'gestao', 'atendimento', 'executor')
  const [{ cronogramas }, { clientes }] = await Promise.all([
    listarCronogramas(),
    buscarClientesAtivos(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
            <CalendarRange className="h-6 w-6 text-brand" />
            Cronogramas
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Planejamento editorial por marca. Gere, revise e desmembre em cards.
          </p>
        </div>
        <NovoCronogramaDialog clientes={clientes ?? []} />
      </div>

      {cronogramas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 px-6 py-12 text-center">
          <p className="text-sm text-zinc-500">
            <span className="font-medium text-brand">Izzi</span> · Nenhum cronograma ainda.
            Crie o primeiro escolhendo a marca e o mês.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cronogramas.map((c) => (
            <Link
              key={c.id}
              href={`/cronogramas/${c.id}`}
              className="rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-brand/30 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400">{c.cliente_nome}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CRONOGRAMA_COR[c.status]}`}>
                  {STATUS_CRONOGRAMA_LABEL[c.status]}
                </span>
              </div>
              <p className="mt-1 font-display text-lg font-bold text-ink">{c.marca_nome}</p>
              <p className="text-sm capitalize text-zinc-500">{mesLabel(c.mes_referencia)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
