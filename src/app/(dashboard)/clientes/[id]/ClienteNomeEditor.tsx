'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { actionRenomearCliente } from './actions'

interface Props {
  clienteId: string
  nomeInicial: string
  status: string
}

export function ClienteNomeEditor({ clienteId, nomeInicial, status }: Props) {
  const [editando, setEditando] = useState(false)
  const [nome, setNome] = useState(nomeInicial)
  const [erro, setErro] = useState('')
  const [pending, start] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editando) inputRef.current?.select()
  }, [editando])

  function handleSalvar() {
    if (!nome.trim() || nome.trim() === nomeInicial) { setEditando(false); return }
    setErro('')
    start(async () => {
      const res = await actionRenomearCliente(clienteId, nome.trim())
      if (res.error) { setErro(res.error); return }
      setEditando(false)
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSalvar()
    if (e.key === 'Escape') { setNome(nomeInicial); setEditando(false); setErro('') }
  }

  if (editando) {
    return (
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={pending}
            className="font-display text-2xl font-bold text-ink rounded-lg border border-brand/40 bg-white px-2 py-0.5 outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-50 w-full max-w-xs"
          />
          <button
            onClick={handleSalvar}
            disabled={pending || !nome.trim()}
            className="flex-none rounded-lg bg-zinc-900 p-1.5 text-white transition hover:bg-zinc-700 disabled:opacity-40"
            title="Salvar"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => { setNome(nomeInicial); setEditando(false); setErro('') }}
            className="flex-none rounded-lg border border-zinc-200 p-1.5 text-zinc-500 transition hover:bg-zinc-100"
            title="Cancelar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
      </div>
    )
  }

  return (
    <div className="min-w-0">
      <div className="group flex items-center gap-2">
        <h1 className="font-display text-2xl font-bold text-ink truncate">{nome}</h1>
        <button
          onClick={() => setEditando(true)}
          className="flex-none rounded-lg p-1 text-zinc-300 opacity-0 transition group-hover:opacity-100 hover:bg-zinc-100 hover:text-zinc-600"
          title="Renomear cliente"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="text-sm text-zinc-500 capitalize">{status}</p>
    </div>
  )
}
