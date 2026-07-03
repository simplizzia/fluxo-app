'use client'

import { useState, useTransition } from 'react'
import { AlertTriangle, Pencil, Plus, Trash2, Upload, X } from 'lucide-react'
import { actionExcluirProduto, actionSalvarProduto, actionUploadImagem } from '../../actions'

const ANGULOS = ['frontal', '3-4', 'perfil', 'de-cima', 'sem-tampa'] as const
type Angulo = (typeof ANGULOS)[number]

interface Produto {
  id: string
  nome: string
  formato: string | null
  escala_relativa: string | null
  tampa: string | null
  regra_geracao: string | null
  restricao_conteudo: string | null
  alerta_contraste: string | null
  angulos_disponiveis: string[]
  imagem_referencia_path: string | null
}

const VAZIO = {
  nome: '', formato: '', escala_relativa: '', tampa: '',
  regra_geracao: 'sempre sem rótulo, silhueta neutra; rótulo real é composto depois no Photoshop',
  restricao_conteudo: '', alerta_contraste: '',
  angulos: ['frontal'] as Angulo[],
}

export function ProdutosClient({
  clienteId,
  produtos,
  urlsAssinadas,
  isAdmin,
}: {
  clienteId: string
  produtos: Produto[]
  urlsAssinadas: Record<string, string>
  isAdmin: boolean
}) {
  const [editando, setEditando] = useState<string | 'novo' | null>(null)
  const [form, setForm] = useState(VAZIO)
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, startTransition] = useTransition()

  function abrirNovo() {
    setForm(VAZIO)
    setEditando('novo')
    setErro(null)
  }

  function abrirEdicao(p: Produto) {
    setForm({
      nome: p.nome,
      formato: p.formato ?? '',
      escala_relativa: p.escala_relativa ?? '',
      tampa: p.tampa ?? '',
      regra_geracao: p.regra_geracao ?? '',
      restricao_conteudo: p.restricao_conteudo ?? '',
      alerta_contraste: p.alerta_contraste ?? '',
      angulos: p.angulos_disponiveis.filter((a): a is Angulo =>
        (ANGULOS as readonly string[]).includes(a),
      ),
    })
    setEditando(p.id)
    setErro(null)
  }

  function salvar() {
    startTransition(async () => {
      const res = await actionSalvarProduto({
        id: editando === 'novo' ? undefined : editando!,
        clienteId,
        nome: form.nome,
        formato: form.formato,
        escala_relativa: form.escala_relativa,
        tampa: form.tampa,
        regra_geracao: form.regra_geracao,
        restricao_conteudo: form.restricao_conteudo,
        alerta_contraste: form.alerta_contraste,
        angulos_disponiveis: form.angulos,
      })
      if (res.error) setErro(res.error)
      else setEditando(null)
    })
  }

  function excluir(produtoId: string) {
    if (!confirm('Excluir esta ficha de produto?')) return
    startTransition(async () => {
      const res = await actionExcluirProduto(produtoId, clienteId)
      if (res.error) setErro(res.error)
    })
  }

  function upload(produtoId: string, file: File) {
    const fd = new FormData()
    fd.set('arquivo', file)
    startTransition(async () => {
      const res = await actionUploadImagem('produto', produtoId, clienteId, fd)
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
          {produtos.length} produto{produtos.length !== 1 ? 's' : ''} — geometria e regras de cada SKU.
        </p>
        {isAdmin && (
          <button
            type="button"
            onClick={abrirNovo}
            className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-zinc-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Novo produto
          </button>
        )}
      </div>

      {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{erro}</p>}

      {/* Formulário inline (novo / edição) */}
      {editando && isAdmin && (
        <div className="space-y-3 rounded-2xl border border-zinc-300 bg-zinc-50/60 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink">
              {editando === 'novo' ? 'Novo produto' : 'Editar produto'}
            </h3>
            <button type="button" onClick={() => setEditando(null)} className="text-zinc-400 hover:text-zinc-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Nome *</label>
              <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className={inputCls} placeholder="ex: Frutas 150g" />
            </div>
            <div>
              <label className={labelCls}>Tampa</label>
              <input value={form.tampa} onChange={(e) => setForm({ ...form, tampa: e.target.value })} className={inputCls} placeholder="ex: prateada, larga" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Formato</label>
            <input value={form.formato} onChange={(e) => setForm({ ...form, formato: e.target.value })} className={inputCls} placeholder="ex: garrafa baixa/atarracada, corpo levemente cônico" />
          </div>
          <div>
            <label className={labelCls}>Escala relativa (compare com outro SKU quando possível)</label>
            <input value={form.escala_relativa} onChange={(e) => setForm({ ...form, escala_relativa: e.target.value })} className={inputCls} placeholder="ex: metade da altura da 800g" />
          </div>
          <div>
            <label className={labelCls}>Regra de geração</label>
            <textarea value={form.regra_geracao} onChange={(e) => setForm({ ...form, regra_geracao: e.target.value })} rows={2} className={inputCls} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Restrição de conteúdo</label>
              <textarea value={form.restricao_conteudo} onChange={(e) => setForm({ ...form, restricao_conteudo: e.target.value })} rows={2} className={inputCls} placeholder="ex: pedaços pequenos, nunca fatias grandes" />
            </div>
            <div>
              <label className={labelCls}>Alerta de contraste</label>
              <textarea value={form.alerta_contraste} onChange={(e) => setForm({ ...form, alerta_contraste: e.target.value })} rows={2} className={inputCls} placeholder="ex: fundo vermelho apaga o produto" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Ângulos de packshot disponíveis</label>
            <div className="flex flex-wrap gap-3">
              {ANGULOS.map((ang) => (
                <label key={ang} className="flex items-center gap-1.5 text-xs text-zinc-700">
                  <input
                    type="checkbox"
                    checked={form.angulos.includes(ang)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        angulos: e.target.checked
                          ? [...form.angulos, ang]
                          : form.angulos.filter((a) => a !== ang),
                      })
                    }
                  />
                  {ang}
                </label>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={salvar}
            disabled={pendente || !form.nome.trim()}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:opacity-50"
          >
            {pendente ? 'Salvando…' : 'Salvar produto'}
          </button>
        </div>
      )}

      {/* Lista */}
      {produtos.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-10 text-center">
          <p className="text-sm text-zinc-400">Nenhuma ficha de produto ainda.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <div className="divide-y divide-zinc-100">
            {produtos.map((p) => {
              const soFrontal = p.angulos_disponiveis.length <= 1
              const url = p.imagem_referencia_path ? urlsAssinadas[p.imagem_referencia_path] : null
              return (
                <div key={p.id} className="flex gap-4 px-5 py-4">
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={p.nome} className="h-16 w-16 flex-none rounded-xl border border-zinc-100 object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 flex-none items-center justify-center rounded-xl bg-zinc-100 text-[10px] text-zinc-400">
                      sem foto
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-900">{p.nome}</span>
                      {soFrontal && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                          <AlertTriangle className="h-3 w-3" />
                          só packshot frontal
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {[p.formato, p.escala_relativa, p.tampa && `tampa: ${p.tampa}`].filter(Boolean).join(' · ')}
                    </p>
                    {p.restricao_conteudo && (
                      <p className="mt-1 text-[11px] text-red-600">⚠ {p.restricao_conteudo}</p>
                    )}
                    {p.alerta_contraste && (
                      <p className="mt-0.5 text-[11px] text-amber-600">◐ {p.alerta_contraste}</p>
                    )}
                    <p className="mt-1 text-[11px] text-zinc-400">
                      ângulos: {p.angulos_disponiveis.join(', ') || '—'}
                    </p>
                  </div>
                  {isAdmin && (
                    <div className="flex flex-none items-start gap-1">
                      <label className="cursor-pointer rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600" title="Enviar packshot de referência">
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
                      <button type="button" onClick={() => abrirEdicao(p)} className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600" title="Editar">
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
        </div>
      )}
    </div>
  )
}
