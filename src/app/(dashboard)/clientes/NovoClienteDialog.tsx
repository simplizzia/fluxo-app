'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { actionCriarCliente } from './actions'

export function NovoClienteDialog() {
  const [open, setOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState('')
  const [pending, start] = useTransition()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  function handleClose() {
    setOpen(false)
    setNome('')
    setErro('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    setErro('')
    start(async () => {
      const res = await actionCriarCliente(nome.trim())
      if (res.error) { setErro(res.error); return }
      handleClose()
      router.push(`/clientes/${res.id}`)
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
      >
        <Plus className="h-4 w-4" />
        Novo cliente
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Dialog */}
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900">Novo cliente</h2>
              <button onClick={handleClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="nome-cliente" className="block text-sm font-medium text-zinc-700">
                  Nome do cliente
                </label>
                <input
                  ref={inputRef}
                  id="nome-cliente"
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="ex: Studio Bloom"
                  disabled={pending}
                  className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/10 disabled:opacity-50"
                />
                {erro && <p className="text-xs text-red-600">{erro}</p>}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending || !nome.trim()}
                  className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50"
                >
                  {pending ? 'Criando...' : 'Criar cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
