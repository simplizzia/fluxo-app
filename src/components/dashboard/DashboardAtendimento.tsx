import Link from 'next/link'
import { Clock, CheckCircle2, AlertTriangle, ArrowRight, BarChart2, FileCheck } from 'lucide-react'
import { buscarKpiAtendimento } from '@/app/(dashboard)/dashboard/actions'
import { STATUS_CONFIG } from '@/components/shared/StatusChip'
import { UsageBarra } from '@/components/plano/UsageBarra'
import type { CardResumo } from '@/app/(dashboard)/dashboard/actions'

const PRIORIDADE_DOT: Record<string, string> = {
  urgente: 'bg-red-500',
  alta: 'bg-orange-400',
  normal: 'bg-blue-400',
  baixa: 'bg-zinc-300',
}

export async function DashboardAtendimento() {
  const { kpi, error } = await buscarKpiAtendimento()

  if (error || !kpi) {
    return <p className="text-sm text-red-600">{error ?? 'Erro ao carregar dashboard.'}</p>
  }

  return (
    <div className="space-y-6">
      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiMini
          label="Triagem"
          value={kpi.triagem.length}
          sub="aguardando informações"
          cor={kpi.triagem.length === 0 ? 'green' : kpi.triagem.length <= 3 ? 'amber' : 'red'}
        />
        <KpiMini
          label="Para aprovação"
          value={kpi.aprovacoesPendentes.length}
          sub="aguardando cliente"
          cor={kpi.aprovacoesPendentes.length === 0 ? 'green' : 'violet'}
        />
        <KpiMini
          label="Prazo 7 dias"
          value={kpi.proximasEntregas.length}
          sub="entregas próximas"
          cor={kpi.proximasEntregas.length === 0 ? 'green' : 'amber'}
        />
        <KpiMini
          label="Alerta plano"
          value={kpi.clientesEmAlerta.length}
          sub="clientes ≥80%"
          cor={kpi.clientesEmAlerta.length === 0 ? 'green' : 'red'}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Triagem */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-700">
            <Clock className="h-4 w-4 text-amber-400" />
            Triagem — aguardando info
          </h2>
          {kpi.triagem.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              Nenhum card aguardando informações.
            </div>
          ) : (
            <div className="space-y-2.5">
              {kpi.triagem.map((c) => (
                <CardMiniRow key={c.id} card={c} showAge />
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

        {/* Aprovações pendentes */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-700">
            <FileCheck className="h-4 w-4 text-violet-400" />
            Para aprovação
          </h2>
          {kpi.aprovacoesPendentes.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              Nenhum card aguardando aprovação.
            </div>
          ) : (
            <div className="space-y-2.5">
              {kpi.aprovacoesPendentes.map((c) => (
                <CardMiniRow key={c.id} card={c} showAge />
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

        {/* Próximas entregas */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-700">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
            Entregas nos próximos 7 dias
          </h2>
          {kpi.proximasEntregas.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              Nenhuma entrega prevista nos próximos 7 dias.
            </div>
          ) : (
            <div className="space-y-2.5">
              {kpi.proximasEntregas.map((c) => (
                <CardMiniRow key={c.id} card={c} showPrazo />
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

        {/* Clientes em alerta */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-700">
            <BarChart2 className="h-4 w-4 text-orange-400" />
            Alerta de plano
          </h2>
          {kpi.clientesEmAlerta.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              Todos os clientes dentro do limite.
            </div>
          ) : (
            <div className="space-y-3">
              {kpi.clientesEmAlerta.slice(0, 5).map((c) => (
                <div key={c.clienteNome}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="truncate font-medium text-zinc-700">{c.clienteNome}</span>
                    <span
                      className={`flex-none font-semibold ${c.porcentagem >= 100 ? 'text-red-600' : 'text-orange-600'}`}
                    >
                      {c.porcentagem}%
                    </span>
                  </div>
                  <UsageBarra
                    usados={c.usados}
                    limite={c.limite}
                    porcentagem={c.porcentagem}
                    showLabel={false}
                    height="sm"
                  />
                </div>
              ))}
            </div>
          )}
          <Link
            href="/plano"
            className="mt-4 flex items-center gap-1 text-xs font-medium text-brand hover:underline"
          >
            Ver planos <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-componentes
// ---------------------------------------------------------------------------

const COR_MAP = {
  green: 'text-green-700 bg-green-50',
  amber: 'text-amber-700 bg-amber-50',
  red: 'text-red-700 bg-red-50',
  violet: 'text-violet-700 bg-violet-50',
} as const

function KpiMini({
  label,
  value,
  sub,
  cor,
}: {
  label: string
  value: number
  sub: string
  cor: keyof typeof COR_MAP
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <p className={`font-display text-2xl font-bold ${value > 0 && cor !== 'green' ? COR_MAP[cor].split(' ')[0] : 'text-zinc-900'}`}>
        {value}
      </p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="text-[10px] text-zinc-400">{sub}</p>
    </div>
  )
}

function CardMiniRow({
  card,
  showAge,
  showPrazo,
}: {
  card: CardResumo
  showAge?: boolean
  showPrazo?: boolean
}) {
  const cfg = STATUS_CONFIG[card.status as keyof typeof STATUS_CONFIG]
  const ageDays = Math.floor(
    (Date.now() - new Date(card.created_at).getTime()) / (1000 * 60 * 60 * 24),
  )
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
        {showAge && (
          <span className="text-[10px] text-zinc-400">{ageDays}d</span>
        )}
        {showPrazo && prazoLabel && (
          <span className="text-[10px] font-medium text-orange-600">{prazoLabel}</span>
        )}
      </div>
    </div>
  )
}
