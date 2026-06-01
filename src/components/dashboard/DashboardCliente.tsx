import Link from 'next/link'
import { CheckCircle2, Clock, ArrowRight, BarChart2, Bell } from 'lucide-react'
import { buscarKpiCliente } from '@/app/(dashboard)/dashboard/actions'
import { getCurrentProfile } from '@/lib/dal'
import { STATUS_CONFIG } from '@/components/shared/StatusChip'
import { UsageBarra } from '@/components/plano/UsageBarra'
import { RealtimeRefresher } from './RealtimeRefresher'
import type { CardResumo } from '@/app/(dashboard)/dashboard/actions'

const PRIORIDADE_DOT: Record<string, string> = {
  urgente: 'bg-red-500',
  alta: 'bg-orange-400',
  normal: 'bg-blue-400',
  baixa: 'bg-zinc-300',
}

export async function DashboardCliente() {
  const [{ kpi, error }, profile] = await Promise.all([
    buscarKpiCliente(),
    getCurrentProfile(),
  ])

  if (error || !kpi) {
    return <p className="text-sm text-red-600">{error ?? 'Erro ao carregar dashboard.'}</p>
  }

  return (
    <div className="space-y-6">
      {/* Realtime: atualiza automaticamente quando cards entram/saem de para_aprovacao */}
      <RealtimeRefresher organizationId={profile.organization_id} />

      {/* Para aprovação — seção de destaque */}
      <div
        className={`rounded-2xl border p-5 ${
          kpi.paraAprovacao.length > 0
            ? 'border-violet-200 bg-violet-50'
            : 'border-zinc-200 bg-white'
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
            <Bell
              className={`h-4 w-4 ${kpi.paraAprovacao.length > 0 ? 'text-violet-500' : 'text-zinc-400'}`}
            />
            Aguardando sua aprovação
            {kpi.paraAprovacao.length > 0 && (
              <span className="ml-1 rounded-full bg-violet-600 px-2 py-0.5 text-[11px] font-bold text-white">
                {kpi.paraAprovacao.length}
              </span>
            )}
          </h2>
          <Link
            href="/board"
            className="flex items-center gap-1 text-xs font-medium text-brand hover:underline"
          >
            Ver board <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {kpi.paraAprovacao.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            Nenhum card aguardando sua aprovação no momento.
          </div>
        ) : (
          <div className="space-y-3">
            {kpi.paraAprovacao.map((c) => (
              <AprovacaoRow key={c.id} card={c} />
            ))}
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Clock className="h-4 w-4" />
          </div>
          <p className="font-display text-2xl font-bold text-zinc-900">{kpi.emProducao}</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Em produção</p>
          <p className="text-[10px] text-zinc-400">demandas sendo executadas</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-green-50 text-green-600">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <p className="font-display text-2xl font-bold text-zinc-900">{kpi.concluidosNoMes}</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Entregues no mês</p>
          <p className="text-[10px] text-zinc-400">demandas concluídas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Próximas entregas */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-700">
            <Clock className="h-4 w-4 text-blue-400" />
            Próximas entregas
          </h2>
          {kpi.proximasEntregas.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              Nenhuma entrega prevista nos próximos 7 dias.
            </div>
          ) : (
            <div className="space-y-2.5">
              {kpi.proximasEntregas.map((c) => (
                <EntregaRow key={c.id} card={c} />
              ))}
            </div>
          )}
          <Link
            href="/calendario"
            className="mt-4 flex items-center gap-1 text-xs font-medium text-brand hover:underline"
          >
            Ver calendário <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Uso do plano */}
        {kpi.plano && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-700">
              <BarChart2 className="h-4 w-4 text-brand" />
              Uso do plano este mês
            </h2>
            <div className="mb-4">
              <UsageBarra
                usados={kpi.plano.usados}
                limite={kpi.plano.limite}
                porcentagem={kpi.plano.porcentagem}
                height="md"
              />
            </div>
            <p className="text-xs text-zinc-500">
              Você usou{' '}
              <span className="font-semibold text-zinc-800">{kpi.plano.usados}</span> de{' '}
              <span className="font-semibold text-zinc-800">{kpi.plano.limite}</span> demandas
              disponíveis no plano deste mês.
            </p>
            <Link
              href="/plano"
              className="mt-3 flex items-center gap-1 text-xs font-medium text-brand hover:underline"
            >
              Ver detalhes do plano <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-componentes
// ---------------------------------------------------------------------------

function AprovacaoRow({ card }: { card: CardResumo }) {
  const prazoLabel = card.prazo_cliente
    ? new Date(card.prazo_cliente + 'T00:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
      })
    : null

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-violet-200 bg-white p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-800">{card.titulo}</p>
        <p className="mt-0.5 text-xs text-zinc-500">{card.tipo.nome}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {prazoLabel && (
          <span className="text-[10px] font-medium text-zinc-500">{prazoLabel}</span>
        )}
        <Link
          href="/board"
          className="rounded-lg bg-violet-600 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-violet-700"
        >
          Revisar
        </Link>
      </div>
    </div>
  )
}

function EntregaRow({ card }: { card: CardResumo }) {
  const cfg = STATUS_CONFIG[card.status as keyof typeof STATUS_CONFIG]
  const prazoLabel = card.prazo_cliente
    ? new Date(card.prazo_cliente + 'T00:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
      })
    : null

  return (
    <div className="flex items-start gap-2">
      <div
        className={`mt-1 h-2 w-2 flex-none rounded-full ${PRIORIDADE_DOT[card.prioridade] ?? 'bg-zinc-300'}`}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-zinc-800">{card.titulo}</p>
        <p className="text-[10px] text-zinc-400">{card.tipo.nome}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {cfg && (
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg.className}`}>
            {cfg.label}
          </span>
        )}
        {prazoLabel && (
          <span className="text-[10px] font-medium text-zinc-500">{prazoLabel}</span>
        )}
      </div>
    </div>
  )
}
