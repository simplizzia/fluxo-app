'use client'

import { useState, useTransition } from 'react'
import { Pencil, Plus, Trash2, Upload, X } from 'lucide-react'
import { actionExcluirPersonagem, actionSalvarPersonagem, actionUploadImagem } from '../../actions'

interface Personagem {
  id: string
  nome: string
  descricao_fixa: string | null
  alerta_contaminacao: string | null
  imagem_referencia_path: string | null
}

const VAZIO = { nome: '', descricao_fixa: '', alerta_contaminacao: '' }

export function PersonagensClient({
  clienteId,
  personagens,
  urlsAssinadas,
  isAdmin,
}: {
  clienteId: string
  personagens: Personagem[]
  urlsAssinadas: Record<string, string>
  isAdmin: boolean
}) {
  const [editando, setEditando] = useState<string | 'novo' | null>(null)
  const [form, setForm] = useState(VAZIO)
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, startTransition] = useTransition()

  function salvar() {
    startTransition(async () => {
      const res = await actionSalvarPersonagem({
        id: editando === 'novo' ? undefined : editando!,
        clienteId,
        nome: form.nome,
        descricao_fixa: form.descricao_fixa,
        alerta_contaminacao: form.alerta_contaminacao,
      })
      if (res.error) setErro(res.error)
      else setEditando(null)
    })
  }

  function excluir(id: string) {
    if (!confirm('Excluir este personagem?')) return
    startTransition(async () => {
      const res = await actionExcluirPersonagem(id, clienteId)
      if (res.error) setErro(res.error)
    })
  }

  function upload(id: string, file: File) {
    const fd = new FormData()
    fd.set('arquivo', file)
    startTransition(async () => {
      const res = await actionUploadImagem('personagem', id, clienteId, fd)
      if (res.error) setErro(res.error)
    })
  }

  const inputCls =
    'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none'
  const labelCls = 'mb-1 block text-xs font-semibold text-zinc-600'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          Personagens recorrentes — traços que nunca mudam entre gerações (mascotes, avô da caneca…).
        </p>
        {isAdmin && (
          <button
            type="button"
            onClick={() => { setForm(VAZIO); setEditando('novo'); setErro(null) }}
            className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-zinc-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Novo personagem
          </button>
        )}
      </div>

      {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{erro}</p>}

      {editando && isAdmin && (
        <div className="space-y-3 rounded-2xl border border-zinc-300 bg-zinc-50/60 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink">
              {editando === 'novo' ? 'Novo personagem' : 'Editar personagem'}
            </h3>
            <button type="button" onClick={() => setEditando(null)} className="text-zinc-400 hover:text-zinc-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div>
            <label className={labelCls}>Nome *</label>
            <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className={inputCls} placeholder='ex: Avô — carrossel família' />
          </div>
          <div>
            <label className={labelCls}>Descrição fixa (o que NUNCA muda entre cenas)</label>
            <textarea value={form.descricao_fixa} onChange={(e) => setForm({ ...form, descricao_fixa: e.target.value })} rows={3} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Alerta de contaminação (opcional)</label>
            <input value={form.alerta_contaminacao} onChange={(e) => setForm({ ...form, alerta_contaminacao: e.target.value })} className={inputCls} placeholder="ex: referência tem marca concorrente visível — mascarar antes de usar" />
          </div>
          <button
            type="button"
            onClick={salvar}
            disabled={pendente || !form.nome.trim()}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:opacity-50"
          >
            {pendente ? 'Salvando…' : 'Salvar personagem'}
          </button>
        </div>
      )}

      {personagens.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-10 text-center">
          <p className="text-sm text-zinc-400">Nenhum personagem recorrente ainda.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {personagens.map((p) => {
            const url = p.imagem_referencia_path ? urlsAssinadas[p.imagem_referencia_path] : null
            return (
              <div key={p.id} className="flex gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt={p.nome} className="h-16 w-16 flex-none rounded-xl border border-zinc-100 object-cover" />
                ) : (
                  <div className="flex h-16 w-16 flex-none items-center justify-center rounded-xl bg-zinc-100 text-[10px] text-zinc-400">
                    sem ref.
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-zinc-900">{p.nome}</p>
                  {p.descricao_fixa && (
                    <p className="mt-0.5 line-clamp-3 text-xs text-zinc-500">{p.descricao_fixa}</p>
                  )}
                  {p.alerta_contaminacao && (
                    <p className="mt-1 rounded-lg bg-amber-50 px-2 py-1 text-[11px] text-amber-700">
                      ⚠️ {p.alerta_contaminacao}
                    </p>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex flex-none flex-col gap-1">
                    <label className="cursor-pointer rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600" title="Enviar imagem de referência">
                      <Upload className="h-4 w-4" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) upload(p.id, f)
                          e.target.value = ''
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForm({
                          nome: p.nome,
                          descricao_fixa: p.descricao_fixa ?? '',
                          alerta_contaminacao: p.alerta_contaminacao ?? '',
                        })
                        setEditando(p.id)
                        setErro(null)
                      }}
                      className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => excluir(p.id)} className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-red-50 hover:text-red-500" title="Excluir">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
