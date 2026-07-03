'use client'

import { useState, useTransition } from 'react'
import { Check, ChevronDown, ChevronRight, Download, ThumbsDown, ThumbsUp, Upload, X } from 'lucide-react'
import { actionAprovarCena, actionReprovarCena, actionUploadImagem } from '../../actions'

interface Cena {
  id: string
  personagem_texto: string | null
  acao_pose: string
  formato: string | null
  nota_especial: string | null
  prompt_final: string
  negativos_final: string | null
  ferramenta_recomendada: string | null
  status: string
  nota_regua: string | null
  imagem_resultado_path: string | null
  created_at: string
  produto_nome: string | null
  variacao_valor: string | null
}
interface ProdutoOpt { id: string; nome: string }
interface CasoCandidato { id: string; dimensao_regua: string | null; descricao_erro: string; vezes_visto: number }

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  rascunho: { label: 'Rascunho', cls: 'bg-zinc-100 text-zinc-500 border-zinc-200' },
  testado_aprovado: { label: 'Aprovado', cls: 'bg-green-100 text-green-700 border-green-200' },
  testado_reprovado: { label: 'Reprovado', cls: 'bg-red-100 text-red-600 border-red-200' },
}

const DIMENSOES_REGUA = [
  '1 - Composição',
  '2 - Luz',
  '3 - Cenário',
  '4 - Produto (geometria/escala)',
  '5 - Paleta',
  '6 - Sentimento',
  '7 - Classe social',
  '8 - Realismo de pessoas',
  '9 - Mãos/anatomia',
  '10 - Artefatos técnicos',
]

