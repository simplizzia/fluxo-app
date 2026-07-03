'use client'

import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import {
  actionAtualizarStatusAtributo,
  actionCriarAtributo,
  actionCriarCategoria,
} from '../../actions'

interface Categoria { id: string; tipo: string }
interface Atributo { id: string; categoria_id: string; valor: string; vezes_usado: number; status: string }

const STATUS_CLASSES: Record<string, string> = {
  aprovado: 'bg-green-100 text-green-700 border-green-200',
  testando: 'bg-blue-100 text-blue-700 border-blue-200',
  reprovado: 'bg-red-100 text-red-600 border-red-200',
}

export function VariacoesClient({
  clienteId,
  categorias,
  atributos,
  isAdmin,
}: {
  clienteId: string
  categorias: Categoria[]
  atributos: Atributo[]
  isAdmin: boolean
}) {
  const [novaCategoria, setNovaCategoria] = useState('')
  const [novoAtributo, setNovoAtributo] = useState<Record<string, string>>({})
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, startTransition] = useTransition()

  function criarCategoria() {
    startTransition(async () => {
      const res = await actionCriarCategoria(clienteId, novaCategoria)
      if (res.error) setErro(res.error)
      else { setNovaCategoria(''); setErro(null) }
    })
  }

  function criarAtributo(categoriaId: string) {
    startTransition(async () => {
      const res = await actionCriarAtributo(clienteId, categoriaId, novoAtributo[categoriaId] ?? '')
      if (res.error) setErro(res.error)
      else { setNovoAtributo((prev) => ({ ...prev, [categoriaId]: '' })); setErro(null) }
    })
  }

  function mudarStatus(atributoId: string, status: 'aprovado' | 'testando' | 'reprovado') {
    startTransition(async () => {
      const res = await actionAtualizarStatusAtributo(clienteId, atributoId, status)
      if (res.error) setErro(res.error)
    })
  }

  const inputCls =
    'rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none'

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">
        Pool de atributos aprovados para variar entre cenas sem fugir do padrão.
        O contador incrementa quando uma cena com o atributo é aprovada.
      </p>

      {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{erro}</p>}

      {isAdmin && (
        <div className="flex gap-2">
          <input
            value={novaCategoria}
            onChange={(e) => setNovaCategoria(e.target.value)}
            placeholder="Nova categoria (ex: Roupa — avô)"
            className={`${inputCls} flex-1`}
          />
          <button
            type="button"
            onClick={criarCategoria}
            disabled={pendente || !novaCategoria.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-zinc-700 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Categoria
          </button>
        </div>
      )}

      {categorias.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-10 text-center">
          <p className="text-sm text-zinc-400">Nenhuma categoria de variação ainda.</p>
        </div>
      ) : (
        categorias.map((cat) => {
          const doGrupo = atributos.filter((a) => a.categoria_id === cat.id)
          return (
            <div key={cat.id} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              <div className="border-b border-zinc-100 bg-zinc-50/60 px-5 py-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">{cat.tipo}</h3>
              </div>
              <div className="divide-y divide-zinc-50">
                {doGrupo.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                    <p className={`min-w-0 flex-1 text-sm ${a.status === 'reprovado' ? 'text-zinc-400 line-through' : 'text-zinc-800'}`}>
                      {a.valor}
                    </p>
                    <span className="flex-none rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                      usado {a.vezes_usado}x
                    </span>
                    {isAdmin ? (
                      <select
                        value={a.status}
                        onChange={(e) => mudarStatus(a.id, e.target.value as 'aprovado' | 'testando' | 'reprovado')}
                        className={`flex-none rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_CLASSES[a.status] ?? ''}`}
                      >
                        <option value="aprovado">aprovado</option>
                        <option value="testando">testando</option>
                        <option value="reprovado">reprovado</option>
                      </select>
                    ) : (
                      <span className={`flex-none rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_CLASSES[a.status] ?? ''}`}>
                        {a.status}
                      </span>
                    )}
                  </div>
                ))}
                {doGrupo.length === 0 && (
                  <p className="px-5 py-3 text-xs text-zinc-400">Nenhum atributo nesta categoria.</p>
                )}
              </div>
              {isAdmin && (
                <div className="flex gap-2 border-t border-zinc-100 px-5 py-3">
                  <input
                    value={novoAtributo[cat.id] ?? ''}
                    onChange={(e) => setNovoAtributo((prev) => ({ ...prev, [cat.id]: e.target.value }))}
                    placeholder="Novo atributo aprovado…"
                    className={`${inputCls} flex-1 text-xs`}
                  />
                  <button
                    type="button"
                    onClick={() => criarAtributo(cat.id)}
                    disabled={pendente || !(novoAtributo[cat.id] ?? '').trim()}
                    className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
                  >
                    Adicionar
                  </button>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
