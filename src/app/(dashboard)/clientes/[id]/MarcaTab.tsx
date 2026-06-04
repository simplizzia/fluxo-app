'use client'

import { useState, useTransition } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  Edit2, Check, X, ExternalLink,
  Brain, Loader2, TrendingUp, TrendingDown, Lightbulb,
} from 'lucide-react'
import { actionSalvarSecaoMarca } from './actions'
import type { InsightAgente } from './actions'
import MoodboardSection from './MoodboardSection'
import IdentidadeSection from './IdentidadeSection'
import type { SecaoMarca, AtivoVisual, MoodboardItem } from './actions'
import { actionAnalisarPadroes } from '@/app/(dashboard)/agentes/actions'

interface Props {
  clienteId: string
  secoes: SecaoMarca[]
  ativos: AtivoVisual[]
  moodboard: MoodboardItem[]
  podeEditar: boolean
  insights: InsightAgente[]
  marcas: { id: string; nome: string }[]
}

const CATEGORIAS_TEXTO = [
  { value: 'brand_system', label: 'Posicionamento & Marca', placeholder: 'Descreva o posicionamento, diferencial, promessa de marca...' },
  { value: 'personas', label: 'Personas', placeholder: 'Descreva o público-alvo, personas, segmentos...' },
  { value: 'diagnostico', label: 'Diagnóstico', placeholder: 'Diagnóstico de marca, análise digital, concorrência...' },
  { value: 'parametros', label: 'Parâmetros de Conteúdo', placeholder: 'Tom de voz, pilares, frequência, formatos...' },
  { value: 'outros', label: 'Notas & Observações', placeholder: 'Anotações estratégicas, decisões, histórico...' },
]

type SubTab = 'estrategia' | 'identidade' | 'moodboard' | 'aprendizados'

