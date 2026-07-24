'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { InlineError } from '@/components/shared/InlineError'
import { criarCronograma } from './actions'
import { actionBuscarMarcasCliente, type MarcaBasica } from '@/app/(dashboard)/board/actions'
import type { ClienteSimples } from '@/app/(dashboard)/agentes/actions'

export function NovoCronogramaDialog({ clientes }: { clientes: ClienteSimples[] }) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [clienteId, setClienteId] = useState('')
  const [marcaId, setMarcaId] = useState('')
  const [marcas, setMarcas] = useState<MarcaBasica[]>([])
  const [mes, setMes] = useState('') // input type=month → 'AAAA-MM'
  const [erro, setErro] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    setMarcaId('')
    setMarcas([])
    if (!clienteId) return
    let cancelado = false
    actionBuscarMarcasCliente(clienteId).then(({ marcas }) => {
      if (!cancelado) setMarcas(marcas)
    })
    return () => { cancelado = true }
  }, [clienteId])

  function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    if (!clienteId || !mes) {
      setErro('Escolha o cliente e o mês.')
      return
    }
    if (marcas.length > 0 && !marcaId) {
      setErro('Escolha a marca.')
      return
    }
    startTransition(async () => {
      const res = await criarCronograma({
        clienteId,
        marcaId: marcaId || marcas[0]?.id || '',
        mesReferencia: `${mes}-01`,
      })
      if (res.error) {
        setErro(res.error)
        return
      }
      router.push(`/cronogramas/${res.id}`)
    })
  }

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="flex flex-none items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
      >
        <Plus className="h-4 w-4" />
        Novo cronograma
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setAberto(false) }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900">Novo cronograma</h2>
              <button onClick={() => setAberto(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCriar} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700">Cliente</label>
                <select
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10"
                >
                  <option value="">Selecione…</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              {marcas.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-700">Marca</label>
                  <select
                    value={marcaId}
                    onChange={(e) => setMarcaId(e.target.value)}
                    required
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10"
                  >
                    <option value="">Selecione…</option>
                    {marcas.map((m) => (
                      <option key={m.id} value={m.id}>{m.nome}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700">Mês</label>
                <input
                  type="month"
                  value={mes}
                  onChange={(e) => setMes(e.target.value)}
                  required
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10"
                />
              </div>

              {erro && <InlineError>{erro}</InlineError>}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setAberto(false)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-600 transition hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
                >
                  {pending ? 'Criando…' : 'Criar e abrir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
