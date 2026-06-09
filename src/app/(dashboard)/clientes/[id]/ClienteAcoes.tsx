'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, ArchiveRestore, Trash2, Loader2, X, AlertTriangle } from 'lucide-react'
import { actionArquivarCliente, actionExcluirCliente } from './actions'

interface Props {
  clienteId: string
  nome: string
  arquivado: boolean
  podeExcluir: boolean   // só sócia
}

export function ClienteAcoes({ clienteId, nome, arquivado, podeExcluir }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [erro, setErro] = useState('')
  const [mostrarExcluir, setMostrarExcluir] = useState(false)
  const [confirmacao, setConfirmacao] = useState('')

  function handleArquivar() {
    setErro('')
    start(async () => {
      const res = await actionArquivarCliente(clienteId, !arquivado)
      if (res.error) { setErro(res.error); return }
      router.refresh()
    })
  }

  function handleExcluir() {
    setErro('')
    start(async () => {
      const res = await actionExcluirCliente(clienteId, confirmacao)
      if (res.error) { setErro(res.error); return }
      router.push('/clientes')
    })
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={handleArquivar}
          disabled={pending}
          className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : arquivado ? <ArchiveRestore className="h-3.5 w-3.5" />
            : <Archive className="h-3.5 w-3.5" />}
          {arquivado ? 'Restaurar' : 'Arquivar'}
        </button>
        {podeExcluir && (
          <button
            onClick={() => { setMostrarExcluir(true); setConfirmacao(''); setErro('') }}
            className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Excluir
          </button>
        )}
      </div>
      {erro && !mostrarExcluir && <p className="mt-1.5 text-xs text-red-600">{erro}</p>}

      {/* Modal de confirmação de exclusão */}
      {mostrarExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !pending && setMostrarExcluir(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </div>
                <h2 className="text-base font-semibold text-zinc-900">Excluir cliente</h2>
              </div>
              <button onClick={() => !pending && setMostrarExcluir(false)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm leading-relaxed text-zinc-600">
              Isso apaga <strong>definitivamente</strong> o cliente <strong>{nome}</strong> e tudo ligado a ele:
              cards, universo da marca, briefings, onboarding, reuniões e moodboard. Não dá pra desfazer.
            </p>
            <p className="mt-2 text-sm text-zinc-600">
              Se for só pausar, prefira <strong>Arquivar</strong>. Para excluir mesmo, digite o nome do cliente abaixo:
            </p>

            <input
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              placeholder={nome}
              className="mt-3 w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
            />
            {erro && <p className="mt-2 text-xs text-red-600">{erro}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setMostrarExcluir(false)}
                disabled={pending}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleExcluir}
                disabled={pending || confirmacao.trim() !== nome.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Excluir definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
