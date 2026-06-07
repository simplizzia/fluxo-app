'use client'

import { useState, useTransition } from 'react'
import { Gift, Plus, Sparkles, Trash2, X, Loader2, Check } from 'lucide-react'
import type {
  AtividadeParceiro,
  ParceiroPerfilResumo,
  TipoAtividade,
  StatusAtividade,
  SugestaoIzzi,
} from '@/app/(dashboard)/socias/pessoas/actions'
import {
  actionCriarAtividade,
  actionAtualizarStatusAtividade,
  actionExcluirAtividade,
  actionSugerirAtividadesIzzi,
} from '@/app/(dashboard)/socias/pessoas/actions'

interface Props {
  atividades: AtividadeParceiro[]
  perfis: ParceiroPerfilResumo[]
}

const TIPO_LABEL: Record<TipoAtividade, string> = {
  atividade_equipe: '👥 Atividade de equipe',
  brinde: '🎁 Brinde',
  mimo_individual: '💝 Mimo individual',
  reconhecimento: '🏆 Reconhecimento',
  evento: '🎉 Evento',
  celebracao: '🥂 Celebração',
  outro: '📌 Outro',
}

const STATUS_LABEL: Record<StatusAtividade, string> = {
  ideia: 'Ideia',
  planejada: 'Planejada',
  em_andamento: 'Em andamento',
  executada: 'Executada',
  cancelada: 'Cancelada',
}

const STATUS_COLORS: Record<StatusAtividade, string> = {
  ideia: 'bg-zinc-100 text-zinc-600',
  planejada: 'bg-blue-50 text-blue-700',
  em_andamento: 'bg-amber-50 text-amber-700',
  executada: 'bg-emerald-50 text-emerald-700',
  cancelada: 'bg-red-50 text-red-500',
}

const STATUS_AVANCAR: Partial<Record<StatusAtividade, StatusAtividade>> = {
  ideia: 'planejada',
  planejada: 'em_andamento',
  em_andamento: 'executada',
}

