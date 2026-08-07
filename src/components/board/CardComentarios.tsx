'use client'

import { useEffect, useMemo, useState } from 'react'
import { Send } from 'lucide-react'
import {
  actionBuscarComentarios,
  actionCriarComentario,
  actionBuscarEquipe,
} from '@/app/(dashboard)/board/actions'
import type { Comentario, PapelUsuario } from '@/types/database'

// ---------------------------------------------------------------------------
// Comentários do card — coluna da direita do modal.
//
// Duas abas: "Com o cliente" e "Interno". A SEGURANÇA é do RLS (o executor só
// recebe do banco o interno direcionado a ele; o cliente só o thread dele) —
// aqui é só a UX. Líderes (socia/gestao/atendimento) veem as duas abas e podem
// direcionar um comentário interno a pessoas específicas (é o que faz o
// executor ver só o que é dele). Executor: só a aba Interno.
// ---------------------------------------------------------------------------

type Membro = { id: string; nome: string; papel: PapelUsuario }
const LIDERES: PapelUsuario[] = ['socia', 'gestao', 'atendimento']

const primeiroNome = (nome: string) => nome.split(' ')[0]

function quando(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) +
    ' · ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function CardComentarios({
  cardId,
  papelAtual,
  refreshKey,
}: {
  cardId: string
  papelAtual: PapelUsuario
  refreshKey?: number
}) {
  const ehLider = LIDERES.includes(papelAtual)
  const [comentarios, setComentarios] = useState<Comentario[]>([])
  const [membros, setMembros] = useState<Membro[]>([])
  const [loading, setLoading] = useState(true)
  const [aba, setAba] = useState<'cliente' | 'interno'>(ehLider ? 'cliente' : 'interno')
  const [texto, setTexto] = useState('')
  const [direcionar, setDirecionar] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    setLoading(true)
    actionBuscarComentarios(cardId)
      .then((r) => {
        if (!vivo) return
        setComentarios(r.comentarios ?? [])
        setLoading(false)
      })
      .catch(() => vivo && setLoading(false))
    return () => {
      vivo = false
    }
  }, [cardId, refreshKey])

  useEffect(() => {
    let vivo = true
    actionBuscarEquipe()
      .then((r) => vivo && setMembros(r.membros))
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [])

  const nomePorId = useMemo(() => {
    const m = new Map<string, string>()
    membros.forEach((x) => m.set(x.id, x.nome))
    return m
  }, [membros])

  const lista = comentarios.filter((c) =>
    aba === 'cliente' ? c.visivel_para_cliente : !c.visivel_para_cliente,
  )

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    const t = texto.trim()
    if (!t) return
    setErro(null)
    setEnviando(true)
    const visivelCliente = aba === 'cliente'
    const r = await actionCriarComentario(
      cardId,
      t,
      visivelCliente,
      visivelCliente ? [] : direcionar,
    )
    setEnviando(false)
    if (r.error) {
      setErro(r.error)
      return
    }
    if (r.comentario) {
      setComentarios((p) => [...p, r.comentario!])
      setTexto('')
      setDirecionar([])
    }
  }

  function toggleDirecionar(id: string) {
    setDirecionar((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  }

  return (
    <div className="flex h-full flex-col">
      {/* Cabeçalho + abas */}
      <div className="flex-none border-b border-zinc-100 px-4 pt-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Comentários
        </p>
        {ehLider && (
          <div className="flex gap-1">
            {(['cliente', 'interno'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setAba(t)}
                className={[
                  'rounded-t-lg px-3 py-1.5 text-xs font-medium transition',
                  aba === t
                    ? 'bg-brand-light text-brand'
                    : 'text-zinc-400 hover:text-zinc-600',
                ].join(' ')}
              >
                {t === 'cliente' ? 'Com o cliente' : 'Interno'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <p className="text-center text-sm text-zinc-400">Carregando…</p>
        ) : lista.length === 0 ? (
          <p className="text-center text-sm text-zinc-400">
            {aba === 'cliente'
              ? 'Nenhuma conversa com o cliente ainda.'
              : 'Nenhum comentário interno ainda.'}
          </p>
        ) : (
          <ul className="space-y-3">
            {lista.map((c) => (
              <li key={c.id} className="rounded-xl bg-zinc-50 p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-zinc-700">
                    {c.autor?.nome ?? 'Equipe'}
                  </span>
                  <span className="text-[10px] text-zinc-400">{quando(c.created_at)}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-zinc-700">{c.texto}</p>
                {!c.visivel_para_cliente && c.direcionado_a && c.direcionado_a.length > 0 && (
                  <p className="mt-1.5 text-[10px] text-zinc-400">
                    → {c.direcionado_a.map((id) => primeiroNome(nomePorId.get(id) ?? '…')).join(', ')}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Composição */}
      <form onSubmit={enviar} className="flex-none space-y-2 border-t border-zinc-100 p-4">
        {/* Direcionamento (só na aba interno) */}
        {aba === 'interno' && membros.length > 0 && (
          <div>
            <p className="mb-1 text-[10px] font-medium text-zinc-400">
              Direcionar a (quem não estiver aqui não vê):
            </p>
            <div className="flex flex-wrap gap-1">
              {membros
                .filter((m) => m.papel === 'executor' || LIDERES.includes(m.papel))
                .map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleDirecionar(m.id)}
                    className={[
                      'rounded-full px-2 py-0.5 text-[11px] transition',
                      direcionar.includes(m.id)
                        ? 'bg-brand text-white'
                        : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200',
                    ].join(' ')}
                  >
                    {primeiroNome(m.nome)}
                  </button>
                ))}
            </div>
          </div>
        )}

        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={aba === 'cliente' ? 'Escrever para o cliente…' : 'Comentário interno…'}
          rows={2}
          disabled={enviando}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && texto.trim()) {
              e.preventDefault()
              enviar(e as unknown as React.FormEvent)
            }
          }}
          className="w-full resize-none rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/10 disabled:opacity-50"
        />
        {erro && <p className="text-xs text-red-600">{erro}</p>}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-zinc-400">
            {aba === 'cliente' ? 'Visível ao cliente' : 'Interno — cliente nunca vê'}
          </span>
          <button
            type="submit"
            disabled={!texto.trim() || enviando}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-brand px-3.5 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-3 w-3" />
            {enviando ? 'Enviando…' : 'Comentar'}
          </button>
        </div>
      </form>
    </div>
  )
}