export function HistoricoClient({
  clienteId,
  cenas,
  produtos,
  casosCandidatos,
  urlsAssinadas,
}: {
  clienteId: string
  cenas: Cena[]
  produtos: ProdutoOpt[]
  casosCandidatos: CasoCandidato[]
  urlsAssinadas: Record<string, string>
}) {
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroProduto, setFiltroProduto] = useState('')
  const [aberta, setAberta] = useState<string | null>(null)
  const [reprovando, setReprovando] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, startTransition] = useTransition()

  // Form de reprovação — escopo SEM default: decisão consciente obrigatória
  const [dimensao, setDimensao] = useState('')
  const [descricao, setDescricao] = useState('')
  const [correcao, setCorrecao] = useState('')
  const [escopo, setEscopo] = useState<'' | 'tecnico_universal' | 'especifico_do_cliente'>('')
  const [casoExistente, setCasoExistente] = useState('')

  const filtradas = cenas.filter(
    (c) =>
      (!filtroStatus || c.status === filtroStatus) &&
      (!filtroProduto || c.produto_nome === filtroProduto),
  )

  function aprovar(cenaId: string) {
    startTransition(async () => {
      const res = await actionAprovarCena(cenaId, clienteId)
      if (res.error) setErro(res.error)
    })
  }

  function abrirReprovacao(cenaId: string) {
    setReprovando(cenaId)
    setDimensao('')
    setDescricao('')
    setCorrecao('')
    setEscopo('')
    setCasoExistente('')
    setErro(null)
  }

  function confirmarReprovacao() {
    if (!reprovando) return
    if (!casoExistente && (!dimensao || !descricao.trim() || !escopo)) {
      setErro('Dimensão da Régua, descrição do erro e escopo são obrigatórios.')
      return
    }
    startTransition(async () => {
      const res = await actionReprovarCena({
        cenaId: reprovando,
        clienteId,
        dimensao_regua: dimensao || 'vinculado a caso existente',
        descricao_erro: descricao.trim() || 'vinculado a caso existente',
        correcao_aplicada: correcao,
        // escopo é ignorado no server quando vincula a caso existente
        escopo_do_erro: escopo || 'especifico_do_cliente',
        caso_existente_id: casoExistente || null,
      })
      if (res.error) setErro(res.error)
      else setReprovando(null)
    })
  }

  function uploadResultado(cenaId: string, file: File) {
    const fd = new FormData()
    fd.set('arquivo', file)
    startTransition(async () => {
      const res = await actionUploadImagem('cena', cenaId, clienteId, fd)
      if (res.error) setErro(res.error)
    })
  }

  function exportarMd(cena: Cena) {
    const linhas: (string | null | false)[] = [
      `# Cena — ${cena.personagem_texto || 'sem personagem'}`,
      '',
      `- **Ação/pose:** ${cena.acao_pose}`,
      cena.produto_nome && `- **Produto:** ${cena.produto_nome}`,
      cena.variacao_valor && `- **Variação:** ${cena.variacao_valor}`,
      cena.formato && `- **Formato:** ${cena.formato}`,
      cena.ferramenta_recomendada && `- **Ferramenta:** ${cena.ferramenta_recomendada}`,
      `- **Status:** ${STATUS_BADGE[cena.status]?.label ?? cena.status}`,
      cena.nota_regua && `- **Nota da Régua:** ${cena.nota_regua}`,
      '',
      '## Prompt',
      '',
      '```',
      cena.prompt_final,
      '```',
      '',
      '## Negativos',
      '',
      '```',
      cena.negativos_final ?? '',
      '```',
    ]
    const md = linhas.filter((l): l is string => typeof l === 'string').join('\n')

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cena-${cena.id.slice(0, 8)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const inputCls =
    'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600">
          <option value="">Todos os status</option>
          <option value="rascunho">Rascunho</option>
          <option value="testado_aprovado">Aprovado</option>
          <option value="testado_reprovado">Reprovado</option>
        </select>
        <select value={filtroProduto} onChange={(e) => setFiltroProduto(e.target.value)} className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600">
          <option value="">Todos os produtos</option>
          {produtos.map((p) => (
            <option key={p.id} value={p.nome}>{p.nome}</option>
          ))}
        </select>
        <p className="ml-auto text-xs text-zinc-400">{filtradas.length} cena{filtradas.length !== 1 ? 's' : ''}</p>
      </div>

      {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{erro}</p>}

      {filtradas.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-10 text-center">
          <p className="text-sm text-zinc-400">Nenhuma cena registrada. Monte um prompt e salve como Cena.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtradas.map((cena) => {
            const badge = STATUS_BADGE[cena.status] ?? STATUS_BADGE.rascunho
            const expandida = aberta === cena.id
            const url = cena.imagem_resultado_path ? urlsAssinadas[cena.imagem_resultado_path] : null
            return (
              <div key={cena.id} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                <button
                  type="button"
                  onClick={() => setAberta(expandida ? null : cena.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-zinc-50/70"
                >
                  {expandida ? <ChevronDown className="h-4 w-4 flex-none text-zinc-400" /> : <ChevronRight className="h-4 w-4 flex-none text-zinc-400" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-800">
                      {cena.personagem_texto ? `${cena.personagem_texto} — ` : ''}{cena.acao_pose}
                    </p>
                    <p className="mt-0.5 text-[11px] text-zinc-400">
                      {[cena.produto_nome, cena.ferramenta_recomendada, new Date(cena.created_at).toLocaleDateString('pt-BR')].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <span className={`flex-none rounded-full border px-2 py-0.5 text-[10px] font-medium ${badge.cls}`}>
                    {badge.label}
                  </span>
                </button>

                {expandida && (
                  <div className="space-y-3 border-t border-zinc-100 px-4 py-4">
                    <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-zinc-50 p-3 font-mono text-[11px] leading-relaxed text-zinc-700">
                      {cena.prompt_final}
                    </pre>
                    {cena.negativos_final && (
                      <p className="rounded-xl bg-zinc-50 p-3 font-mono text-[11px] text-zinc-500">
                        <strong className="text-zinc-600">Negativos:</strong> {cena.negativos_final}
                      </p>
                    )}
                    {cena.nota_regua && (
                      <p className="rounded-xl bg-red-50 p-3 text-xs text-red-700">
                        <strong>Régua:</strong> {cena.nota_regua}
                      </p>
                    )}
                    {url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt="Resultado" className="max-h-72 rounded-xl border border-zinc-100" />
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      {cena.status === 'rascunho' && (
                        <>
                          <button
                            type="button"
                            onClick={() => aprovar(cena.id)}
                            disabled={pendente}
                            className="flex items-center gap-1.5 rounded-xl bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-500 disabled:opacity-50"
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                            Testado — aprovado
                          </button>
                          <button
                            type="button"
                            onClick={() => abrirReprovacao(cena.id)}
                            disabled={pendente}
                            className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                            Testado — reprovado
                          </button>
                        </>
                      )}
                      <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50">
                        <Upload className="h-3.5 w-3.5" />
                        {cena.imagem_resultado_path ? 'Trocar imagem' : 'Subir resultado'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) uploadResultado(cena.id, f)
                            e.target.value = ''
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => exportarMd(cena)}
                        className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Exportar .md
                      </button>
                    </div>

                    {/* ── Form obrigatório de reprovação ─────────────── */}
                    {reprovando === cena.id && (
                      <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50/50 p-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-red-800">
                            Registrar erro (alimenta a Calibração)
                          </h4>
                          <button type="button" onClick={() => setReprovando(null)} className="text-red-300 hover:text-red-500">
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        {casosCandidatos.length > 0 && (
                          <div>
                            <label className="mb-1 block text-[11px] font-semibold text-red-700">
                              É o mesmo padrão de um caso já registrado?
                            </label>
                            <select value={casoExistente} onChange={(e) => setCasoExistente(e.target.value)} className={inputCls}>
                              <option value="">Não — registrar caso novo</option>
                              {casosCandidatos.map((c) => (
                                <option key={c.id} value={c.id}>
                                  [{c.vezes_visto}x] {c.dimensao_regua ? `${c.dimensao_regua} — ` : ''}{c.descricao_erro.slice(0, 80)}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {!casoExistente && (
                          <>
                            <div>
                              <label className="mb-1 block text-[11px] font-semibold text-red-700">Dimensão da Régua que falhou *</label>
                              <select value={dimensao} onChange={(e) => setDimensao(e.target.value)} className={inputCls}>
                                <option value="">— selecionar —</option>
                                {DIMENSOES_REGUA.map((d) => (
                                  <option key={d} value={d}>{d}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-[11px] font-semibold text-red-700">Descrição do erro *</label>
                              <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} className={inputCls} placeholder="ex: pote virou tigela genérica quando o prompt não travou geometria" />
                            </div>
                            <div>
                              <label className="mb-1 block text-[11px] font-semibold text-red-700">
                                Escopo do erro * <span className="font-normal">(decisão consciente — sem padrão pré-selecionado)</span>
                              </label>
                              <div className="space-y-1.5">
                                <label className="flex items-start gap-2 text-xs text-zinc-700">
                                  <input type="radio" name={`escopo-${cena.id}`} checked={escopo === 'tecnico_universal'} onChange={() => setEscopo('tecnico_universal')} className="mt-0.5" />
                                  <span><strong>Técnico universal</strong> — anatomia/física/renderização, pode acontecer com qualquer marca (elegível a Patch global)</span>
                                </label>
                                <label className="flex items-start gap-2 text-xs text-zinc-700">
                                  <input type="radio" name={`escopo-${cena.id}`} checked={escopo === 'especifico_do_cliente'} onChange={() => setEscopo('especifico_do_cliente')} className="mt-0.5" />
                                  <span><strong>Específico deste cliente</strong> — identidade/paleta/sentimento/classe social, só faz sentido para esta marca</span>
                                </label>
                              </div>
                            </div>
                          </>
                        )}

                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-red-700">Correção que funcionou (opcional)</label>
                          <textarea value={correcao} onChange={(e) => setCorrecao(e.target.value)} rows={2} className={inputCls} placeholder="trecho de prompt que resolveu" />
                        </div>

                        <button
                          type="button"
                          onClick={confirmarReprovacao}
                          disabled={pendente}
                          className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                          {pendente ? 'Registrando…' : 'Confirmar reprovação'}
                        </button>
                      </div>
                    )}
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
