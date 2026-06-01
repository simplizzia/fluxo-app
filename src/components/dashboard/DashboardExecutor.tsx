import Link from 'next/link'
import { AlertTriangle, Clock, CheckCircle2, ArrowRight, Zap } from 'lucide-react'
import { buscarKpiExecutor } from '@/app/(dashboard)/dashboard/actions'
import { STATUS_CONFIG } from '@/components/shared/StatusChip'
import type { CardResumo } from '@/app/(dashboard)/dashboard/actions'

const PRIORIDADE_DOT: Record<string, string> = {
  urgente: 'bg-red-500',
  alta: 'bg-orange-400',
  normal: 'bg-blue-400',
  baixa: 'bg-zinc-300',
}

const PRIORIDADE_LABEL: Record<string, string> = {
  urgente: 'Urgente',
  alta: 'Alta',
  normal: 'Normal',
  baixa: 'Baixa',
}

export async function DashboardExecutor() {
  const { kpi, error } = await buscarKpiExecutor()

  if (error || !kpi) {
    return <p className="text-sm text-red-600">{error ?? 'Erro ao carregar dashboard.'}</p>
  }

  const prazoLabel = kpi.proximoPrazo
    ? new Date(kpi.proximoPrazo + 'T00:00:00').toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
      })
    : null

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className={`rounded-2xl border p-4 ${kpi.totalUrgente > 0 ? 'border-red-200 bg-red-50' : 'border-zinc-200 bg-white'}`}>
          <div className={`mb-2 inline-flex h-7 w-7 items-center justify-center rounded-lg ${kpi.totalUrgente > 0 ? 'bg-red-100 text-red-600' : 'bg-zinc-100 text-zinc-500'}`}>
            <Zap className="h-4 w-4" />
          </div>
          <p className={`font-display text-2xl font-bold ${kpi.totalUrgente > 0 ? 'text-red-700' : 'text-zinc-900'}`}>
            {kpi.totalUrgente}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Urgentes</p>
        </div>

        <div className={`rounded-2xl border p-4 ${kpi.totalAlta > 0 ? 'border-orange-200 bg-orange-50' : 'border-zinc-200 bg-white'}`}>
          <div className={`mb-2 inline-flex h-7 w-7 items-center justify-center rounded-lg ${kpi.totalAlta > 0 ? 'bg-orange-100 text-orange-600' : 'bg-zinc-100 text-zinc-500'}`}>
            <AlertTriangle className="h-4 w-4" />
          </div>
          <p className={`font-display text-2xl font-bold ${kpi.totalAlta > 0 ? 'text-orange-700' : 'text-zinc-900'}`}>
            {kpi.totalAlta}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Alta prioridade</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Clock className="h-4 w-4" />
          </div>
          <p className="font-display text-2xl font-bold text-zinc-900">{kpi.totalNormal}</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            Normal / baixa
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          {prazoLabel ? (
            <>
              <p className="font-display text-lg font-bold leading-tight text-zinc-900">{prazoLabel}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                Próximo prazo
              </p>
            </>
          ) : (
            <>
              <p className="font-display text-2xl font-bold leading-tight text-zinc-300">—</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                Sem prazo
              </p>
            </>
          )}
        </div>
      </div>

      {/* Lista de cards */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-700">
          Meus cards ativos —{' '}
          <span className="font-normal text-zinc-500">
            {kpi.meuCards.length} {kpi.meuCards.length === 1 ? 'card' : 'cards'}
          </span>
        </h2>
        {kpi.meuCards.length === 0 ? (
          <div className="flex items-center gap-2 py-6 text-sm text-zinc-400">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            Nenhum card ativo no momento. Aproveite!
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {kpi.meuCards.map((c) => (
              <ExecutorCardRow key={c.id} card={c} />
            ))}
          </div>
        )}
        <Link
          href="/board"
          className="mt-4 flex items-center gap-1 text-xs font-medium text-brand hover:underline"
        >
          Ver board <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-componentes
// ---------------------------------------------------------------------------

function ExecutorCardRow({ card }: { card: CardResumo }) {
  const cfg = STATUS_CONFIG[card.status as keyof typeof STATUS_CONFIG]
  const hoje = new Date().toISOString().split('T')[0]
  const isAtrasado = !!card.prazo_cliente && card.prazo_cliente < hoje
  const prazoLabel = card.prazo_cliente
    ? new Date(card.prazo_cliente + 'T00:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
      })
    : null

  return (
    <div className="flex items-start gap-3 py-3">
      <div
        className={`mt-1.5 h-2 w-2 flex-none rounded-full ${PRIORIDADE_DOT[card.prioridade] ?? 'bg-zinc-300'}`}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-800">{card.titulo}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-zinc-400">
          <span>{card.cliente.nome}</span>
          <span>·</span>
          <span>{card.tipo.nome}</span>
          {(card.prioridade === 'urgente' || card.prioridade === 'alta') && (
            <>
              <span>·</span>
              <span
                className={`font-semibold ${card.prioridade === 'urgente' ? 'text-red-600' : 'text-orange-600'}`}
              >
                {PRIORIDADE_LABEL[card.prioridade]}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {cfg && (
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg.className}`}>
            {cfg.label}
          </span>
        )}
        {prazoLabel && (
          <span
            className={`text-[10px] font-medium ${isAtrasado ? 'text-red-600' : 'text-zinc-400'}`}
          >
            {isAtrasado && '⚠ '}
            {prazoLabel}
          </span>
        )}
      </div>
    </div>
  )
}
