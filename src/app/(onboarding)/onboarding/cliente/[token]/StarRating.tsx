'use client'

import { useState } from 'react'

interface StarRatingProps {
  token: string
  onSubmitted: () => void
}

const QUESTIONS = [
  { key: 'clarity_score',   label: 'Clareza e objetividade das perguntas' },
  { key: 'time_score',      label: 'Tempo razoável para completar' },
  { key: 'relevance_score', label: 'Relevância das perguntas para o meu negócio' },
]

export default function StarRating({ token, onSubmitted }: StarRatingProps) {
  const [scores, setScores]     = useState<Record<string, number>>({})
  const [hovered, setHovered]   = useState<Record<string, number>>({})
  const [comment, setComment]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState('')

  const allAnswered = QUESTIONS.every((q) => (scores[q.key] ?? 0) > 0)

  async function handleSubmit() {
    if (!allAnswered || submitting) return
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/onboarding/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          clarity_score:   scores.clarity_score,
          time_score:      scores.time_score,
          relevance_score: scores.relevance_score,
          comment:         comment.trim() || undefined,
        }),
      })

      if (!res.ok) throw new Error('Erro ao enviar')
      onSubmitted()
    } catch {
      setError('Não foi possível enviar. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <p className="mb-1 text-sm font-semibold text-zinc-900">Avaliação rápida</p>
      <p className="mb-5 text-xs text-zinc-500">Três perguntas, menos de um minuto.</p>

      <div className="space-y-5">
        {QUESTIONS.map((q) => (
          <div key={q.key}>
            <p className="mb-2 text-sm text-zinc-700">{q.label}</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHovered((h) => ({ ...h, [q.key]: star }))}
                  onMouseLeave={() => setHovered((h) => ({ ...h, [q.key]: 0 }))}
                  onClick={() => setScores((s) => ({ ...s, [q.key]: star }))}
                  className="text-2xl leading-none transition-transform hover:scale-110"
                  aria-label={`${star} estrelas`}
                >
                  <span
                    className={
                      star <= (hovered[q.key] || scores[q.key] || 0)
                        ? 'text-zinc-900'
                        : 'text-zinc-200'
                    }
                  >
                    ★
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}

        <div>
          <label className="mb-2 block text-sm text-zinc-700">
            Algum comentário adicional?{' '}
            <span className="text-zinc-400">(opcional)</span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Escreva aqui..."
            className="w-full resize-none rounded-xl border border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={!allAnswered || submitting}
          className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? 'Enviando...' : 'Enviar avaliação'}
        </button>
      </div>
    </div>
  )
}
