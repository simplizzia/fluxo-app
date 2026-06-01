'use client'

import { useState, useTransition } from 'react'
import {
  Sparkles, RefreshCw, Brain, Loader2,
  TrendingUp, TrendingDown, Lightbulb,
} from 'lucide-react'
import TriggerModal from './TriggerModal'
import FeedbackButtons from '@/components/agents/FeedbackButtons'
import type { AgenteDef } from '@/lib/agents/catalog'
import type { AgentRun, ClienteSimples, AgentInsight } from './actions'
import { PADRAO_LABELS } from '@/lib/agents/catalog'
import { actionAnalisarPadroes } from './actions'

interface Props {
  agentesPorTime: [string, AgenteDef[]][]
  runs: AgentRun[]
  clientes: ClienteSimples[]
  papelAtual: string
  insightsIniciais: AgentInsight[]
}

const STATUS_CONFIG = {
  pendente:  { label: 'Pendente',  classe: 'bg-zinc-100 text-zinc-500' },
  rodando:   { label: 'Rodando',   classe: 'bg-amber-100 text-amber-700' },
  concluido: { label: 'Concluído', classe: 'bg-green-100 text-green-700' },
  falhou:    { label: 'Falhou',    classe: 'bg-red-100 text-red-600' },
}

const PADRAO_BADGE: Record<string, string> = {
  A: 'bg-blue-100 text-blue-700',
  B: 'bg-amber-100 text-amber-700',
  C: 'bg-violet-100 text-violet-700',
}

