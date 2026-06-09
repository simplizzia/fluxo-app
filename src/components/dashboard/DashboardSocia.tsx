import Link from 'next/link'
import {
  TrendingUp, AlertTriangle, CheckCircle2, Clock,
  BarChart2, RefreshCw, ArrowRight, Users, Heart,
} from 'lucide-react'
import { buscarKpiSocia, type MrrMes } from '@/app/(dashboard)/dashboard/actions'
import { buscarDadosCS } from '@/app/(dashboard)/cs/actions'
import { UsageBarra } from '@/components/plano/UsageBarra'
import { STATUS_CONFIG } from '@/components/shared/StatusChip'
import { ScoreChip } from '@/components/cs/ScoreBadge'
import type { StatusCard } from '@/types/database'

const MESES_PT = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
]

function mesAtual() {
  const d = new Date()
  return `${MESES_PT[d.getMonth()]} ${d.getFullYear()}`
}

export async function DashboardSocia() {
  const [{ kpi, error }, { alertas: alertasCS, clientes: clientesCS }] = await Promise.all([
    buscarKpiSocia(),
    buscarDadosCS(),
  ])

  if (error || !kpi) {
    return <p className="text-sm text-red-600">{error ?? 'Erro ao carregar dashboard.'}</p>
  }

  const statusOrdem: StatusCard[] = ['aguardando_info', 'a_fazer', 'em_andamento', 'para_aprovacao', 'necessita_ajustes']
  const alertasAltos = (alertasCS ?? []).filter((a) => a.severidade === 'alta')
  const clientesEmRisco = (clientesCS ?? []).filter((c) => c.scoreAtual != null && c.scoreAtual < 40)

  return (
    <div className="space-y-6">
      {/* Alertas de CS em destaque */}
      {alertasAltos.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-red-800">
              <Heart className="h-4 w-4" />
              {alertasAltos.length} alerta{alertasAltos.length > 1 ? 's' : ''} de Customer Success
            </h2>
            <Link href="/cs" className="flex items-center gap-1 text-xs font-medium text-red-700 hover:underline">
              Ver todos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <ul className="space-y-1.5">
            {alertasAltos.slice(0, 3).map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-red-700">
                <AlertTriangle className="mt-0.5 h-3 w-3 flex-none" />
                <span>
                  <span className="font-semibold">{a.clienteNome}</span>
                  {' — '}
                  {a.descricao}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* MRR Atual + Gráfico de Evolução */}
      {(kpi.mrrAtual > 0 || kpi.mrrHistorico.length > 0) && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
              <BarChart2 className="h-4 w-4 text-brand" />
              MRR — Receita Recorrente Mensal
            </h2>
            {kpi.mrrAtual > 0 && (
              <span className="text-xl font-bold text-zinc-900">
                {kpi.mrrAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}
              </span>
            )}
          </div>
          {kpi.mrrHistorico.length > 0 ? (
            <MrrChart historico={kpi.mrrHistorico} />
          ) : (
            <p className="text-xs text-zinc-400">
              O gráfico de evolução aparece após o primeiro snapshot mensal (cron no dia 1).
            </p>
          )}
        </div>
      )}

      {/* KPIs principais */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label={`Entregues em ${mesAtual()}`}
          value={kpi.concluidosNoMes}
          sub="cards concluídos"
          icon={<CheckCircle2 className="h-4 w-4" />}
          cor="green"
        />
        <KpiCard
          label="Taxa no prazo"
          value={`${kpi.taxaNoProazo}%`}
          sub="entregas dentro do prazo"
          icon={<TrendingUp className="h-4 w-4" />}
          cor={kpi.taxaNoProazo >= 80 ? 'green' : kpi.taxaNoProazo >= 60 ? 'amber' : 'red'}
        />
        <KpiCard
          label="Rodadas médias"
          value={kpi.rodadasMedias.toFixed(1)}
          sub="revisões por entrega"
          icon={<RefreshCw className="h-4 w-4" />}
          cor={kpi.rodadasMedias <= 1.5 ? 'green' : kpi.rodadasMedias <= 2.5 ? 'amber' : 'red'}
        />
        <KpiCard
          label="Atrasados"
          value={kpi.cardsAtrasados}
          sub="prazo vencido, não entregues"
          icon={<AlertTriangle className="h-4 w-4" />}
          cor={kpi.cardsAtrasados === 0 ? 'green' : kpi.cardsAtrasados <= 3 ? 'amber' : 'red'}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Distribuição por status */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-700">
            Board agora — {kpi.totalAtivos} ativas
          </h2>
          <div className="space-y-2">
            {statusOrdem.map((s) => {
              const qtd = kpi.distribuicao[s] ?? 0
              const pct = kpi.totalAtivos > 0 ? Math.round((qtd / kpi.totalAtivos) * 100) : 0
              const { label, className } = STATUS_CONFIG[s]
              return (
                <div key={s} className="flex items-center gap-2">
                  <span className={`flex-none rounded-full border px-2 py-0.5 text-[10px] font-medium ${className}`}>
                    {label}
                  </span>
                  <div className="flex-1 overflow-hidden rounded-full bg-zinc-100 h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-brand transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-5 flex-none text-right text-xs font-semibold text-zinc-600">{qtd}</span>
                </div>
              )
            })}
          </div>
          <Link
            href="/board"
            className="mt-4 flex items-center gap-1 text-xs font-medium text-brand hover:underline"
          >
            Abrir board <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Top clientes por retrabalho */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-700">
            <RefreshCw className="h-4 w-4 text-orange-400" />
            Retrabalho em {mesAtual()}
          </h2>
          {kpi.topClientesRetrabalho.length === 0 ? (
            <p className="text-xs text-zinc-400">Nenhum card concluído este mês ainda.</p>
          ) : (
            <div className="space-y-3">
              {kpi.topClientesRetrabalho.map((c) => (
                <div key={c.clienteNome} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-zinc-800">{c.clienteNome}</p>
                    <p className="text-[10px] text-zinc-400">{c.cards} card{c.cards !== 1 ? 's' : ''} entregue{c.cards !== 1 ? 's' : ''}</p>
                  </div>
                  <span
                    className={`flex-none rounded-full px-2 py-0.5 text-xs font-semibold ${
                      c.rodadasMedia <= 1 ? 'bg-green-100 text-green-700'
                      : c.rodadasMedia <= 2 ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {c.rodadasMedia.toFixed(1)}x
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clientes em alerta de plano */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-700">
            <BarChart2 className="h-4 w-4 text-orange-400" />
            Alerta de plano
          </h2>
          {kpi.clientesEmAlerta.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              Todos os clientes dentro do limite
            </div>
          ) : (
            <div className="space-y-3">
              {kpi.clientesEmAlerta.slice(0, 5).map((c) => (
                <div key={c.clienteNome}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-700 truncate">{c.clienteNome}</span>
                    <span className={`font-semibold flex-none ${c.porcentagem >= 100 ? 'text-red-600' : 'text-orange-600'}`}>
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
            Ver todos os planos <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Health Score resumido */}
      {(clientesCS ?? []).length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
              <Heart className="h-4 w-4 text-brand" />
              Saúde dos clientes
            </h2>
            <Link href="/cs" className="flex items-center gap-1 text-xs font-medium text-brand hover:underline">
              Ver detalhe <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {(clientesCS ?? []).slice(0, 6).map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3">
                <p className="min-w-0 flex-1 truncate text-xs font-medium text-zinc-700">{c.nome}</p>
                <div className="flex items-center gap-2">
                  {c.scoreAtual != null && (
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          c.scoreAtual >= 70 ? 'bg-green-500'
                          : c.scoreAtual >= 40 ? 'bg-amber-400'
                          : 'bg-red-500'
                        }`}
                        style={{ width: `${c.scoreAtual}%` }}
                      />
                    </div>
                  )}
                  <ScoreChip score={c.scoreAtual} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Links rápidos */}
      <div className="flex flex-wrap gap-3">
        <QuickLink href="/board" label="Board" icon={<Clock className="h-3.5 w-3.5" />} />
        <QuickLink href="/calendario" label="Calendário" icon={<Clock className="h-3.5 w-3.5" />} />
        <QuickLink href="/plano" label="Uso do Plano" icon={<BarChart2 className="h-3.5 w-3.5" />} />
        <QuickLink href="/clientes" label="Clientes" icon={<Users className="h-3.5 w-3.5" />} />
        <QuickLink href="/cs" label="Customer Success" icon={<Heart className="h-3.5 w-3.5" />} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-componentes
// ---------------------------------------------------------------------------

function MrrChart({ historico }: { historico: MrrMes[] }) {
  const max = Math.max(...historico.map((h) => h.mrr), 1)
  const mesesPt = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

  return (
    <div className="space-y-1">
      {/* Área das barras — altura fixa, barras crescem do bottom */}
      <div className="flex items-end gap-2 h-20">
        {historico.map((h) => {
          const pct = Math.max(Math.round((h.mrr / max) * 100), 6)
          return (
            <div
              key={h.mes}
              className="flex-1 rounded-t-md bg-brand/50 transition-all"
              style={{ height: `${pct}%` }}
              title={h.mrr.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            />
          )
        })}
      </div>
      {/* Labels de mês */}
      <div className="flex gap-2">
        {historico.map((h) => {
          const mesIdx = parseInt(h.mes.split('-')[1], 10) - 1
          return (
            <span key={h.mes} className="flex-1 text-center text-[10px] text-zinc-400">
              {mesesPt[mesIdx]}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  icon,
  cor,
}: {
  label: string
  value: string | number
  sub: string
  icon: React.ReactNode
  cor: 'green' | 'amber' | 'red' | 'blue'
}) {
  const corClasses = {
    green: 'text-green-600 bg-green-50',
    amber: 'text-amber-600 bg-amber-50',
    red: 'text-red-600 bg-red-50',
    blue: 'text-blue-600 bg-blue-50',
  }
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className={`mb-2 inline-flex h-7 w-7 items-center justify-center rounded-lg ${corClasses[cor]}`}>
        {icon}
      </div>
      <p className="font-display text-2xl font-bold text-zinc-900">{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="text-[10px] text-zinc-400">{sub}</p>
    </div>
  )
}

function QuickLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-medium text-zinc-600 transition hover:border-brand/30 hover:bg-brand-light hover:text-brand"
    >
      {icon}
      {label}
    </Link>
  )
}
