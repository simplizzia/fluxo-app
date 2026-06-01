'use client'

import { useState, useTransition } from 'react'
import { actionAvaliarColaborador } from './actions'
import type { ColaboradorParaAvaliacao } from './actions'

const PAPEL_LABELS: Record<string, string> = {
  executor: 'Executor',
  gestao: 'Gestão',
  atendimento: 'Atendimento',
}

const CRITERIO_LABELS: Record<string, string> = {
  qualidade: 'Qualidade',
  prazo: 'Cumprimento de prazos',
  comunicacao: 'Comunicação',
  iniciativa: 'Iniciativa',
}

type Criterios = { qualidade: number; prazo: number; comunicacao: number; iniciativa: number }

export default function ColaboradorForm({
  colaboradores,
}: {
  colaboradores: ColaboradorParaAvaliacao[]
}) {
  const [colaboradorId, setColaboradorId] = useState('')
  const [criterios, setCriterios] = useState<Criterios>({
    qualidade: 0,
    prazo: 0,
    comunicacao: 0,
    iniciativa: 0,
  })
  const [observacao, setObservacao] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')
  const [pending, startTransition] = useTransition()

  const notaGeral = Object.values(criterios).every((v) => v > 0)
    ? Math.round(Object.values(criterios).reduce((a, b) => a + b, 0) / 4)
    : 0

  const canSubmit =
    !!colaboradorId &&
    Object.values(criterios).every((v) => v > 0) &&
    !pending

  function handleSubmit() {
    if (!canSubmit) return
    setErro('')
    startTransition(async () => {
      const res = await actionAvaliarColaborador({
        colaboradorId,
        notaGeral,
        criterios,
        observacao,
      })
      if (res.ok) {
        setSucesso(true)
        setColaboradorId('')
        setCriterios({ qualidade: 0, prazo: 0, comunicacao: 0, iniciativa: 0 })
        setObservacao('')
        setTimeout(() => setSucesso(false), 4000)
      } else {
        setErro(res.error ?? 'Erro ao salvar avaliação.')
      }
    })
  }

  if (colaboradores.length === 0) {
    return (
      <p className="py-4 text-sm text-zinc-400">Nenhum colaborador disponível para avaliação.</p>
    )
  }

  return (
    <div className="space-y-5">
      {sucesso && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          ✓ Avaliação registrada com sucesso!
        </div>
      )}
      {erro && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      {/* Seleção do colaborador */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Colaborador
        </label>
        <select
          value={colaboradorId}
          onChange={(e) => setColaboradorId(e.target.value)}
          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-800 outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10"
        >
          <option value="">Selecione...</option>
          {colaboradores.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome} — {PAPEL_LABELS[c.papel] ?? c.papel}
            </option>
          ))}
        </select>
      </div>

      {/* Grid de critérios */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(Object.keys(CRITERIO_LABELS) as Array<keyof Criterios>).map((key) => (
          <CriterioRating
            key={key}
            label={CRITERIO_LABELS[key]}
            value={criterios[key]}
            onChange={(v) => setCriterios((prev) => ({ ...prev, [key]: v }))}
          />
        ))}
      </div>

      {/* Nota geral calculada */}
      {notaGeral > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
          <p className="text-sm text-zinc-500">Nota geral calculada:</p>
          <span className="font-display text-lg font-bold text-brand">{notaGeral}/5</span>
          <span className="text-sm text-amber-400">{'★'.repeat(notaGeral)}{'☆'.repeat(5 - notaGeral)}</span>
        </div>
      )}

      {/* Observação */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Observação <span className="font-normal normal-case text-zinc-400">(opcional)</span>
        </label>
        <textarea
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          rows={2}
          placeholder="Pontos de destaque, oportunidades de melhoria..."
          className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-800 placeholder-zinc-400 outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10"
        />
      </div>

      {/* Botão */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? 'Salvando...' : 'Registrar avaliação'}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CriterioRating
// ---------------------------------------------------------------------------

function CriterioRating({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-zinc-600">{label}</p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="text-xl transition-transform hover:scale-110 focus:outline-none"
          >
            <span className={star <= value ? 'text-amber-400' : 'text-zinc-200'}>★</span>
          </button>
        ))}
      </div>
    </div>
  )
}
