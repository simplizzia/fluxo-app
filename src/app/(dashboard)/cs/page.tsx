import type { Metadata } from 'next'
import Link from 'next/link'
import {
  AlertTriangle, ArrowRight, CheckCircle2, Heart,
  TrendingUp, TrendingDown, RefreshCw, Clock, BarChart2,
} from 'lucide-react'
import { buscarDadosCS } from './actions'
import { ScoreBadge, ScoreChip, ScoreTendencia, ScoreSparkline } from '@/components/cs/ScoreBadge'
import type { ClienteHealthData, AlertaCS } from './actions'

export const metadata: Metadata = {
  title: 'Customer Success — Simplizzia',
}

export default async function CSPage() {
  const { clientes, alertas, error } = await buscarDadosCS()

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>
  }

  const lista = clientes ?? []
  const listaAlertas = alertas ?? []

  const alertasAltos = listaAlertas.filter((a) => a.severidade === 'alta')
  const alertasResto = listaAlertas.filter((a) => a.severidade !== 'alta')

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
          <Heart className="h-6 w-6 text-brand" />
          Customer Success
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Saúde dos clientes calculada diariamente. Score 0–100.
        </p>
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
        <KpiMini
          label="Saudáveis"
          value={lista.filter((c) => (c.scoreAtual ?? 0) >= 70).length}
          total={lista.length}
          cor="green"
        />
        <KpiMini
          label="Atenção"
          value={lista.filter((c) => c.scoreAtual != null && c.scoreAtual >= 40 && c.scoreAtual < 70).length}
          total={lista.length}
          cor="amber"
        />
        <KpiMini
          label="Risco"
          value={lista.filter((c) => c.scoreAtual != null && c.scoreAtual < 40).length}
          total={lista.length}
          cor="red"
        />
        <KpiMini
          label="Sem score"
          value={lista.filter((c) => c.scoreAtual == null).length}
          total={lista.length}
          cor="zinc"
        />
        <KpiMini
          label="Alertas"
          value={listaAlertas.length}
          total={lista.length}
          cor={listaAlertas.length > 0 ? 'orange' : 'green'}
        />
      </div>

      {/* Composição do score */}
      <p className="text-xs italic text-zinc-400">
        Taxa no prazo (30%) · Rodadas de revisão (20%) · Uso do plano (20%) · Avaliações (20%) · Tempo de resposta (10%)
      </p>

      {/* Alertas prioritários */}
      {alertasAltos.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-red-800">
            <AlertTriangle className="h-4 w-4" />
            {alertasAltos.length} alerta{alertasAltos.length > 1 ? 's' : ''} de alta prioridade
          </h2>
          <div className="space-y-2">
            {alertasAltos.map((a, i) => (
              <AlertaRow key={i} alerta={a} />
            ))}
          </div>
        </div>
      )}

      {/* Alertas médios/baixos */}
      {alertasResto.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            {alertasResto.length} alerta{alertasResto.length > 1 ? 's' : ''} de acompanhamento
          </h2>
          <div className="space-y-2">
            {alertasResto.map((a, i) => (
              <AlertaRow key={i} alerta={a} />
            ))}
          </div>
        </div>
      )}

      {/* Sem alertas */}
      {listaAlertas.length === 0 && lista.filter((c) => c.scoreAtual != null).length > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-5 py-4">
          <CheckCircle2 className="h-5 w-5 flex-none text-green-500" />
          <p className="text-sm font-medium text-green-700">
            Todos os clientes dentro dos parâmetros — nenhum alerta ativo.
          </p>
        </div>
      )}

      {/* Grade de clientes */}
      <div className="rounded-2xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-700">
            Saúde dos clientes —{' '}
            <span className="font-normal text-zinc-500">{lista.length} ativo{lista.length !== 1 ? 's' : ''}</span>
          </h2>
        </div>

        {lista.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-zinc-400">
            Nenhum cliente ativo encontrado.
          </p>
        ) : (
          <div className="divide-y divide-zinc-100">
            {lista.map((c) => (
              <ClienteRow key={c.id} cliente={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-componentes
// ---------------------------------------------------------------------------

const COR_MAP = {
  green: 'text-green-700 bg-green-100',
  amber: 'text-amber-700 bg-amber-100',
  red: 'text-red-700 bg-red-100',
  zinc: 'text-zinc-500 bg-zinc-100',
  orange: 'text-orange-700 bg-orange-100',
} as const

function KpiMini({
  label,
  value,
  total,
  cor,
}: {
  label: string
  value: number
  total: number
  cor: keyof typeof COR_MAP
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-center">
      <p className={`font-display text-2xl font-bold ${COR_MAP[cor].split(' ')[0]}`}>{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
        {label}
      </p>
      {total > 0 && (
        <p className="text-[10px] text-zinc-300">{Math.round((value / total) * 100)}%</p>
      )}
    </div>
  )
}

const ALERTA_ICON: Record<string, React.ReactNode> = {
  score_vermelho: <Heart className="h-4 w-4 text-red-500" />,
  score_queda: <TrendingDown className="h-4 w-4 text-red-500" />,
  aprovacao_atrasada: <Clock className="h-4 w-4 text-red-500" />,
  renovacao_contrato: <RefreshCw className="h-4 w-4 text-amber-500" />,
  sem_atividade: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  sub_utilizacao: <BarChart2 className="h-4 w-4 text-zinc-400" />,
}

function AlertaRow({ alerta }: { alerta: AlertaCS }) {
  const icon = ALERTA_ICON[alerta.tipo] ?? <AlertTriangle className="h-4 w-4" />
  const isAlto = alerta.severidade === 'alta'

  return (
    <div className={`flex items-start gap-3 rounded-xl border p-3 ${isAlto ? 'border-red-200 bg-white' : 'border-amber-200 bg-white'}`}>
      <div className="mt-0.5 flex-none">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-zinc-800">
          <span className="text-zinc-500">{alerta.clienteNome}</span>
          {' · '}
          {alerta.titulo}
        </p>
        <p className="mt-0.5 text-[11px] text-zinc-500">{alerta.descricao}</p>
      </div>
      <Link
        href={`/clientes`}
        className="flex-none text-[10px] font-medium text-brand hover:underline"
      >
        Ver <ArrowRight className="inline h-2.5 w-2.5" />
      </Link>
    </div>
  )
}

function ClienteRow({ cliente }: { cliente: ClienteHealthData }) {
  const pctPlano =
    cliente.limitePlano > 0
      ? Math.round((cliente.usoPlanoMes / cliente.limitePlano) * 100)
      : 0

  return (
    <div className="flex items-center gap-4 px-5 py-4">
      {/* Score badge */}
      <ScoreBadge score={cliente.scoreAtual} size="sm" />

      {/* Nome + tendência */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-zinc-800">{cliente.nome}</p>
          <ScoreChip score={cliente.scoreAtual} />
          <ScoreTendencia atual={cliente.scoreAtual} anterior={cliente.scoreAnterior} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {/* Métricas inline */}
          <span className="flex items-center gap-1 text-[11px] text-zinc-500">
            <BarChart2 className="h-3 w-3" />
            {pctPlano}% do plano
          </span>
          {cliente.cardsAtivos > 0 && (
            <span className="text-[11px] text-zinc-400">·</span>
          )}
          {cliente.cardsAtivos > 0 && (
            <span className="text-[11px] text-zinc-500">
              {cliente.cardsAtivos} card{cliente.cardsAtivos !== 1 ? 's' : ''} ativos
            </span>
          )}
          {cliente.cardsParaAprovacaoAtrasados > 0 && (
            <>
              <span className="text-[11px] text-zinc-400">·</span>
              <span className="flex items-center gap-0.5 text-[11px] font-medium text-red-600">
                <Clock className="h-2.5 w-2.5" />
                {cliente.cardsParaAprovacaoAtrasados} aprov. atrasada
                {cliente.cardsParaAprovacaoAtrasados > 1 ? 's' : ''}
              </span>
            </>
          )}
          {cliente.dataRenovacao && (
            <>
              <span className="text-[11px] text-zinc-400">·</span>
              <span className="text-[11px] text-zinc-500">
                renova {new Date(cliente.dataRenovacao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Sparkline */}
      {cliente.historicoScores.length >= 2 && (
        <div className="hidden flex-none sm:block">
          <ScoreSparkline scores={[...cliente.historicoScores].reverse()} />
        </div>
      )}

      {/* Componentes do score */}
      {cliente.componentes && (
        <div className="hidden flex-none gap-1.5 lg:flex">
          {(
            [
              { key: 'taxa_aprovacao', label: 'Prazo', icon: <TrendingUp className="h-3 w-3" /> },
              { key: 'rodadas_revisao', label: 'Rodadas', icon: <RefreshCw className="h-3 w-3" /> },
              { key: 'uso_plano', label: 'Uso', icon: <BarChart2 className="h-3 w-3" /> },
            ] as const
          ).map(({ key, label, icon }) => {
            const v = cliente.componentes![key]
            const cor =
              v >= 70 ? 'text-green-700 bg-green-50'
              : v >= 40 ? 'text-amber-700 bg-amber-50'
              : 'text-red-700 bg-red-50'
            return (
              <div key={key} className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] ${cor}`}>
                {icon}
                <span className="font-semibold">{v}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Link para o board filtrado por cliente */}
      <Link
        href={`/board?cliente=${cliente.id}`}
        className="flex-none text-xs font-medium text-brand hover:underline"
      >
        Board <ArrowRight className="inline h-3 w-3" />
      </Link>
    </div>
  )
}
