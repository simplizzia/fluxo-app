'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Send, AlertTriangle, Trash2, Check, Loader2 } from 'lucide-react'
import { InlineError } from '@/components/shared/InlineError'
import {
  rodarEtapa,
  atualizarItem,
  excluirItem,
  enviarMensagemRevisao,
  aprovarCronograma,
  desmembrarCronograma,
  gerarAprendizados,
  salvarAprendizados,
} from '../actions'
import {
  ETAPAS,
  VIABILIDADE_LABEL,
  type EtapaChave,
  type CronogramaItem,
  type CronogramaMensagem,
  type CronogramaResumo,
  type ViabilidadeItem,
} from '../shared'
import { STATUS_CRONOGRAMA_LABEL, STATUS_CRONOGRAMA_COR } from '../status-ui'
import type { Produto } from '@/app/(dashboard)/clientes/[id]/marcas/[marcaId]/produtos-shared'

const MES_FMT = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
function mesLabel(data: string) {
  const [ano, mes] = data.split('-').map(Number)
  return MES_FMT.format(new Date(ano, mes - 1, 1))
}

const FORMATOS = ['reel', 'carrossel', 'estatico', 'story', 'video']
const VIABILIDADES: ViabilidadeItem[] = ['proposta', 'roteiro_a_fechar', 'so_ia', 'depende_registro']

interface Props {
  cronogramaId: string
  resumo: CronogramaResumo
  briefing?: string
  temasPilares?: string
  analiseCoerencia?: string
  itensIniciais: CronogramaItem[]
  mensagensIniciais: CronogramaMensagem[]
  produtos: Produto[]
  podeEditar: boolean
}