function tempoRelativo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h}h`
  return `há ${Math.floor(h / 24)}d`
}

// ---------------------------------------------------------------------------
// InsightCard — sub-component
// ---------------------------------------------------------------------------

function InsightCard({
  insight,
  analisando,
  onAnalisar,
  podeAnalisar,
}: {
  insight: AgentInsight
  analisando: boolean
  onAnalisar: () => void
  podeAnalisar: boolean
}) {
  const taxa = insight.taxaAprovacao
  const taxaCor =
    taxa == null ? 'text-zinc-400'
    : taxa >= 70  ? 'text-green-600'
    : taxa >= 40  ? 'text-amber-600'
    : 'text-red-600'

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-zinc-900">{insight.agentNome}</p>
          {insight.clienteNome && (
            <p className="mt-0.5 text-[11px] text-zinc-400">{insight.clienteNome}</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <span className={`font-display text-xl font-bold ${taxaCor}`}>
            {taxa != null ? `${taxa}%` : '—'}
          </span>
          <p className="text-[10px] text-zinc-400">{insight.totalFeedbacks} feedbacks</p>
        </div>
      </div>

      {/* Resumo */}
      {insight.resumo && (
        <p className="text-xs leading-relaxed text-zinc-500 italic border-l-2 border-zinc-200 pl-3">
          "{insight.resumo}"
        </p>
      )}

      {/* Patterns */}
      <div className="space-y-3">
        {insight.padroesPositivos.length > 0 && (
          <div>
            <p className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-green-700">
              <TrendingUp className="h-3 w-3" /> O que funciona
            </p>
            <ul className="space-y-1">
              {insight.padroesPositivos.map((p, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-600">
                  <span className="mt-0.5 text-green-500">•</span>{p}
                </li>
              ))}
            </ul>
          </div>
        )}
        {insight.padroesNegativos.length > 0 && (
          <div>
            <p className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-600">
              <TrendingDown className="h-3 w-3" /> O que melhorar
            </p>
            <ul className="space-y-1">
              {insight.padroesNegativos.map((p, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-600">
                  <span className="mt-0.5 text-red-400">•</span>{p}
                </li>
              ))}
            </ul>
          </div>
        )}
        {insight.sugestoes.length > 0 && (
          <div>
            <p className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-violet-700">
              <Lightbulb className="h-3 w-3" /> Sugestões
            </p>
            <ul className="space-y-1">
              {insight.sugestoes.map((s, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-600">
                  <span className="mt-0.5 text-violet-400">•</span>{s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between border-t border-zinc-100 pt-3">
        <p className="text-[10px] text-zinc-400">Atualizado {tempoRelativo(insight.atualizadoEm)}</p>
        {podeAnalisar && (
          <button
            onClick={onAnalisar}
            disabled={analisando}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50"
          >
            {analisando
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <Brain className="h-3 w-3" />}
            Atualizar análise
          </button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AgentesPortal — main component
// ---------------------------------------------------------------------------

export default function AgentesPortal({
  agentesPorTime,
  runs: runsInicial,
  clientes,
  papelAtual,
  insightsIniciais,
}: Props) {
  const [agenteSelecionado, setAgenteSelecionado] = useState<AgenteDef | null>(null)
  const [runs] = useState(runsInicial)
  const [filtroTime, setFiltroTime] = useState<string | null>(null)
  const [insights, setInsights] = useState<AgentInsight[]>(insightsIniciais)
  const [analisandoChave, setAnalisandoChave] = useState<string | null>(null)
  const [analisarErro, setAnalisarErro] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const times = agentesPorTime.map(([time]) => time)

  const agentesFiltrados = filtroTime
    ? agentesPorTime.filter(([time]) => time === filtroTime)
    : agentesPorTime

  function handleSuccess() {
    window.location.reload()
  }

  function handleAnalisar(agenteChave: string) {
    if (analisandoChave) return
    setAnalisandoChave(agenteChave)
    setAnalisarErro(null)
    startTransition(async () => {
      const res = await actionAnalisarPadroes(agenteChave)
      if (res.error) {
        setAnalisarErro(res.error)
      } else if (res.insight) {
        const novo = res.insight
        setInsights((prev) => {
          const idx = prev.findIndex(
            (i) => i.agentChave === novo.agentChave && i.clienteNome === novo.clienteNome,
          )
          if (idx >= 0) {
            const next = [...prev]
            next[idx] = novo
            return next
          }
          return [novo, ...prev]
        })
      }
      setAnalisandoChave(null)
    })
  }

  return (
    <>
      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFiltroTime(null)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            filtroTime === null
              ? 'bg-zinc-900 text-white'
              : 'border border-zinc-200 text-zinc-500 hover:bg-zinc-50'
          }`}
        >
          Todos ({agentesPorTime.reduce((acc, [, a]) => acc + a.length, 0)})
        </button>
        {times.map((time) => {
          const count = agentesPorTime.find(([t]) => t === time)?.[1].length ?? 0
          return (
            <button
              key={time}
              onClick={() => setFiltroTime(filtroTime === time ? null : time)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                filtroTime === time
                  ? 'bg-zinc-900 text-white'
                  : 'border border-zinc-200 text-zinc-500 hover:bg-zinc-50'
              }`}
            >
              {time} ({count})
            </button>
          )
        })}
      </div>

      {/* Agent groups */}
      <div className="space-y-8">
        {agentesFiltrados.map(([time, agentes]) => (
          <section key={time}>
            <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-zinc-600">
              {time}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {agentes.map((agente) => {
                const podeTrigger = agente.papeisPermitidos.includes(papelAtual)
                return (
                  <div
                    key={agente.chave}
                    className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:shadow-sm"
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-900">{agente.nome}</p>
                        <p className="mt-0.5 text-[11px] text-zinc-400">{agente.time}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${PADRAO_BADGE[agente.padrao]}`}
                      >
                        {PADRAO_LABELS[agente.padrao]}
                      </span>
                    </div>
                    <p className="flex-1 text-xs leading-relaxed text-zinc-500">{agente.descricao}</p>
                    {podeTrigger ? (
                      <button
                        onClick={() => setAgenteSelecionado(agente)}
                        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-200 py-2 text-xs font-medium text-zinc-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Executar
                      </button>
                    ) : (
                      <p className="mt-4 text-center text-[11px] text-zinc-300">Acesso restrito</p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Recent runs */}
      {runs.length > 0 ? (
        <section className="space-y-4">
          <h2 className="font-display text-lg font-bold text-zinc-800">Execuções Recentes</h2>
          <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-100">
                <tr className="text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-500">Agente</th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-500">Cliente</th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-500">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-500">Tokens</th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-500">Quando</th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-500">Avaliação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {runs.map((run) => {
                  const s = STATUS_CONFIG[run.status]
                  const tokens =
                    run.tokensInput && run.tokensOutput
                      ? `${run.tokensInput + run.tokensOutput}`
                      : '—'
                  return (
                    <tr key={run.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-zinc-800">{run.agentNome}</p>
                        {run.cardTitulo && (
                          <p className="mt-0.5 max-w-[160px] truncate text-[11px] text-zinc-400">
                            {run.cardTitulo}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{run.clienteNome ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${s.classe}`}>
                          {s.label}
                        </span>
                        {run.erro && (
                          <p className="mt-0.5 max-w-[160px] truncate text-[10px] text-red-500">
                            {run.erro}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-400">{tokens}</td>
                      <td className="px-4 py-3 text-xs text-zinc-400">
                        {tempoRelativo(run.criadoEm)}
                      </td>
                      <td className="px-4 py-3">
                        {run.status === 'concluido' && (
                          <FeedbackButtons runId={run.id} feedbackInicial={run.feedback} />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-10 text-center">
          <RefreshCw className="mx-auto h-8 w-8 text-zinc-300" />
          <p className="mt-3 text-sm font-medium text-zinc-600">Nenhuma execução ainda</p>
          <p className="mt-1 text-xs text-zinc-400">Execute um agente para ver o histórico aqui.</p>
        </div>
      )}

      {/* Aprendizados dos Agentes */}
      <section className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-bold text-zinc-800">Aprendizados dos Agentes</h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Padrões extraídos via IA a partir dos feedbacks acumulados.
          </p>
        </div>

        {insights.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-10 text-center">
            <Brain className="mx-auto h-8 w-8 text-zinc-300" />
            <p className="mt-3 text-sm font-medium text-zinc-600">Nenhum insight ainda</p>
            <p className="mt-1 text-xs text-zinc-400">
              Avalie execuções com os botões de feedback e depois use{' '}
              <span className="font-medium text-zinc-600">Atualizar análise</span> no card do agente.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {insights.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                analisando={analisandoChave === insight.agentChave}
                onAnalisar={() => handleAnalisar(insight.agentChave)}
                podeAnalisar={papelAtual === 'socia' || papelAtual === 'gestao'}
              />
            ))}
          </div>
        )}

        {analisarErro && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{analisarErro}</p>
        )}
      </section>

      {/* Modal */}
      {agenteSelecionado && (
        <TriggerModal
          agente={agenteSelecionado}
          clientes={clientes}
          onClose={() => setAgenteSelecionado(null)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  )
}
