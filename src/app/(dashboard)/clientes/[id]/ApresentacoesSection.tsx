'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Plus, ExternalLink, Globe, Archive, Pencil, Trash2, Presentation } from 'lucide-react'
import {
  actionCriarApresentacao,
  actionExcluirApresentacao,
  type Apresentacao,
} from './apresentacao-actions'

interface Props {
  clienteId: string
  apresentacoes: Apresentacao[]
  appUrl: string
}

const statusLabel: Record<string, string> = {
  rascunho: 'Rascunho',
  publicada: 'Publicada',
  arquivada: 'Arquivada',
}

const statusColor: Record<string, string> = {
  rascunho:  'bg-zinc-100 text-zinc-500',
  publicada: 'bg-green-50 text-green-700',
  arquivada: 'bg-amber-50 text-amber-600',
}

export default function ApresentacoesSection({ clienteId, apresentacoes, appUrl }: Props) {
  const [criando, setCriando] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [pending, start] = useTransition()
  const [erro, setErro] = useState('')

  function handleCriar() {
    if (!titulo.trim()) return
    setErro('')
    start(async () => {
      const res = await actionCriarApresentacao(clienteId, titulo.trim())
      if (res.error) { setErro(res.error); return }
      setCriando(false)
      setTitulo('')
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Presentation className="h-4 w-4 text-zinc-400" />
          <span className="text-sm font-semibold text-zinc-700">
            Apresentações ({apresentacoes.length})
          </span>
        </div>
        {!criando && (
          <button
            onClick={() => setCriando(true)}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-brand/30 hover:text-brand"
          >
            <Plus className="h-3.5 w-3.5" /> Nova apresentação
          </button>
        )}
      </div>

      {criando && (
        <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-4 space-y-3">
          <p className="text-sm font-semibold text-zinc-700">Nova apresentação</p>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Título</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="ex: Proposta de Social Media — Jun/2026"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCriar()}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10"
            />
          </div>
          {erro && <p className="text-xs text-red-500">{erro}</p>}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setCriando(false); setTitulo(''); setErro('') }}
              className="rounded-xl border border-zinc-200 px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleCriar}
              disabled={pending || !titulo.trim()}
              className="rounded-xl bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {pending ? 'Criando...' : 'Criar'}
            </button>
          </div>
        </div>
      )}

      {apresentacoes.length === 0 && !criando && (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-5 py-8 text-center">
          <Presentation className="mx-auto mb-2 h-8 w-8 text-zinc-300" />
          <p className="text-sm text-zinc-400">Nenhuma apresentação criada ainda.</p>
          <p className="mt-1 text-xs text-zinc-400">
            Crie uma apresentação web que o cliente acessa por link — sem reenviar arquivos.
          </p>
        </div>
      )}

      {apresentacoes.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white divide-y divide-zinc-100">
          {apresentacoes.map((ap) => (
            <ApresentacaoRow
              key={ap.id}
              apresentacao={ap}
              clienteId={clienteId}
              appUrl={appUrl}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ApresentacaoRow({
  apresentacao,
  clienteId,
  appUrl,
}: {
  apresentacao: Apresentacao
  clienteId: string
  appUrl: string
}) {
  const [excluirPending, startExcluir] = useTransition()
  const [confirmando, setConfirmando] = useState(false)

  const urlPublica = `${appUrl}/apresentacoes/${apresentacao.token}`

  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-zinc-800">{apresentacao.titulo}</p>
          <span className={`flex-none rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor[apresentacao.status]}`}>
            {statusLabel[apresentacao.status]}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-zinc-400">
          Atualizada em {new Date(apresentacao.updated_at).toLocaleDateString('pt-BR')}
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        {apresentacao.status === 'publicada' && (
          <a
            href={urlPublica}
            target="_blank"
            rel="noopener noreferrer"
            title="Ver link público"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-green-50 hover:text-green-600"
          >
            <Globe className="h-4 w-4" />
          </a>
        )}
        <Link
          href={`/clientes/${clienteId}/apresentacoes/${apresentacao.id}`}
          title="Editar"
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        >
          <Pencil className="h-4 w-4" />
        </Link>
        {confirmando ? (
          <div className="flex items-center gap-1">
            <span className="text-xs text-zinc-500">Excluir?</span>
            <button
              onClick={() => startExcluir(async () => {
                await actionExcluirApresentacao(apresentacao.id, clienteId)
                setConfirmando(false)
              })}
              disabled={excluirPending}
              className="rounded-lg px-2 py-0.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {excluirPending ? '...' : 'Sim'}
            </button>
            <button onClick={() => setConfirmando(false)} className="rounded-lg px-2 py-0.5 text-xs text-zinc-500 hover:bg-zinc-100">
              Não
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmando(true)}
            title="Excluir"
            className="rounded-lg p-1.5 text-zinc-300 hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
