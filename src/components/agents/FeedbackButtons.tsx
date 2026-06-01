'use client'

import { useState, useTransition } from 'react'
import { ThumbsUp, ThumbsDown, Check, Loader2 } from 'lucide-react'
import { actionRegistrarFeedback } from '@/app/(dashboard)/agentes/actions'

interface Props {
  runId: string
  feedbackInicial?: 'bom' | 'ruim' | null
}

export default function FeedbackButtons({ runId, feedbackInicial = null }: Props) {
  const [avaliacao, setAvaliacao] = useState<'bom' | 'ruim' | null>(feedbackInicial)
  const [mostrarComentario, setMostrarComentario] = useState(false)
  const [comentario, setComentario] = useState('')
  const [salvo, setSalvo] = useState(feedbackInicial !== null)
  const [erro, setErro] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleVoto(voto: 'bom' | 'ruim') {
    if (salvo) return
    setAvaliacao(voto)
    if (voto === 'ruim') {
      setMostrarComentario(true)
    } else {
      handleSalvar(voto, '')
    }
  }

  function handleSalvar(votoParam?: 'bom' | 'ruim', comentarioParam?: string) {
    const v = votoParam ?? avaliacao
    const c = comentarioParam ?? comentario
    if (!v) return
    setErro(null)

    startTransition(async () => {
      const res = await actionRegistrarFeedback(runId, v, c || undefined)
      if (res.error) {
        setErro(res.error)
      } else {
        setSalvo(true)
        setMostrarComentario(false)
      }
    })
  }

  if (salvo) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
        <Check className="h-3 w-3 text-green-500" />
        Feedback registrado
        {avaliacao === 'bom'
          ? <ThumbsUp className="h-3 w-3 text-green-500" />
          : <ThumbsDown className="h-3 w-3 text-red-400" />}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-zinc-400">Este output foi útil?</span>
        <button
          onClick={() => handleVoto('bom')}
          disabled={pending}
          className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] transition ${
            avaliacao === 'bom'
              ? 'bg-green-100 text-green-700'
              : 'text-zinc-400 hover:bg-green-50 hover:text-green-600'
          }`}
        >
          <ThumbsUp className="h-3 w-3" />
          Sim
        </button>
        <button
          onClick={() => handleVoto('ruim')}
          disabled={pending}
          className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] transition ${
            avaliacao === 'ruim'
              ? 'bg-red-100 text-red-600'
              : 'text-zinc-400 hover:bg-red-50 hover:text-red-500'
          }`}
        >
          <ThumbsDown className="h-3 w-3" />
          Não
        </button>
      </div>

      {mostrarComentario && avaliacao === 'ruim' && (
        <div className="space-y-2">
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="O que poderia ser melhor? (opcional)"
            rows={2}
            className="w-full resize-none rounded-xl border border-zinc-200 px-3 py-2 text-xs outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/10"
          />
          <div className="flex gap-2">
            <button
              onClick={() => handleSalvar()}
              disabled={pending}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              Enviar feedback
            </button>
            <button
              onClick={() => { setMostrarComentario(false); setAvaliacao(null) }}
              className="rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-100"
            >
              Cancelar
            </button>
          </div>
          {erro && <p className="text-xs text-red-600">{erro}</p>}
        </div>
      )}
    </div>
  )
}
