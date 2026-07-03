'use client'

import { useMemo, useState, useTransition } from 'react'
import { Copy, Check, Dices, Save, Sparkles, Info } from 'lucide-react'
import { montarPrompt } from '@/lib/imagens/montarPrompt'
import { sugerirPatches, type PatchSugerivel } from '@/lib/imagens/sugerirPatches'
import { sortearAtributo } from '@/lib/imagens/sortearAtributo'
import { actionSalvarCena } from '../../actions'

interface Bloco {
  regra_paleta: string | null
  estilo_luz: string | null
  sentimento_marca: string | null
  negativos_padrao: string[]
  formato_padrao: string
  estilo_geral: string | null
}
interface Produto {
  id: string
  nome: string
  formato: string | null
  escala_relativa: string | null
  tampa: string | null
  regra_geracao: string | null
  restricao_conteudo: string | null
  alerta_contraste: string | null
}
interface Categoria { id: string; tipo: string }
interface Atributo { id: string; categoria_id: string; valor: string; vezes_usado: number; status: string }
interface Personagem { id: string; nome: string; descricao_fixa: string | null; alerta_contaminacao: string | null }

const FERRAMENTAS_REFERENCIA = [
  ['Cena lifestyle com pessoa', 'Nano Banana/Gemini', 'confirmado'],
  ['Correção pontual (edição por instrução)', 'Nano Banana/Gemini', 'confirmado'],
  ['Produto isolado / mockup limpo', 'Freepik AI ou ChatGPT/DALL-E', 'hipótese'],
  ['Comparar estilos (mesmo prompt, engines diferentes)', 'Leonardo PhotoReal/Alchemy', 'hipótese'],
  ['Formato meme/ilustrado', 'ChatGPT/DALL-E', 'hipótese'],
  ['Múltiplas referências visuais simultâneas', 'Flora.ai', 'hipótese'],
  ['Lote de variações de prompt aprovado', 'Flora.ai', 'hipótese'],
] as const

