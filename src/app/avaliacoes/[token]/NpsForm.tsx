'use client'

import { useState, useTransition } from 'react'
import { actionResponderAvaliacao } from './actions'

// Cores dos botões NPS (não selecionado)
const NPS_RING: Record<number, string> = {
  0: 'hover:border-red-400 hover:bg-red-50 hover:text-red-700',
  1: 'hover:border-red-400 hover:bg-red-50 hover:text-red-700',
  2: 'hover:border-red-400 hover:bg-red-50 hover:text-red-700',
  3: 'hover:border-orange-400 hover:bg-orange-50 hover:text-orange-700',
  4: 'hover:border-orange-400 hover:bg-orange-50 hover:text-orange-700',
  5: 'hover:border-orange-400 hover:bg-orange-50 hover:text-orange-700',
  6: 'hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700',
  7: 'hover:border-yellow-400 hover:bg-yellow-50 hover:text-yellow-700',
  8: 'hover:border-yellow-400 hover:bg-yellow-50 hover:text-yellow-700',
  9: 'hover:border-green-400 hover:bg-green-50 hover:text-green-700',
  10: 'hover:border-green-500 hover:bg-green-50 hover:text-green-700',
}

// Cores dos botões NPS (selecionado)
const NPS_SELECTED: Record<number, string> = {
  0: 'border-red-500 bg-red-500 text-white',
  1: 'border-red-500 bg-red-500 text-white',
  2: 'border-red-500 bg-red-500 text-white',
  3: 'border-orange-500 bg-orange-500 text-white',
  4: 'border-orange-500 bg-orange-500 text-white',
  5: 'border-orange-500 bg-orange-500 text-white',
  6: 'border-amber-500 bg-amber-500 text-white',
  7: 'border-yellow-500 bg-yellow-500 text-white',
  8: 'border-yellow-500 bg-yellow-500 text-white',
  9: 'border-green-500 bg-green-500 text-white',
  10: 'border-green-600 bg-green-600 text-white',
}

const STAR_LABELS = ['', 'Ruim', 'Regular', 'Bom', 'Muito bom', 'Excelente']

export default function NpsForm({
  token,
  clienteNome,
}: {
  token: string
  clienteNome: string
}) {
  const [nps, setNps] = useState<number | null>(null)
  const [qualidade, setQualidade] = useState(0)
  const [comunicacao, setComunicacao] = useState(0)
  const [comentario, setComentario] = useState('')
  const [pending, startTransition] = useTransition()

  const canSubmit = nps !== null && qualidade > 0 && comunicacao > 0 && !pending

  function handleSubmit() {
    if (!canSubmit) return
    startTransition(async () => {
      await actionResponderAvaliacao(token, {
        nps: nps!,
        qualidade,
        comunicacao,
        comentario,
      })
    })
  }

  return (
    <div className="min-h-screen bg-[#F4F4F4] px-4 py-12">
      <div className="mx-auto max-w-xl">
        {/* Header */}
        <div
          className="mb-1 rounded-2xl px-6 py-4"
          style={{ background: 'linear-gradient(135deg,#A046C6 0%,#F9267C 100%)' }}
        >
          <div className="flex items-center justify-between">
            <span className="font-display text-lg font-bold text-white">Simplizzia</span>
            <span className="text-xs text-white/70">por Izzi</span>
          </div>
        </div>

        {/* Formulário */}
        <div className="rounded-2xl bg-white p-6 sm:p-8">
          <p className="mb-1 text-base font-semibold text-zinc-900">Oi, {clienteNome}! 💜</p>
          <p className="mb-7 text-sm leading-relaxed text-zinc-500">
            Sua opinião é muito importante para nós. Responder leva menos de 2 minutos e nos
            ajuda a melhorar cada vez mais.
          </p>

          {/* Pergunta NPS */}
          <div className="mb-7">
            <p className="mb-1 text-sm font-semibold text-zinc-800">
              Em uma escala de 0 a 10, qual a chance de você nos recomendar a um amigo ou colega?
            </p>
            <p className="mb-3 text-xs text-zinc-400">
              0 = Jamais recomendaria · 10 = Com certeza recomendaria
            </p>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 11 }, (_, i) => i).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNps(n)}
                  className={`h-10 w-10 rounded-xl border-2 text-sm font-bold transition-all ${
                    nps === n
                      ? NPS_SELECTED[n]
                      : `border-zinc-200 bg-white text-zinc-600 ${NPS_RING[n]}`
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Qualidade das entregas */}
          <StarRating
            label="Como avalia a qualidade das nossas entregas?"
            value={qualidade}
            onChange={setQualidade}
          />

          {/* Comunicação */}
          <StarRating
            label="Como avalia nossa comunicação e atendimento?"
            value={comunicacao}
            onChange={setComunicacao}
          />

          {/* Comentário livre */}
          <div className="mb-8">
            <label className="mb-1.5 block text-sm font-semibold text-zinc-800">
              Quer deixar algum comentário? <span className="font-normal text-zinc-400">(opcional)</span>
            </label>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={3}
              placeholder="Compartilhe o que estiver na sua mente — elogios, sugestões ou críticas são bem-vindas!"
              className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-800 placeholder-zinc-400 outline-none transition focus:border-brand/50 focus:ring-2 focus:ring-brand/10"
            />
          </div>

          {/* Botão de envio */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full rounded-xl py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#A046C6 0%,#F9267C 100%)' }}
          >
            {pending ? 'Enviando...' : 'Enviar avaliação →'}
          </button>

          {/* Hint de validação */}
          {!canSubmit && !pending && (
            <p className="mt-2 text-center text-xs text-zinc-400">
              {nps === null
                ? 'Selecione uma nota NPS para continuar.'
                : 'Avalie qualidade e comunicação para continuar.'}
            </p>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-zinc-400">
          Izzi · Assistente da Simplizzia
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// StarRating — sub-componente reutilizável
// ---------------------------------------------------------------------------

function StarRating({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="mb-6">
      <p className="mb-2 text-sm font-semibold text-zinc-800">{label}</p>
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="text-2xl transition-transform hover:scale-110 focus:outline-none"
          >
            <span className={star <= value ? 'text-amber-400' : 'text-zinc-200'}>★</span>
          </button>
        ))}
        {value > 0 && (
          <span className="ml-1 text-xs text-zinc-400">{STAR_LABELS[value]}</span>
        )}
      </div>
    </div>
  )
}