export function RevisaoCronograma(props: Props) {
  const router = useRouter()
  const { cronogramaId, resumo, produtos, podeEditar } = props
  const [itens, setItens] = useState(props.itensIniciais)
  const [mensagens, setMensagens] = useState(props.mensagensIniciais)
  const [etapaRodando, setEtapaRodando] = useState<EtapaChave | null>(null)
  const [chatTexto, setChatTexto] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [chatPending, startChat] = useTransition()
  const [acaoPending, startAcao] = useTransition()
  // Aprendizados (fechamento)
  const [aprendizados, setAprendizados] = useState<string | null>(null)
  const [aprendizadosSalvo, setAprendizadosSalvo] = useState(false)
  const [aprendPending, startAprend] = useTransition()

  const nomeProduto = useMemo(
    () => new Map(produtos.map((p) => [p.id, p.nome])),
    [produtos],
  )

  // Alerta de SKU repetido: produtos usados em mais de um post.
  const produtosRepetidos = useMemo(() => {
    const cont = new Map<string, number>()
    for (const it of itens) {
      if (it.produto_id) cont.set(it.produto_id, (cont.get(it.produto_id) ?? 0) + 1)
    }
    return new Set([...cont.entries()].filter(([, n]) => n > 1).map(([id]) => id))
  }, [itens])

  const finalizado = resumo.status === 'desmembrado'

  async function handleRodarEtapa(chave: EtapaChave) {
    setErro(null)
    setEtapaRodando(chave)
    const res = await rodarEtapa(cronogramaId, chave)
    setEtapaRodando(null)
    if (res.error) {
      setErro(res.error)
      return
    }
    // O calendário mexe nos itens; recarrega do servidor.
    router.refresh()
  }

  function handleEditarItem(id: string, campo: keyof CronogramaItem, valor: unknown) {
    setItens((prev) => prev.map((it) => (it.id === id ? { ...it, [campo]: valor } : it)))
  }

  async function salvarItem(id: string, campo: string, valor: unknown) {
    const res = await atualizarItem(id, { [campo]: valor })
    if (res.error) setErro(res.error)
  }

  async function handleExcluir(id: string) {
    if (!confirm('Excluir este post do cronograma?')) return
    setItens((prev) => prev.filter((it) => it.id !== id))
    await excluirItem(id)
  }

  function handleChat(e: React.FormEvent) {
    e.preventDefault()
    const texto = chatTexto.trim()
    if (!texto) return
    setErro(null)
    // Otimista: mostra a mensagem da equipe já.
    setMensagens((prev) => [
      ...prev,
      { id: `tmp-${Date.now()}`, papel: 'equipe', conteudo: texto, created_at: new Date().toISOString() },
    ])
    setChatTexto('')
    startChat(async () => {
      const res = await enviarMensagemRevisao(cronogramaId, texto)
      if (res.error) {
        setErro(res.error)
        return
      }
      router.refresh()
    })
  }

  function handleAprovar() {
    setErro(null)
    startAcao(async () => {
      const res = await aprovarCronograma(cronogramaId)
      if (res.error) { setErro(res.error); return }
      router.refresh()
    })
  }

  function handleDesmembrar() {
    setErro(null)
    startAcao(async () => {
      const res = await desmembrarCronograma(cronogramaId)
      if (res.error) { setErro(res.error); return }
      router.refresh()
    })
  }

  function handleGerarAprendizados() {
    setErro(null)
    setAprendizadosSalvo(false)
    startAprend(async () => {
      const res = await gerarAprendizados(cronogramaId)
      if (res.error) { setErro(res.error); return }
      setAprendizados(res.texto ?? '')
    })
  }

  function handleSalvarAprendizados() {
    if (!aprendizados) return
    setErro(null)
    startAprend(async () => {
      const res = await salvarAprendizados(cronogramaId, aprendizados)
      if (res.error) { setErro(res.error); return }
      setAprendizadosSalvo(true)
    })
  }

  return (
    <div>
      {/* Cabeçalho */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-ink">{resumo.marca_nome}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUS_CRONOGRAMA_COR[resumo.status]}`}>
              {STATUS_CRONOGRAMA_LABEL[resumo.status]}
            </span>
          </div>
          <p className="text-sm capitalize text-zinc-500">
            {resumo.cliente_nome} · {mesLabel(resumo.mes_referencia)}
          </p>
        </div>

        {podeEditar && !finalizado && (
          <div className="flex gap-2">
            {resumo.status !== 'aprovado' ? (
              <button
                onClick={handleAprovar}
                disabled={acaoPending || itens.length === 0}
                className="rounded-xl border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 transition hover:bg-green-100 disabled:opacity-50"
              >
                Aprovar cronograma
              </button>
            ) : (
              <button
                onClick={handleDesmembrar}
                disabled={acaoPending}
                className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
              >
                {acaoPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Gerar os cards
              </button>
            )}
          </div>
        )}
      </div>

      {erro && <InlineError className="mb-3">{erro}</InlineError>}

      {finalizado && (
        <div className="mb-4 space-y-3">
          <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700">
            Cronograma desmembrado — os posts viraram cards no board. Rodar de novo não duplica.
          </div>

          {/* Aprendizados do fechamento */}
          {podeEditar && (
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-700">Aprendizados deste mês</p>
                  <p className="text-[11px] text-zinc-400">
                    Destila o que se aprendeu para calibrar os próximos cronogramas da marca.
                  </p>
                </div>
                {aprendizados === null && (
                  <button
                    onClick={handleGerarAprendizados}
                    disabled={aprendPending}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-brand/30 hover:text-brand disabled:opacity-50"
                  >
                    {aprendPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    Gerar aprendizados
                  </button>
                )}
              </div>

              {aprendizados !== null && (
                <div className="mt-3">
                  <textarea
                    value={aprendizados}
                    onChange={(e) => { setAprendizados(e.target.value); setAprendizadosSalvo(false) }}
                    rows={6}
                    className="w-full resize-y rounded-lg border border-zinc-300 px-3 py-2 text-xs outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    {aprendizadosSalvo ? (
                      <span className="flex items-center gap-1.5 text-xs text-green-700">
                        <Check className="h-3.5 w-3.5" /> Salvo na aba Aprendizados da marca.
                      </span>
                    ) : (
                      <button
                        onClick={handleSalvarAprendizados}
                        disabled={aprendPending}
                        className="rounded-lg bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
                      >
                        {aprendPending ? 'Salvando…' : 'Aprovar e salvar na marca'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Etapas de geração */}
      {podeEditar && !finalizado && (
        <div className="mb-4 flex flex-wrap gap-2">
          {ETAPAS.map((etapa) => (
            <button
              key={etapa.chave}
              onClick={() => handleRodarEtapa(etapa.chave)}
              disabled={etapaRodando !== null}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-brand/30 hover:text-brand disabled:opacity-50"
            >
              {etapaRodando === etapa.chave ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {etapa.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Tabela de itens */}
        <div className="min-w-0">
          {itens.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 px-6 py-10 text-center text-sm text-zinc-500">
              <span className="font-medium text-brand">Izzi</span> · Rode a etapa{' '}
              <strong>Calendário</strong> para gerar os posts do mês.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50 text-left font-medium uppercase tracking-wide text-zinc-500">
                    <th className="px-2 py-2">Data</th>
                    <th className="px-2 py-2">Pilar</th>
                    <th className="px-2 py-2">Produto</th>
                    <th className="px-2 py-2">Formato</th>
                    <th className="px-2 py-2">Tema / Legenda</th>
                    <th className="px-2 py-2">Viabilidade</th>
                    {podeEditar && !finalizado && <th className="px-2 py-2"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {itens.map((it) => {
                    const skuRepetido = it.produto_id != null && produtosRepetidos.has(it.produto_id)
                    const somenteLeitura = !podeEditar || finalizado || it.card_id != null
                    return (
                      <tr key={it.id} className="align-top">
                        <td className="px-2 py-2 whitespace-nowrap">
                          <input
                            type="date"
                            defaultValue={it.data_publicacao ?? ''}
                            disabled={somenteLeitura}
                            onBlur={(e) => salvarItem(it.id, 'data_publicacao', e.target.value || null)}
                            className="w-32 rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-zinc-200 focus:border-brand/40 focus:outline-none disabled:text-zinc-500"
                          />
                          {it.horario && <div className="px-1 text-[10px] text-zinc-400">{it.horario}</div>}
                        </td>
                        <td className="px-2 py-2">
                          <input
                            defaultValue={it.pilar ?? ''}
                            disabled={somenteLeitura}
                            onBlur={(e) => salvarItem(it.id, 'pilar', e.target.value || null)}
                            className="w-24 rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-zinc-200 focus:border-brand/40 focus:outline-none disabled:text-zinc-500"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <select
                            value={it.produto_id ?? ''}
                            disabled={somenteLeitura}
                            onChange={(e) => {
                              const v = e.target.value || null
                              handleEditarItem(it.id, 'produto_id', v)
                              salvarItem(it.id, 'produto_id', v)
                            }}
                            className={`w-28 rounded border bg-transparent px-1 py-0.5 focus:outline-none disabled:text-zinc-500 ${skuRepetido ? 'border-amber-300 bg-amber-50' : 'border-transparent hover:border-zinc-200'}`}
                          >
                            <option value="">—</option>
                            {produtos.map((p) => (
                              <option key={p.id} value={p.id}>{p.nome}</option>
                            ))}
                          </select>
                          {skuRepetido && (
                            <div className="mt-0.5 flex items-center gap-1 px-1 text-[10px] text-amber-700">
                              <AlertTriangle className="h-3 w-3" /> repetido no mês
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <select
                            defaultValue={it.formato ?? ''}
                            disabled={somenteLeitura}
                            onChange={(e) => salvarItem(it.id, 'formato', e.target.value || null)}
                            className="w-24 rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-zinc-200 focus:border-brand/40 focus:outline-none disabled:text-zinc-500"
                          >
                            <option value="">—</option>
                            {FORMATOS.map((f) => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            defaultValue={it.tema ?? ''}
                            disabled={somenteLeitura}
                            onBlur={(e) => salvarItem(it.id, 'tema', e.target.value || null)}
                            placeholder="tema"
                            className="mb-1 w-full rounded border border-transparent bg-transparent px-1 py-0.5 font-medium text-zinc-800 hover:border-zinc-200 focus:border-brand/40 focus:outline-none disabled:text-zinc-500"
                          />
                          <textarea
                            defaultValue={it.legenda ?? ''}
                            disabled={somenteLeitura}
                            onBlur={(e) => salvarItem(it.id, 'legenda', e.target.value || null)}
                            placeholder="legenda"
                            rows={2}
                            className="w-full resize-none rounded border border-transparent bg-transparent px-1 py-0.5 text-zinc-500 hover:border-zinc-200 focus:border-brand/40 focus:outline-none disabled:text-zinc-400"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <select
                            defaultValue={it.viabilidade}
                            disabled={somenteLeitura}
                            onChange={(e) => salvarItem(it.id, 'viabilidade', e.target.value)}
                            className="w-32 rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-zinc-200 focus:border-brand/40 focus:outline-none disabled:text-zinc-500"
                          >
                            {VIABILIDADES.map((v) => (
                              <option key={v} value={v}>{VIABILIDADE_LABEL[v]}</option>
                            ))}
                          </select>
                          {it.card_id && (
                            <div className="mt-0.5 px-1 text-[10px] text-violet-500">já virou card</div>
                          )}
                        </td>
                        {podeEditar && !finalizado && (
                          <td className="px-2 py-2">
                            {!it.card_id && (
                              <button
                                onClick={() => handleExcluir(it.id)}
                                className="rounded p-1 text-zinc-300 transition hover:bg-red-50 hover:text-red-600"
                                aria-label="Excluir post"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {props.analiseCoerencia && (
            <details className="mt-3 rounded-xl border border-zinc-200 bg-white p-4">
              <summary className="cursor-pointer text-sm font-medium text-zinc-700">
                Análise de coerência
              </summary>
              <div className="mt-2 whitespace-pre-wrap text-xs text-zinc-600">{props.analiseCoerencia}</div>
            </details>
          )}
        </div>

        {/* Chat de revisão */}
        {podeEditar && !finalizado && (
          <div className="flex flex-col rounded-xl border border-zinc-200 bg-white">
            <div className="border-b border-zinc-100 px-4 py-2.5">
              <p className="text-sm font-medium text-zinc-700">Ajustes</p>
              <p className="text-[11px] text-zinc-400">
                Peça mudanças em linguagem natural — &ldquo;tira o post do dia 11&rdquo;,
                &ldquo;intercala as marcas&rdquo;.
              </p>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-3" style={{ maxHeight: 360 }}>
              {mensagens.length === 0 ? (
                <p className="text-center text-xs text-zinc-400">Nenhum ajuste ainda.</p>
              ) : (
                mensagens.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-xl px-3 py-2 text-xs ${
                      m.papel === 'equipe'
                        ? 'ml-6 bg-brand-light text-brand'
                        : 'mr-6 bg-zinc-50 text-zinc-600'
                    }`}
                  >
                    {m.conteudo}
                  </div>
                ))
              )}
              {chatPending && (
                <div className="mr-6 flex items-center gap-1.5 rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-400">
                  <Loader2 className="h-3 w-3 animate-spin" /> aplicando ajuste…
                </div>
              )}
            </div>
            <form onSubmit={handleChat} className="flex gap-2 border-t border-zinc-100 p-3">
              <input
                value={chatTexto}
                onChange={(e) => setChatTexto(e.target.value)}
                disabled={chatPending}
                placeholder="Escreva o ajuste…"
                className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-xs outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10"
              />
              <button
                type="submit"
                disabled={chatPending || !chatTexto.trim()}
                className="flex items-center justify-center rounded-lg bg-zinc-900 px-3 text-white transition hover:bg-zinc-800 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