export function MontadorClient({
  clienteId,
  bloco,
  produtos,
  categorias,
  atributos,
  personagens,
  patches,
}: {
  clienteId: string
  bloco: Bloco
  produtos: Produto[]
  categorias: Categoria[]
  atributos: Atributo[]
  personagens: Personagem[]
  patches: PatchSugerivel[]
}) {
  const [personagemId, setPersonagemId] = useState('')
  const [personagemTexto, setPersonagemTexto] = useState('')
  const [acaoPose, setAcaoPose] = useState('')
  const [produtoId, setProdutoId] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [atributoId, setAtributoId] = useState('')
  const [formato, setFormato] = useState(bloco.formato_padrao)
  const [notaEspecial, setNotaEspecial] = useState('')
  const [ferramenta, setFerramenta] = useState('Nano Banana/Gemini')
  const [patchesAceitos, setPatchesAceitos] = useState<Set<string>>(new Set())

  const [resultado, setResultado] = useState<{ promptFinal: string; negativos: string } | null>(null)
  const [copiado, setCopiado] = useState<'prompt' | 'negativos' | null>(null)
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [salvando, startSalvar] = useTransition()

  const personagemSelecionado = personagens.find((p) => p.id === personagemId) ?? null
  const produtoSelecionado = produtos.find((p) => p.id === produtoId) ?? null
  const atributosDaCategoria = atributos.filter((a) => a.categoria_id === categoriaId)
  const atributoSelecionado = atributos.find((a) => a.id === atributoId) ?? null

  const patchesSugeridos = useMemo(
    () => sugerirPatches(acaoPose, patches),
    [acaoPose, patches],
  )

  function sortear() {
    const escolhido = sortearAtributo(atributosDaCategoria)
    if (escolhido) setAtributoId(escolhido.id)
  }

  function togglePatch(id: string) {
    setPatchesAceitos((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function gerar() {
    if (!acaoPose.trim()) {
      setMensagem({ tipo: 'erro', texto: 'A ação/pose é obrigatória — é a parte criativa da cena.' })
      return
    }
    setMensagem(null)
    const snippets = patchesSugeridos
      .filter((p) => patchesAceitos.has(p.id))
      .map((p) => p.snippet_texto)

    setResultado(
      montarPrompt({
        bloco,
        produto: produtoSelecionado,
        variacaoValor: atributoSelecionado?.valor ?? null,
        personagemTexto: personagemSelecionado
          ? personagemSelecionado.nome
          : personagemTexto || null,
        personagemDescricaoFixa: personagemSelecionado?.descricao_fixa ?? null,
        acaoPose: acaoPose.trim(),
        formato,
        notaEspecial: notaEspecial || null,
        patchesAceitos: snippets,
      }),
    )
  }

  async function copiar(texto: string, qual: 'prompt' | 'negativos') {
    await navigator.clipboard.writeText(texto)
    setCopiado(qual)
    setTimeout(() => setCopiado(null), 2000)
  }

  function salvarCena() {
    if (!resultado) return
    startSalvar(async () => {
      const res = await actionSalvarCena({
        clienteId,
        personagem_texto: personagemSelecionado?.nome ?? personagemTexto,
        personagem_id: personagemId || null,
        acao_pose: acaoPose.trim(),
        produto_id: produtoId || null,
        variacao_atributo_id: atributoId || null,
        formato,
        nota_especial: notaEspecial,
        prompt_final: resultado.promptFinal,
        negativos_final: resultado.negativos,
        ferramenta_recomendada: ferramenta,
      })
      setMensagem(
        res.error
          ? { tipo: 'erro', texto: res.error }
          : { tipo: 'ok', texto: 'Cena salva como rascunho no Histórico.' },
      )
    })
  }

  const inputCls =
    'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none'
  const labelCls = 'mb-1 block text-xs font-semibold text-zinc-600'

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* ── Formulário ─────────────────────────────────────────────── */}
      <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5">
        <div>
          <label className={labelCls}>Personagem</label>
          <div className="flex gap-2">
            <select
              value={personagemId}
              onChange={(e) => setPersonagemId(e.target.value)}
              className={`${inputCls} flex-1`}
            >
              <option value="">— texto livre —</option>
              {personagens.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
          {!personagemId && (
            <input
              value={personagemTexto}
              onChange={(e) => setPersonagemTexto(e.target.value)}
              placeholder="ex: mulher jovem indo trabalhar"
              className={`${inputCls} mt-2`}
            />
          )}
          {personagemSelecionado?.alerta_contaminacao && (
            <p className="mt-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700">
              ⚠️ {personagemSelecionado.alerta_contaminacao}
            </p>
          )}
        </div>

        <div>
          <label className={labelCls}>
            Ação / pose central <span className="text-red-500">*</span>
          </label>
          <textarea
            value={acaoPose}
            onChange={(e) => setAcaoPose(e.target.value)}
            rows={3}
            placeholder="ex: saindo pela porta de casa, olhando o relógio, segurando o iogurte, mochila em um ombro só"
            className={inputCls}
          />
        </div>

        {patchesSugeridos.length > 0 && (
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-blue-700">
              <Sparkles className="h-3.5 w-3.5" />
              Patches técnicos sugeridos pela ação — aceite ou ignore
            </p>
            <div className="space-y-1.5">
              {patchesSugeridos.map((p) => (
                <label key={p.id} className="flex cursor-pointer items-start gap-2 text-xs text-blue-900">
                  <input
                    type="checkbox"
                    checked={patchesAceitos.has(p.id)}
                    onChange={() => togglePatch(p.id)}
                    className="mt-0.5"
                  />
                  <span>
                    <strong>{p.nome}</strong>
                    {p.quando_usar ? ` — ${p.quando_usar}` : ''}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className={labelCls}>Produto (Ficha)</label>
          <select value={produtoId} onChange={(e) => setProdutoId(e.target.value)} className={inputCls}>
            <option value="">— sem produto —</option>
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Cenário / variação</label>
          <div className="flex gap-2">
            <select
              value={categoriaId}
              onChange={(e) => { setCategoriaId(e.target.value); setAtributoId('') }}
              className={`${inputCls} flex-1`}
            >
              <option value="">— categoria —</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.tipo}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={sortear}
              disabled={!categoriaId}
              title="Sortear o atributo menos usado"
              className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-40"
            >
              <Dices className="h-4 w-4" />
              Sortear
            </button>
          </div>
          {categoriaId && (
            <select
              value={atributoId}
              onChange={(e) => setAtributoId(e.target.value)}
              className={`${inputCls} mt-2`}
            >
              <option value="">— escolher atributo —</option>
              {atributosDaCategoria.map((a) => (
                <option key={a.id} value={a.id} disabled={a.status === 'reprovado'}>
                  {a.valor} (usado {a.vezes_usado}x{a.status !== 'aprovado' ? ` · ${a.status}` : ''})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Formato</label>
            <input value={formato} onChange={(e) => setFormato(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Ferramenta de geração</label>
            <input value={ferramenta} onChange={(e) => setFerramenta(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Nota especial (ajuste fino fora do padrão)</label>
          <input
            value={notaEspecial}
            onChange={(e) => setNotaEspecial(e.target.value)}
            placeholder="ex: precisa parecer mais C1 que C2"
            className={inputCls}
          />
        </div>

        <button
          type="button"
          onClick={gerar}
          className="w-full rounded-xl bg-zinc-900 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700"
        >
          Gerar prompt
        </button>

        <details className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-xs text-zinc-500">
          <summary className="flex cursor-pointer items-center gap-1.5 font-medium text-zinc-600">
            <Info className="h-3.5 w-3.5" />
            Qual ferramenta usar? (referência)
          </summary>
          <table className="mt-2 w-full text-left text-[11px]">
            <tbody>
              {FERRAMENTAS_REFERENCIA.map(([tarefa, tool, status]) => (
                <tr key={tarefa} className="border-t border-zinc-100">
                  <td className="py-1 pr-2">{tarefa}</td>
                  <td className="py-1 pr-2 font-medium text-zinc-700">{tool}</td>
                  <td className="py-1 text-zinc-400">{status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </div>

      {/* ── Resultado ──────────────────────────────────────────────── */}
      <div className="space-y-4">
        {mensagem && (
          <p
            className={`rounded-xl px-4 py-2.5 text-sm ${
              mensagem.tipo === 'ok'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-600'
            }`}
          >
            {mensagem.texto}
          </p>
        )}

        {resultado ? (
          <>
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Prompt
                </h2>
                <button
                  type="button"
                  onClick={() => copiar(resultado.promptFinal, 'prompt')}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50"
                >
                  {copiado === 'prompt' ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiado === 'prompt' ? 'Copiado' : 'Copiar'}
                </button>
              </div>
              <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-zinc-800">
                {resultado.promptFinal}
              </pre>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Negativos
                </h2>
                <button
                  type="button"
                  onClick={() => copiar(resultado.negativos, 'negativos')}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50"
                >
                  {copiado === 'negativos' ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiado === 'negativos' ? 'Copiado' : 'Copiar'}
                </button>
              </div>
              <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-zinc-800">
                {resultado.negativos}
              </pre>
            </div>

            <button
              type="button"
              onClick={salvarCena}
              disabled={salvando}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {salvando ? 'Salvando…' : 'Salvar como Cena (rascunho)'}
            </button>
          </>
        ) : (
          <div className="flex h-full min-h-48 items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 p-8">
            <p className="text-center text-sm text-zinc-400">
              Preencha a ação/pose e clique em <strong>Gerar prompt</strong>.<br />
              O Bloco Mestre do cliente entra automaticamente.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
