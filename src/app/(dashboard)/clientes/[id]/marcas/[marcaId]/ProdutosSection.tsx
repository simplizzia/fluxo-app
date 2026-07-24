'use client'

import { useState, useTransition } from 'react'
import { Package, Plus, Pencil, Trash2 } from 'lucide-react'
import { InlineError } from '@/components/shared/InlineError'
import { salvarProduto, excluirProduto } from './produtos-actions'
import { STATUS_PRODUTO_LABEL, type Produto, type StatusProduto } from './produtos-shared'

const STATUS_ORDEM: StatusProduto[] = [
  'ativo',
  'nao_lancado',
  'producao_incerta',
  'descontinuado',
  'fora_de_escopo',
]

const STATUS_COR: Record<StatusProduto, string> = {
  ativo: 'bg-green-100 text-green-700',
  nao_lancado: 'bg-amber-100 text-amber-700',
  producao_incerta: 'bg-orange-100 text-orange-700',
  descontinuado: 'bg-zinc-100 text-zinc-500',
  fora_de_escopo: 'bg-red-100 text-red-600',
}

interface Props {
  clienteId: string
  marcaId: string
  produtosIniciais: Produto[]
  podeEditar: boolean
}

const VAZIO = {
  nome: '',
  sku: '',
  sabor: '',
  categoria: '',
  status: 'ativo' as StatusProduto,
  publico: '',
  observacoes: '',
}

export default function ProdutosSection({ clienteId, marcaId, produtosIniciais, podeEditar }: Props) {
  const [produtos, setProdutos] = useState<Produto[]>(produtosIniciais)
  const [editando, setEditando] = useState<Produto | 'novo' | null>(null)
  const [form, setForm] = useState(VAZIO)
  const [erro, setErro] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function abrirNovo() {
    setForm(VAZIO)
    setEditando('novo')
    setErro(null)
  }

  function abrirEdicao(p: Produto) {
    setForm({
      nome: p.nome,
      sku: p.sku ?? '',
      sabor: p.sabor ?? '',
      categoria: p.categoria ?? '',
      status: p.status,
      publico: p.publico ?? '',
      observacoes: p.observacoes ?? '',
    })
    setEditando(p)
    setErro(null)
  }

  function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    startTransition(async () => {
      const res = await salvarProduto({
        id: editando === 'novo' ? undefined : editando!.id,
        clienteId,
        marcaId,
        ...form,
      })
      if (res.error || res.errors) {
        setErro(res.error ?? Object.values(res.errors!)[0]?.[0] ?? 'Erro ao salvar.')
        return
      }
      setProdutos((prev) => {
        const outros = prev.filter((p) => p.id !== res.produto!.id)
        return [...outros, res.produto!].sort(
          (a, b) =>
            STATUS_ORDEM.indexOf(a.status) - STATUS_ORDEM.indexOf(b.status) ||
            a.nome.localeCompare(b.nome),
        )
      })
      setEditando(null)
    })
  }

  function handleExcluir(p: Produto) {
    if (!confirm(`Excluir "${p.nome}"?`)) return
    startTransition(async () => {
      const res = await excluirProduto(p.id)
      if (!res.error) setProdutos((prev) => prev.filter((x) => x.id !== p.id))
    })
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
            <Package className="h-5 w-5 text-brand" />
            Produtos
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Alimentam o contexto dos agentes de conteúdo e o controle de repetição de
            SKU no cronograma. Só produtos <strong>ativos</strong> entram nos posts.
          </p>
        </div>
        {podeEditar && (
          <button
            onClick={abrirNovo}
            className="flex flex-none items-center gap-1.5 rounded-xl bg-zinc-900 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-zinc-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Novo produto
          </button>
        )}
      </div>

      {produtos.length === 0 && editando === null ? (
        <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-400">
          <span className="font-medium text-brand">Izzi</span> · Nenhum produto cadastrado
          para esta marca ainda.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-2.5">Produto</th>
                <th className="px-4 py-2.5">Sabor</th>
                <th className="px-4 py-2.5">Categoria</th>
                <th className="px-4 py-2.5">Status</th>
                {podeEditar && <th className="px-4 py-2.5 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {produtos.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-zinc-800">{p.nome}</p>
                    {p.sku && <p className="text-xs text-zinc-400">SKU {p.sku}</p>}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-600">{p.sabor ?? '—'}</td>
                  <td className="px-4 py-2.5 text-zinc-600">{p.categoria ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_COR[p.status]}`}>
                      {STATUS_PRODUTO_LABEL[p.status]}
                    </span>
                  </td>
                  {podeEditar && (
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => abrirEdicao(p)}
                          className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                          aria-label={`Editar ${p.nome}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleExcluir(p)}
                          disabled={pending}
                          className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          aria-label={`Excluir ${p.nome}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Formulário inline de criação/edição */}
      {editando !== null && (
        <form
          onSubmit={handleSalvar}
          className="mt-3 space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4"
        >
          <p className="text-sm font-medium text-zinc-700">
            {editando === 'novo' ? 'Novo produto' : `Editando ${editando.nome}`}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-zinc-600">
              Nome
              <input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10"
              />
            </label>
            <label className="text-xs font-medium text-zinc-600">
              Sabor
              <input
                value={form.sabor}
                onChange={(e) => setForm({ ...form, sabor: e.target.value })}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10"
              />
            </label>
            <label className="text-xs font-medium text-zinc-600">
              Categoria
              <input
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                placeholder="Garrafa, Pouch, Bandeja…"
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10"
              />
            </label>
            <label className="text-xs font-medium text-zinc-600">
              SKU
              <input
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10"
              />
            </label>
            <label className="text-xs font-medium text-zinc-600">
              Status
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as StatusProduto })}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10"
              >
                {STATUS_ORDEM.map((s) => (
                  <option key={s} value={s}>{STATUS_PRODUTO_LABEL[s]}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-zinc-600">
              Público
              <input
                value={form.publico}
                onChange={(e) => setForm({ ...form, publico: e.target.value })}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10"
              />
            </label>
          </div>
          <label className="block text-xs font-medium text-zinc-600">
            Observações
            <textarea
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              rows={2}
              placeholder="Ex.: edição Copa excluída em 2026; claims permitidos."
              className="mt-1 w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10"
            />
          </label>
          {erro && <InlineError>{erro}</InlineError>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
            >
              {pending ? 'Salvando…' : 'Salvar'}
            </button>
            <button
              type="button"
              onClick={() => setEditando(null)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
