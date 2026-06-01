'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { actionSalvarRascunho, actionAprovarRelatorio, actionEnviarRelatorio } from '../actions'
import type { RelatorioDetalhe } from '../actions'

const STATUS_LABELS = {
  gerando: { label: 'Gerando...', color: 'text-zinc-500 bg-zinc-100' },
  rascunho: { label: 'Rascunho', color: 'text-amber-700 bg-amber-100' },
  aprovado: { label: 'Aprovado', color: 'text-blue-700 bg-blue-100' },
  enviado: { label: 'Enviado', color: 'text-green-700 bg-green-100' },
}

export default function EditarRelatorio({ relatorio }: { relatorio: RelatorioDetalhe }) {
  const router = useRouter()
  const conteudoInicial = relatorio.conteudoEditado ?? relatorio.conteudo ?? ''
  const [conteudo, setConteudo] = useState(conteudoInicial)
  const [mensagem, setMensagem] = useState('')
  const [pendingSalvar, startSalvar] = useTransition()
  const [pendingAprovar, startAprovar] = useTransition()
  const [pendingEnviar, startEnviar] = useTransition()

  const mesRef = new Date(relatorio.mesReferencia)
  const nomeMes = mesRef.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const statusCfg = STATUS_LABELS[relatorio.status]
  const foiEditado = conteudo !== (relatorio.conteudo ?? '')

  function handleSalvar() {
    startSalvar(async () => {
      const res = await actionSalvarRascunho(relatorio.id, conteudo)
      setMensagem(res.ok ? 'Rascunho salvo.' : res.error ?? 'Erro ao salvar.')
      if (res.ok) router.refresh()
    })
  }

  function handleAprovar() {
    startAprovar(async () => {
      // Salva primeiro se houve edição
      if (foiEditado) await actionSalvarRascunho(relatorio.id, conteudo)
      const res = await actionAprovarRelatorio(relatorio.id)
      setMensagem(res.ok ? 'Relatório aprovado! Pronto para envio.' : res.error ?? 'Erro.')
      if (res.ok) router.refresh()
    })
  }

  function handleEnviar() {
    startEnviar(async () => {
      const res = await actionEnviarRelatorio(relatorio.id)
      setMensagem(res.ok ? 'Relatório enviado com sucesso!' : res.error ?? 'Erro ao enviar.')
      if (res.ok) router.refresh()
    })
  }

  const isPending = pendingSalvar || pendingAprovar || pendingEnviar
  const jaEnviado = relatorio.status === 'enviado'

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Relatório Mensal
          </p>
          <h1 className="mt-0.5 font-display text-2xl font-bold text-ink">
            {relatorio.clienteNome}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 capitalize">{nomeMes}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusCfg.color}`}>
          {statusCfg.label}
        </span>
      </div>

      {/* Métricas coletadas */}
      {Object.keys(relatorio.dados).length > 0 && (
        <MetricasCard dados={relatorio.dados} />
      )}

      {/* Editor */}
      <div className="rounded-2xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-5 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-700">Conteúdo do relatório</h2>
            <p className="text-xs text-zinc-400">Markdown · editável pela sócia</p>
          </div>
        </div>
        <div className="p-5">
          {jaEnviado ? (
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap rounded-xl bg-zinc-50 p-4 text-sm text-zinc-700">
                {conteudo}
              </pre>
            </div>
          ) : (
            <textarea
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              rows={20}
              className="w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 font-mono text-sm text-zinc-800 outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10"
              placeholder="Conteúdo em markdown..."
            />
          )}
        </div>
      </div>

      {/* Feedback */}
      {mensagem && (
        <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          {mensagem}
        </p>
      )}

      {/* Ações */}
      {!jaEnviado && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSalvar}
            disabled={isPending || !foiEditado}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pendingSalvar ? 'Salvando...' : 'Salvar rascunho'}
          </button>

          {relatorio.status !== 'aprovado' && (
            <button
              onClick={handleAprovar}
              disabled={isPending || !conteudo}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pendingAprovar ? 'Aprovando...' : '✓ Aprovar'}
            </button>
          )}

          <button
            onClick={handleEnviar}
            disabled={isPending || !conteudo}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#A046C6 0%,#F9267C 100%)' }}
          >
            {pendingEnviar ? 'Enviando...' : '↗ Enviar para o cliente'}
          </button>

          <a
            href={`/relatorios/${relatorio.id}/imprimir`}
            target="_blank"
            className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
          >
            🖨 Imprimir / PDF
          </a>
        </div>
      )}

      {jaEnviado && (
        <div className="flex items-center gap-3">
          <p className="text-sm text-zinc-500">
            Enviado em{' '}
            {relatorio.enviadoEm
              ? new Date(relatorio.enviadoEm).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })
              : '—'}
          </p>
          <a
            href={`/relatorios/${relatorio.id}/imprimir`}
            target="_blank"
            className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
          >
            🖨 Imprimir / PDF
          </a>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// MetricasCard — resumo visual das métricas coletadas
// ---------------------------------------------------------------------------

function MetricasCard({ dados }: { dados: Record<string, unknown> }) {
  const itens = [
    { label: 'Criadas', value: dados.totalCriados as number },
    { label: 'Concluídas', value: dados.totalConcluidos as number },
    { label: 'No prazo', value: `${dados.taxaEntregaNoPrazo as number}%` },
    { label: 'Uso do plano', value: `${dados.usoPlano as number}/${dados.limitePlano as number}` },
    ...(dados.npsScore !== null && dados.npsScore !== undefined
      ? [{ label: 'NPS', value: (dados.npsScore as number) > 0 ? `+${dados.npsScore}` : String(dados.npsScore) }]
      : []),
    ...(dados.healthScore !== null && dados.healthScore !== undefined
      ? [{ label: 'Health', value: `${dados.healthScore}/100` }]
      : []),
  ]

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Métricas coletadas
      </p>
      <div className="flex flex-wrap gap-3">
        {itens.map((item) => (
          <div key={item.label} className="rounded-xl bg-zinc-50 px-4 py-2 text-center">
            <p className="font-display text-lg font-bold text-zinc-800">{item.value}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
