'use client'

import { useState, useTransition } from 'react'
import { ArrowUpRight, Flame, Trash2, X } from 'lucide-react'
import { actionDescartarCaso, actionPromoverCaso } from '../actions'

interface Caso {
  id: string
  cliente_id: string
  cliente_nome: string
  escopo_do_erro: string
  dimensao_regua: string | null
  descricao_erro: string
  correcao_aplicada: string | null
  vezes_visto: number
  status: string
  promovido_para: string | null
  promovido_em: string | null
  created_at: string
}
interface Produto { id: string; cliente_id: string; nome: string }

const LIMIAR_PROMOCAO = 3

type Destino = 'bloco_mestre' | 'ficha_produto' | 'patch_tecnico'

export function CalibracaoClient({ casos, produtos }: { casos: Caso[]; produtos: Produto[] }) {
  const [promovendo, setPromovendo] = useState<string | null>(null)
  const [destino, setDestino] = useState<Destino>('bloco_mestre')
  const [textoFinal, setTextoFinal] = useState('')
  const [produtoId, setProdutoId] = useState('')
  const [patchNome, setPatchNome] = useState('')
  const [patchPalavras, setPatchPalavras] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, startTransition] = useTransition()

  const candidatos = casos.filter((c) => c.status === 'candidato')
  const historico = casos.filter((c) => c.status !== 'candidato')

  function abrirPromocao(caso: Caso) {
    setPromovendo(caso.id)
    setDestino('bloco_mestre')
    // preview editável: parte da correção que funcionou, se registrada
    setTextoFinal(caso.correcao_aplicada ?? '')
    setProdutoId('')
    setPatchNome('')
    setPatchPalavras('')
    setErro(null)
  }

  function promover(caso: Caso) {
    startTransition(async () => {
      const res = await actionPromoverCaso({
        casoId: caso.id,
        destino,
        texto_final: textoFinal,
        produto_id: destino === 'ficha_produto' ? produtoId || null : null,
        patch_nome: patchNome,
        patch_palavras_chave: patchPalavras.split(',').map((p) => p.trim()).filter(Boolean),
      })
      if (res.error) setErro(res.error)
      else setPromovendo(null)
    })
  }

  function descartar(casoId: string) {
    if (!confirm('Descartar este caso? (não era padrão, era exceção pontual)')) return
    startTransition(async () => {
      const res = await actionDescartarCaso(casoId)
      if (res.error) setErro(res.error)
    })
  }

  const inputCls =
    'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none'

  return (
    <div className="space-y-6">
      {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{erro}</p>}

      {/* ── Fila de candidatos ─────────────────────────────────────── */}
      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Fila de casos ({candidatos.length})
        </h2>
        {candidatos.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-8 text-center">
            <p className="text-sm text-zinc-400">Nenhum caso na fila — bons prompts por aí. 🎉</p>
          </div>
        ) : (
          <div className="space-y-2">
            {candidatos.map((caso) => {
              const pronto = caso.vezes_visto >= LIMIAR_PROMOCAO
              const universal = caso.escopo_do_erro === 'tecnico_universal'
              return (
                <div
                  key={caso.id}
                  className={`rounded-2xl border bg-white p-4 ${pronto ? 'border-amber-300 ring-1 ring-amber-200' : 'border-zinc-200'}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-bold text-white">
                      {caso.vezes_visto}x
                    </span>
                    {pronto && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                        <Flame className="h-3 w-3" />
                        pronto para promoção
                      </span>
                    )}
                    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                      {caso.cliente_nome}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${universal ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-purple-200 bg-purple-50 text-purple-700'}`}>
                      {universal ? 'técnico universal' : 'específico do cliente'}
                    </span>
                    {caso.dimensao_regua && (
                      <span className="text-[10px] text-zinc-400">{caso.dimensao_regua}</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-zinc-800">{caso.descricao_erro}</p>
                  {caso.correcao_aplicada && (
                    <p className="mt-1 rounded-lg bg-green-50 px-2.5 py-1.5 text-xs text-green-700">
                      <strong>Correção que funcionou:</strong> {caso.correcao_aplicada}
                    </p>
                  )}

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => abrirPromocao(caso)}
                      className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-zinc-700"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      Promover a regra
                    </button>
                    <button
                      type="button"
                      onClick={() => descartar(caso.id)}
                      disabled={pendente}
                      className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-50 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Descartar (exceção pontual)
                    </button>
                  </div>

                  {/* ── Form de promoção com preview editável ───────── */}
                  {promovendo === caso.id && (
                    <div className="mt-3 space-y-3 rounded-2xl border border-zinc-300 bg-zinc-50/70 p-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-ink">Promover a regra permanente</h4>
                        <button type="button" onClick={() => setPromovendo(null)} className="text-zinc-400 hover:text-zinc-600">
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-zinc-600">Destino</label>
                        <div className="flex flex-wrap gap-2">
                          <DestinoBtn ativo={destino === 'bloco_mestre'} onClick={() => setDestino('bloco_mestre')}>
                            Bloco Mestre ({caso.cliente_nome})
                          </DestinoBtn>
                          <DestinoBtn ativo={destino === 'ficha_produto'} onClick={() => setDestino('ficha_produto')}>
                            Ficha de Produto ({caso.cliente_nome})
                          </DestinoBtn>
                          <DestinoBtn
                            ativo={destino === 'patch_tecnico'}
                            onClick={() => universal && setDestino('patch_tecnico')}
                            desabilitado={!universal}
                            titulo={
                              universal
                                ? undefined
                                : 'Bloqueado: erro específico de um cliente nunca vira Patch global'
                            }
                          >
                            Patch Técnico (global)
                          </DestinoBtn>
                        </div>
                        {!universal && (
                          <p className="mt-1 text-[11px] text-purple-600">
                            Escopo “específico do cliente”: a promoção global fica bloqueada para a
                            regra deste cliente não vazar para as outras marcas.
                          </p>
                        )}
                      </div>

                      {destino === 'ficha_produto' && (
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-zinc-600">Produto de destino</label>
                          <select value={produtoId} onChange={(e) => setProdutoId(e.target.value)} className={inputCls}>
                            <option value="">— selecionar —</option>
                            {produtos
                              .filter((p) => p.cliente_id === caso.cliente_id)
                              .map((p) => (
                                <option key={p.id} value={p.id}>{p.nome}</option>
                              ))}
                          </select>
                        </div>
                      )}

                      {destino === 'patch_tecnico' && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-[11px] font-semibold text-zinc-600">Nome do patch</label>
                            <input value={patchNome} onChange={(e) => setPatchNome(e.target.value)} className={inputCls} placeholder="ex: mão-em-alça" />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-semibold text-zinc-600">Palavras-chave (vírgula)</label>
                            <input value={patchPalavras} onChange={(e) => setPatchPalavras(e.target.value)} className={inputCls} placeholder="caneca, xícara, alça" />
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-zinc-600">
                          Texto final da regra (revise antes de confirmar)
                        </label>
                        <textarea value={textoFinal} onChange={(e) => setTextoFinal(e.target.value)} rows={3} className={inputCls} placeholder={destino === 'bloco_mestre' ? 'vira negativo padrão do cliente' : destino === 'ficha_produto' ? 'vira regra de geração do SKU' : 'vira snippet reutilizável'} />
                      </div>

                      <button
                        type="button"
                        onClick={() => promover(caso)}
                        disabled={pendente || !textoFinal.trim() || (destino === 'ficha_produto' && !produtoId)}
                        className="rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-zinc-700 disabled:opacity-50"
                      >
                        {pendente ? 'Promovendo…' : 'Confirmar promoção'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Histórico de promoções/descartes (auditoria) ───────────── */}
      {historico.length > 0 && (
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Histórico ({historico.length}) — por que cada regra existe
          </h2>
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            <div className="divide-y divide-zinc-50">
              {historico.map((caso) => (
                <div key={caso.id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={`flex-none rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                      caso.status === 'promovido'
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : 'border-zinc-200 bg-zinc-50 text-zinc-400'
                    }`}
                  >
                    {caso.status}
                  </span>
                  <p className="min-w-0 flex-1 truncate text-xs text-zinc-600">
                    <strong>{caso.cliente_nome}</strong> · {caso.descricao_erro}
                  </p>
                  {caso.promovido_para && (
                    <span className="flex-none text-[10px] text-zinc-400">→ {caso.promovido_para.split(':')[0]}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DestinoBtn({
  ativo,
  desabilitado,
  titulo,
  onClick,
  children,
}: {
  ativo: boolean
  desabilitado?: boolean
  titulo?: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desabilitado}
      title={titulo}
      className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
        ativo
          ? 'border-zinc-900 bg-zinc-900 text-white'
          : desabilitado
            ? 'cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-300'
            : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
      }`}
    >
      {children}
    </button>
  )
}