export default function MarcaTab({ clienteId, secoes, ativos, moodboard, podeEditar, insights, marcas }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('estrategia')
  const [marcaAtiva, setMarcaAtiva] = useState<string | null>(marcas[0]?.id ?? null)

  const SUB_TABS: { id: SubTab; label: string }[] = [
    { id: 'estrategia', label: 'Estratégia' },
    { id: 'identidade', label: 'Identidade Visual' },
    { id: 'moodboard', label: 'Moodboard' },
    { id: 'aprendizados', label: 'Aprendizados' },
  ]

  // Documentos de nível cliente (Modo 2/3) — compartilhados entre as marcas
  const docsCliente = secoes.filter(
    (s) => s.subcategoria === 'prep_reuniao' || s.subcategoria === 'briefing_completo',
  )

  // Conteúdo escopado à marca selecionada (marca_id null = quando não há marca)
  const secoesDaMarca = secoes.filter((s) => s.marcaId === marcaAtiva)
  const ativosDaMarca = ativos.filter((a) => a.marcaId === marcaAtiva)
  const moodboardDaMarca = moodboard.filter((m) => m.marcaId === marcaAtiva)

  return (
    <div className="space-y-5">
      {/* Documentos gerais do cliente (Modo 2/3) — acima das marcas */}
      {docsCliente.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Documentos gerais do cliente</p>
          {docsCliente.map((doc) => <DocumentoIzzi key={doc.id} secao={doc} />)}
        </div>
      )}

      {/* Seletor de marca */}
      {marcas.length > 0 && (
        <div className="flex flex-wrap gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1 w-fit">
          {marcas.map((m) => (
            <button
              key={m.id}
              onClick={() => setMarcaAtiva(m.id)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                marcaAtiva === m.id ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {m.nome}
            </button>
          ))}
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1 w-fit">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
              subTab === t.id
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {t.label}
            {t.id === 'aprendizados' && insights.length > 0 && (
              <span className="ml-1.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
                {insights.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Estratégia */}
      {subTab === 'estrategia' && (
        <div className="space-y-4">
          {CATEGORIAS_TEXTO.map((cat) => {
            const secao = secoesDaMarca.find((s) => s.categoria === cat.value) ?? null
            return (
              <SecaoEditor
                key={cat.value}
                clienteId={clienteId}
                marcaId={marcaAtiva}
                categoria={cat.value}
                label={cat.label}
                placeholder={cat.placeholder}
                secao={secao}
                podeEditar={podeEditar}
              />
            )
          })}
        </div>
      )}

      {/* Identidade Visual */}
      {subTab === 'identidade' && (
        <IdentidadeSection
          clienteId={clienteId}
          marcaId={marcaAtiva}
          ativos={ativosDaMarca}
          podeEditar={podeEditar}
        />
      )}

      {/* Moodboard */}
      {subTab === 'moodboard' && (
        <MoodboardSection
          clienteId={clienteId}
          marcaId={marcaAtiva}
          items={moodboardDaMarca}
          podeEditar={podeEditar}
        />
      )}

      {/* Aprendizados */}
      {subTab === 'aprendizados' && (
        <AprendizadosSection
          clienteId={clienteId}
          insights={insights}
          podeEditar={podeEditar}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// AprendizadosSection — insights de IA por agente para este cliente
// ---------------------------------------------------------------------------

function AprendizadosSection({
  clienteId,
  insights: insightsInicial,
  podeEditar,
}: {
  clienteId: string
  insights: InsightAgente[]
  podeEditar: boolean
}) {
  const [insights, setInsights] = useState(insightsInicial)
  const [analisandoChave, setAnalisandoChave] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleAnalisar(agenteChave: string) {
    if (analisandoChave) return
    setAnalisandoChave(agenteChave)
    setErro(null)
    startTransition(async () => {
      const res = await actionAnalisarPadroes(agenteChave, clienteId)
      if (res.error) {
        setErro(res.error)
      } else if (res.insight) {
        const novo = res.insight
        setInsights((prev) => {
          const idx = prev.findIndex((i) => i.agentChave === novo.agentChave)
          if (idx >= 0) {
            const next = [...prev]
            next[idx] = {
              id: novo.id,
              agentChave: novo.agentChave,
              agentNome: novo.agentNome,
              resumo: novo.resumo,
              taxaAprovacao: novo.taxaAprovacao,
              totalFeedbacks: novo.totalFeedbacks,
              padroesPositivos: novo.padroesPositivos,
              padroesNegativos: novo.padroesNegativos,
              sugestoes: novo.sugestoes,
              atualizadoEm: novo.atualizadoEm,
            }
            return next
          }
          return [
            {
              id: novo.id,
              agentChave: novo.agentChave,
              agentNome: novo.agentNome,
              resumo: novo.resumo,
              taxaAprovacao: novo.taxaAprovacao,
              totalFeedbacks: novo.totalFeedbacks,
              padroesPositivos: novo.padroesPositivos,
              padroesNegativos: novo.padroesNegativos,
              sugestoes: novo.sugestoes,
              atualizadoEm: novo.atualizadoEm,
            },
            ...prev,
          ]
        })
      }
      setAnalisandoChave(null)
    })
  }

  if (insights.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-12 text-center">
        <Brain className="mx-auto h-10 w-10 text-zinc-300" />
        <p className="mt-3 text-sm font-medium text-zinc-600">Nenhum aprendizado ainda</p>
        <p className="mt-1 text-xs text-zinc-400">
          Os padrões de IA aparecem aqui após acumular feedbacks de execuções para este cliente.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">
        Padrões extraídos via IA dos feedbacks de execuções para este cliente.
      </p>

      {erro && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{erro}</p>
      )}

      <div className="space-y-4">
        {insights.map((insight) => {
          const taxa = insight.taxaAprovacao
          const taxaCor =
            taxa == null ? 'text-zinc-400'
            : taxa >= 70  ? 'text-green-600'
            : taxa >= 40  ? 'text-amber-600'
            : 'text-red-600'

          return (
            <div key={insight.id} className="rounded-2xl border border-zinc-200 bg-white p-5">
              {/* Header */}
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-zinc-900">{insight.agentNome}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-400">
                    {insight.totalFeedbacks} feedbacks avaliados
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span className={`font-display text-2xl font-bold ${taxaCor}`}>
                    {taxa != null ? `${taxa}%` : '—'}
                  </span>
                  <p className="text-[10px] text-zinc-400">aprovação</p>
                </div>
              </div>

              {/* Resumo */}
              {insight.resumo && (
                <p className="mb-4 border-l-2 border-zinc-200 pl-3 text-xs leading-relaxed italic text-zinc-500">
                  {insight.resumo}
                </p>
              )}

              {/* Patterns */}
              <div className="space-y-3">
                {insight.padroesPositivos.length > 0 && (
                  <div>
                    <p className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-green-700">
                      <TrendingUp className="h-3 w-3" /> Funciona bem
                    </p>
                    <ul className="space-y-1">
                      {insight.padroesPositivos.map((p, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-600">
                          <span className="mt-0.5 text-green-500">•</span>{p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {insight.padroesNegativos.length > 0 && (
                  <div>
                    <p className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-600">
                      <TrendingDown className="h-3 w-3" /> Pode melhorar
                    </p>
                    <ul className="space-y-1">
                      {insight.padroesNegativos.map((p, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-600">
                          <span className="mt-0.5 text-red-400">•</span>{p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {insight.sugestoes.length > 0 && (
                  <div>
                    <p className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-violet-700">
                      <Lightbulb className="h-3 w-3" /> Sugestões
                    </p>
                    <ul className="space-y-1">
                      {insight.sugestoes.map((s, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-600">
                          <span className="mt-0.5 text-violet-400">•</span>{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Footer */}
              {podeEditar && (
                <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3">
                  <p className="text-[10px] text-zinc-400">
                    Atualizado em{' '}
                    {new Date(insight.atualizadoEm).toLocaleDateString('pt-BR', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </p>
                  <button
                    onClick={() => handleAnalisar(insight.agentChave)}
                    disabled={analisandoChave === insight.agentChave}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50"
                  >
                    {analisandoChave === insight.agentChave
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <Brain className="h-3 w-3" />}
                    Atualizar análise
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// DocumentoIzzi — documento read-only gerado pela Izzi no onboarding
// (Modo 2 = Prep de Reunião · Modo 3 = Briefing Completo)
// ---------------------------------------------------------------------------

const MD_COMPONENTS = {
  h1: ({ children }: { children?: React.ReactNode }) => <h1 className="mb-3 mt-1 font-display text-xl font-bold text-zinc-900">{children}</h1>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 className="mb-2 mt-5 font-display text-base font-bold text-zinc-900">{children}</h2>,
  h3: ({ children }: { children?: React.ReactNode }) => <h3 className="mb-1.5 mt-4 text-sm font-semibold text-zinc-800">{children}</h3>,
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2.5 last:mb-0">{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold text-zinc-900">{children}</strong>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="mb-2.5 list-disc space-y-0.5 pl-5">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="mb-2.5 list-decimal space-y-0.5 pl-5">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li className="leading-relaxed">{children}</li>,
  hr: () => <hr className="my-4 border-zinc-100" />,
}

function DocumentoIzzi({ secao }: { secao: SecaoMarca }) {
  const [aberto, setAberto] = useState(false)
  const texto = (secao.conteudo?.texto as string) ?? ''
  const isPrep = secao.subcategoria === 'prep_reuniao'

  return (
    <div className="overflow-hidden rounded-2xl border border-violet-200 bg-violet-50/40">
      <button
        onClick={() => setAberto((a) => !a)}
        className="flex w-full items-center justify-between px-5 py-3.5 text-left"
      >
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-semibold text-zinc-800">{secao.titulo}</span>
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">
            {isPrep ? 'Modo 2 · Prep de Reunião' : 'Modo 3 · Briefing Completo'}
          </span>
        </div>
        <span className="text-xs text-zinc-400">{aberto ? 'Recolher' : 'Abrir'}</span>
      </button>
      {aberto && (
        <div className="border-t border-violet-100 bg-white px-5 py-4 text-sm leading-relaxed text-zinc-700">
          <ReactMarkdown components={MD_COMPONENTS}>{texto}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SecaoEditor — edição inline de uma seção de texto
// ---------------------------------------------------------------------------

function SecaoEditor({
  clienteId,
  marcaId,
  categoria,
  label,
  placeholder,
  secao,
  podeEditar,
}: {
  clienteId: string
  marcaId: string | null
  categoria: string
  label: string
  placeholder: string
  secao: SecaoMarca | null
  podeEditar: boolean
}) {
  const textoAtual = (secao?.conteudo?.texto as string) ?? ''
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState(textoAtual)
  const [visivelCliente, setVisivelCliente] = useState(secao?.visivelParaCliente ?? false)
  const [erro, setErro] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSalvar() {
    setErro(null)
    startTransition(async () => {
      const res = await actionSalvarSecaoMarca({
        clienteId,
        marcaId,
        categoria,
        titulo: label,
        conteudo: { texto },
        visivelParaCliente: visivelCliente,
      })
      if (res.error) {
        setErro(res.error)
      } else {
        setEditando(false)
      }
    })
  }

  const geradoPorAgente = secao?.geradoPorAgente
  const versao = secao?.versao ?? 1

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-zinc-800">{label}</h3>
          {secao && (
            <span className="text-[10px] text-zinc-400">v{versao}</span>
          )}
          {geradoPorAgente && (
            <span className="flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">
              <ExternalLink className="h-2.5 w-2.5" />
              Gerado por agente
            </span>
          )}
        </div>
        {podeEditar && !editando && (
          <button
            onClick={() => { setEditando(true); setTexto(textoAtual) }}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700"
          >
            <Edit2 className="h-3 w-3" />
            Editar
          </button>
        )}
        {editando && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleSalvar}
              disabled={pending}
              className="flex items-center gap-1 rounded-lg bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
            >
              <Check className="h-3 w-3" />
              {pending ? 'Salvando…' : 'Salvar'}
            </button>
            <button
              onClick={() => { setEditando(false); setErro(null) }}
              className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="p-5">
        {editando ? (
          <div className="space-y-3">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={placeholder}
              rows={6}
              autoFocus
              className="w-full resize-none rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/10"
            />
            <div className="flex items-center gap-2">
              <input
                id={`visivel-${categoria}`}
                type="checkbox"
                checked={visivelCliente}
                onChange={(e) => setVisivelCliente(e.target.checked)}
                className="rounded border-zinc-300"
              />
              <label htmlFor={`visivel-${categoria}`} className="text-xs text-zinc-500">
                Visível para o cliente
              </label>
            </div>
            {erro && <p className="text-xs text-red-600">{erro}</p>}
          </div>
        ) : textoAtual ? (
          <div className="text-sm leading-relaxed text-zinc-700">
            <ReactMarkdown components={MD_COMPONENTS}>{textoAtual}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm italic text-zinc-400">{placeholder}</p>
        )}
      </div>
    </div>
  )
}
