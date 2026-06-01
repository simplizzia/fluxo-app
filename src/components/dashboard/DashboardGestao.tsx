import Link from 'next/link'
import { Users, AlertTriangle, CheckCircle2, Eye, ArrowRight } from 'lucide-react'
import { buscarKpiGestao } from '@/app/(dashboard)/dashboard/actions'
import { STATUS_CONFIG } from '@/components/shared/StatusChip'
import type { CardResumo } from '@/app/(dashboard)/dashboard/actions'

const PRIORIDADE_DOT: Record<string, string> = {
  urgente: 'bg-red-500',
  alta: 'bg-orange-400',
  normal: 'bg-blue-400',
  baixa: 'bg-zinc-300',
}

export async function DashboardGestao() {
  const { kpi, error } = await buscarKpiGestao()

  if (error || !kpi) {
    return <p className="text-sm text-red-600">{error ?? 'Erro ao carregar dashboard.'}</p>
  }

  const maxTotal = Math.max(...kpi.workloadExecutores.map((e) => e.total), 1)

  return (
    <div className="space-y-6">
      {/* KPIs principais */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Users className="h-4 w-4" />
          </div>
          <p className="font-display text-2xl font-bold text-zinc-900">
            {kpi.workloadExecutores.length}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            Executores ativos
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div
            className={`mb-2 inline-flex h-7 w-7 items-center justify-center rounded-lg ${
              kpi.gargalos.length > 0 ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
          </div>
          <p
            className={`font-display text-2xl font-bold ${
              kpi.gargalos.length > 0 ? 'text-orange-600' : 'text-zinc-900'
            }`}
          >
            {kpi.gargalos.length}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            Gargalos +5 dias
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div
            className={`mb-2 inline-flex h-7 w-7 items-center justify-center rounded-lg ${
              kpi.revisaoInternaFila > 0 ? 'bg-violet-50 text-violet-600' : 'bg-green-50 text-green-600'
            }`}
          >
            <Eye className="h-4 w-4" />
          </div>
          <p className="font-display text-2xl font-bold text-zinc-900">{kpi.revisaoInternaFila}</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            Fila de revisão
          </p>
          <p className="text-[10px] text-zinc-400">cards para aprovação</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Carga dos executores */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-700">
            <Users className="h-4 w-4 text-blue-400" />
            Carga por executor
          </h2>
          {kpi.workloadExecutores.length === 0 ? (
            <p className="text-xs text-zinc-400">Nenhum executor com cards ativos.</p>
          ) : (
            <div className="space-y-3">
              {kpi.workloadExecutores.map((e) => {
                const pct = Math.round((e.total / maxTotal) * 100)
                return (
                  <div key={e.nome}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-zinc-700">{e.nome}</span>
                      <span className="flex items-center gap-1.5 text-zinc-500">
                        {e.total} card{e.total !== 1 ? 's' : ''}
                        {e.urgente > 0 && (
                          <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                            {e.urgente} urg.
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-1.5 rounded-full bg-brand transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <Link
            href="/board"
            className="mt-4 flex items-center gap-1 text-xs font-medium text-brand hover:underline"
          >
            Ver board completo <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Gargalos */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-700">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
            Gargalos — parados +5 dias
          </h2>
          {kpi.gargalos.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              Nenhum card parado há mais de 5 dias.
            </div>
          ) : (
            <div className="space-y-3">
              {kpi.gargalos.map((c) => (
                <GargaloRow key={c.id} card={c} />
              ))}
            </div>
          )}
          {kpi.gargalos.length > 0 && (
            <Link
              href="/board"
              className="mt-4 flex items-center gap-1 text-xs font-medium text-brand hover:underline"
            >
              Ver no board <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-componentes
// ---------------------------------------------------------------------------

function GargaloRow({ card }: { card: CardResumo }) {
  const cfg = STATUS_CONFIG[card.status as keyof typeof STATUS_CONFIG]
  const diasParado = Math.floor(
    (Date.now() - new Date(card.updated_at).getTime()) / (1000 * 60 * 60 * 24),
  )

  return (
    <div className="flex items-start gap-2">
      <div
        className={`mt-1 h-2 w-2 flex-none rounded-full ${PRIORIDADE_DOT[card.prioridade] ?? 'bg-zinc-300'}`}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-zinc-800">{card.titulo}</p>
        <p className="text-[10px] text-zinc-400">
          {card.cliente.nome}
          {card.responsavel && ` · ${card.responsavel.nome}`}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {cfg && (
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg.className}`}>
            {cfg.label}
          </span>
        )}
        <span className="text-[10px] font-medium text-orange-600">{diasParado}d parado</span>
      </div>
    </div>
  )
}