export function AbaAtividades({ atividades, perfis }: Props) {
  const [mostraForm, setMostraForm] = useState(false)
  const [mostraIzzi, setMostraIzzi] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [confirmExcluir, setConfirmExcluir] = useState<string | null>(null)

  // Form state
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [tipo, setTipo] = useState<TipoAtividade>('outro')
  const [destinatario, setDestinatario] = useState<'todos' | 'especificos'>('todos')
  const [dataPrevista, setDataPrevista] = useState('')
  const [custo, setCusto] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  // Izzi state
  const [izziContexto, setIzziContexto] = useState('')
  const [izziParceiros, setIzziParceiros] = useState<string[]>([])
  const [sugestoes, setSugestoes] = useState<SugestaoIzzi[]>([])
  const [izziLoading, setIzziLoading] = useState(false)
  const [izziErro, setIzziErro] = useState<string | null>(null)
  const [salvoId, setSalvoId] = useState<number | null>(null)

  function resetForm() {
    setTitulo(''); setDescricao(''); setTipo('outro'); setDestinatario('todos')
    setDataPrevista(''); setCusto(''); setErro(null)
  }

  function handleSubmit(e: React.FormEvent, geradoPorIa = false, tituloOverride?: string, descOverride?: string, tipoOverride?: TipoAtividade) {
    e.preventDefault()
    const t = tituloOverride ?? titulo
    const d = descOverride ?? descricao
    const ti = tipoOverride ?? tipo
    if (!t.trim()) { setErro('Título obrigatório.'); return }
    setErro(null)

    const fd = new FormData()
    fd.set('titulo', t)
    fd.set('descricao', d)
    fd.set('tipo', ti)
    fd.set('destinatario_tipo', destinatario)
    fd.set('parceiro_ids', '[]')
    fd.set('data_prevista', dataPrevista)
    fd.set('custo_estimado', custo)
    fd.set('gerado_por_ia', String(geradoPorIa))

    startTransition(async () => {
      try {
        await actionCriarAtividade(fd)
        resetForm()
        setMostraForm(false)
      } catch (err) {
        setErro(err instanceof Error ? err.message : 'Erro ao salvar.')
      }
    })
  }

  async function pedirSugestoes() {
    setIzziErro(null)
    setSugestoes([])
    setIzziLoading(true)
    try {
      const result = await actionSugerirAtividadesIzzi({
        parceiroIds: izziParceiros.length ? izziParceiros : undefined,
        contexto: izziContexto || undefined,
      })
      setSugestoes(result)
    } catch (err) {
      setIzziErro(err instanceof Error ? err.message : 'Erro ao consultar a Izzi.')
    } finally {
      setIzziLoading(false)
    }
  }

  function salvarSugestao(idx: number, s: SugestaoIzzi) {
    const fd = new FormData()
    fd.set('titulo', s.titulo)
    fd.set('descricao', `${s.descricao}\n\nJustificativa: ${s.justificativa}\nCusto estimado: ${s.custo_estimado}`)
    fd.set('tipo', s.tipo)
    fd.set('destinatario_tipo', 'todos')
    fd.set('parceiro_ids', '[]')
    fd.set('gerado_por_ia', 'true')

    startTransition(async () => {
      await actionCriarAtividade(fd)
      setSalvoId(idx)
      setTimeout(() => setSalvoId(null), 2500)
    })
  }

  function excluir(id: string) {
    startTransition(async () => {
      await actionExcluirAtividade(id)
      setConfirmExcluir(null)
    })
  }

  function avancarStatus(a: AtividadeParceiro) {
    const prox = STATUS_AVANCAR[a.status]
    if (!prox) return
    startTransition(async () => { await actionAtualizarStatusAtividade(a.id, prox) })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 text-sm text-zinc-500">
          {atividades.length} atividade(s) planejada(s)
        </div>
        <button
          onClick={() => { setMostraIzzi(false); resetForm(); setMostraForm(!mostraForm) }}
          className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition"
        >
          <Plus className="h-3.5 w-3.5" /> Nova atividade
        </button>
        <button
          onClick={() => { setMostraForm(false); setMostraIzzi(!mostraIzzi) }}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-pink-500 px-3 py-2 text-xs font-semibold text-white hover:opacity-90 transition"
        >
          <Sparkles className="h-3.5 w-3.5" /> Pedir sugestão à Izzi
        </button>
      </div>

      {/* Form nova atividade */}
      {mostraForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-800">Nova atividade</p>
            <button type="button" onClick={() => setMostraForm(false)} className="text-zinc-400 hover:text-zinc-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-600 mb-1">Título *</label>
              <input
                value={titulo} onChange={(e) => setTitulo(e.target.value)} required
                placeholder="Ex: Kit boas-vindas personalizado"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-600 mb-1">Descrição</label>
              <textarea
                value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2}
                placeholder="Detalhes da atividade..."
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-400 focus:outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Tipo</label>
              <select
                value={tipo} onChange={(e) => setTipo(e.target.value as TipoAtividade)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-violet-400 focus:outline-none"
              >
                {Object.entries(TIPO_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Data prevista</label>
              <input
                type="date" value={dataPrevista} onChange={(e) => setDataPrevista(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-violet-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Custo estimado (R$)</label>
              <input
                type="number" value={custo} onChange={(e) => setCusto(e.target.value)}
                placeholder="0,00" min="0" step="0.01"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-400 focus:outline-none"
              />
            </div>
          </div>
          {erro && <p className="text-xs text-red-600">{erro}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={isPending}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-700 disabled:opacity-50 transition">
              {isPending ? 'Salvando...' : 'Salvar atividade'}
            </button>
            <button type="button" onClick={() => setMostraForm(false)}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-700 transition">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Drawer Izzi */}
      {mostraIzzi && (
        <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-pink-50 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-pink-500 text-xs font-bold text-white">I</div>
              <p className="text-sm font-semibold text-violet-900">Pedir sugestão à Izzi</p>
            </div>
            <button onClick={() => setMostraIzzi(false)} className="text-zinc-400 hover:text-zinc-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-xs text-zinc-600 leading-relaxed">
            A Izzi vai analisar os perfis dos parceiros e sugerir atividades, mimos e ações de cultura personalizadas. 🎯
          </p>

          {/* Seleção de parceiros */}
          {perfis.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">
                Parceiros (opcional — vazio = todos)
              </label>
              <div className="max-h-32 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-2 space-y-1">
                {perfis.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={izziParceiros.includes(p.id)}
                      onChange={(e) =>
                        setIzziParceiros(e.target.checked
                          ? [...izziParceiros, p.id]
                          : izziParceiros.filter((id) => id !== p.id))
                      }
                      className="rounded border-zinc-300 text-violet-600"
                    />
                    <span className="text-xs text-zinc-700">{p.nome}</span>
                    {p.cidade && <span className="text-[10px] text-zinc-400">{p.cidade}</span>}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Contexto adicional (opcional)</label>
            <input
              value={izziContexto} onChange={(e) => setIzziContexto(e.target.value)}
              placeholder="Ex: aniversário da empresa, orçamento de R$100, mês das mães..."
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-400 focus:outline-none"
            />
          </div>

          {izziErro && <p className="text-xs text-red-600">{izziErro}</p>}

          <button
            onClick={pedirSugestoes} disabled={izziLoading || !perfis.length}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-pink-500 px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
          >
            {izziLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {izziLoading ? 'Izzi está pensando...' : 'Gerar sugestões'}
          </button>

          {/* Sugestões da Izzi */}
          {sugestoes.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-zinc-600">✨ Sugestões da Izzi</p>
              {sugestoes.map((s, i) => (
                <div key={i} className="rounded-xl border border-white bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                          {TIPO_LABEL[s.tipo]}
                        </span>
                        <span className="text-[10px] text-zinc-400">{s.custo_estimado}</span>
                      </div>
                      <p className="text-sm font-semibold text-zinc-900">{s.titulo}</p>
                      <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">{s.descricao}</p>
                      <p className="text-[11px] text-zinc-400 mt-1 italic">{s.justificativa}</p>
                    </div>
                    <button
                      onClick={() => salvarSugestao(i, s)}
                      disabled={isPending || salvoId === i}
                      className={[
                        'flex-none rounded-lg px-3 py-1.5 text-[10px] font-semibold transition flex items-center gap-1',
                        salvoId === i
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-50',
                      ].join(' ')}
                    >
                      {salvoId === i ? <><Check className="h-3 w-3" /> Salvo!</> : 'Salvar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lista de atividades */}
      {atividades.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Gift className="mb-3 h-9 w-9 text-zinc-300" />
          <p className="text-sm font-medium text-zinc-500">Nenhuma atividade planejada ainda.</p>
          <p className="mt-1 text-xs text-zinc-400">Crie uma ou peça sugestões à Izzi.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {atividades.map((a) => (
            <div key={a.id} className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[a.status]}`}>
                      {STATUS_LABEL[a.status]}
                    </span>
                    <span className="text-[10px] text-zinc-500">{TIPO_LABEL[a.tipo]}</span>
                    {a.gerado_por_ia && (
                      <span className="text-[10px] text-violet-500 flex items-center gap-0.5">
                        <Sparkles className="h-3 w-3" /> Izzi
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-zinc-900">{a.titulo}</p>
                  {a.descricao && <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{a.descricao}</p>}
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-zinc-400">
                    {a.data_prevista && (
                      <span>📅 {new Date(a.data_prevista).toLocaleDateString('pt-BR')}</span>
                    )}
                    {a.custo_estimado != null && (
                      <span>💰 R$ {a.custo_estimado.toFixed(2)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-none">
                  {STATUS_AVANCAR[a.status] && (
                    <button
                      onClick={() => avancarStatus(a)} disabled={isPending}
                      className="rounded-lg border border-zinc-200 px-2 py-1 text-[10px] font-medium text-zinc-600 hover:border-zinc-300 hover:text-zinc-800 disabled:opacity-50 transition"
                      title={`Avançar para "${STATUS_LABEL[STATUS_AVANCAR[a.status]!]}"`}
                    >
                      → {STATUS_LABEL[STATUS_AVANCAR[a.status]!]}
                    </button>
                  )}
                  {confirmExcluir === a.id ? (
                    <>
                      <button onClick={() => excluir(a.id)} disabled={isPending}
                        className="rounded-lg bg-red-500 px-2 py-1 text-[10px] font-semibold text-white hover:bg-red-600 disabled:opacity-50 transition">
                        Excluir
                      </button>
                      <button onClick={() => setConfirmExcluir(null)}
                        className="rounded-lg border border-zinc-200 px-2 py-1 text-[10px] text-zinc-500 hover:text-zinc-700 transition">
                        Não
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setConfirmExcluir(a.id)}
                      className="rounded-lg p-1.5 text-zinc-300 hover:bg-red-50 hover:text-red-400 transition">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
