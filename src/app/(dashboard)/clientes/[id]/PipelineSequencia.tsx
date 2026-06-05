'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  CheckCircle2, Clock, Loader2, Lock, Sparkles, RefreshCw, ChevronDown, ChevronUp, AlertTriangle,
} from 'lucide-react'
import type { PipelineEtapa } from './onboarding-actions'

// Metadados das etapas (espelha src/lib/onboarding/pipeline.ts — client-safe)
const ETAPAS_META: Record<string, { label: string; requerInput: boolean; inputLabel?: string }> = {
  personas:             { label: 'Personas', requerInput: false },
  diagnostico_digital:  { label: 'Diagnóstico Digital', requerInput: true, inputLabel: 'Cole os links das redes sociais, site e o que encontrou (prints/descrições). A Izzi analisa com base nisso.' },
  posicionamento_marca: { label: 'Posicionamento & Marca', requerInput: false },
  diagnostico_marca:    { label: 'Diagnóstico de Marca', requerInput: false },
  parametros_conteudo:  { label: 'Parâmetros de Conteúdo', requerInput: false },
}

const MD_COMPONENTS = {
  h1: ({ children }: { children?: React.ReactNode }) => <h1 className="mb-3 mt-1 font-display text-xl font-bold text-zinc-900">{children}</h1>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 className="mb-2 mt-5 font-display text-base font-bold text-zinc-900">{children}</h2>,
  h3: ({ children }: { children?: React.ReactNode }) => <h3 className="mb-1.5 mt-4 text-sm font-semibold text-zinc-800">{children}</h3>,
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2.5 last:mb-0">{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold text-zinc-900">{children}</strong>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="mb-2.5 list-disc space-y-0.5 pl-5">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="mb-2.5 list-decimal space-y-0.5 pl-5">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li className="leading-relaxed">{children}</li>,
  table: ({ children }: { children?: React.ReactNode }) => <div className="my-3 overflow-x-auto"><table className="w-full text-xs border-collapse">{children}</table></div>,
  th: ({ children }: { children?: React.ReactNode }) => <th className="border border-zinc-200 bg-zinc-50 px-2 py-1 text-left font-semibold">{children}</th>,
  td: ({ children }: { children?: React.ReactNode }) => <td className="border border-zinc-200 px-2 py-1 align-top">{children}</td>,
  hr: () => <hr className="my-4 border-zinc-100" />,
}

interface Props {
  clienteId: string
  etapas: PipelineEtapa[]
  marcas: { id: string; nome: string }[]
  podeEditar: boolean
}

export default function PipelineSequencia({ clienteId, etapas, marcas, podeEditar }: Props) {
  // Marcas que têm linhas no pipeline (na ordem de `marcas`)
  const marcasComPipeline = marcas.filter((m) => etapas.some((e) => e.marca_id === m.id))
  const [marcaAtiva, setMarcaAtiva] = useState(marcasComPipeline[0]?.id ?? '')

  if (etapas.length === 0 || marcasComPipeline.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-4 text-sm text-zinc-500">
        A sequência (Personas → Diagnósticos → Posicionamento → Parâmetros) é iniciada automaticamente
        quando o <strong>Briefing Completo (Modo 3)</strong> é gerado após a reunião de kickoff.
      </div>
    )
  }

  const etapasDaMarca = etapas
    .filter((e) => e.marca_id === marcaAtiva)
    .sort((a, b) => a.ordem - b.ordem)
  const ativaOrdem = etapasDaMarca.find((e) => e.status !== 'aprovado')?.ordem ?? Infinity

  // Progresso por marca (etapas aprovadas / total) para o badge da aba
  function progresso(marcaId: string) {
    const linhas = etapas.filter((e) => e.marca_id === marcaId)
    const aprovadas = linhas.filter((e) => e.status === 'aprovado').length
    return `${aprovadas}/${linhas.length}`
  }

  return (
    <div className="space-y-4">
      {/* Sub-abas por marca */}
      {marcasComPipeline.length > 1 && (
        <div className="flex flex-wrap gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1 w-fit">
          {marcasComPipeline.map((m) => (
            <button
              key={m.id}
              onClick={() => setMarcaAtiva(m.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
                marcaAtiva === m.id ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {m.nome}
              <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500">
                {progresso(m.id)}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {etapasDaMarca.map((etapa) => (
          <EtapaCard
            key={`${etapa.marca_id}-${etapa.etapa}`}
            clienteId={clienteId}
            marcaId={marcaAtiva}
            etapa={etapa}
            ativa={etapa.ordem === ativaOrdem}
            bloqueada={etapa.ordem > ativaOrdem}
            podeEditar={podeEditar}
          />
        ))}
      </div>
    </div>
  )
}

function EtapaCard({
  clienteId, marcaId, etapa, ativa, bloqueada, podeEditar,
}: {
  clienteId: string
  marcaId: string
  etapa: PipelineEtapa
  ativa: boolean
  bloqueada: boolean
  podeEditar: boolean
}) {
  const router = useRouter()
  const meta = ETAPAS_META[etapa.etapa] ?? { label: etapa.etapa, requerInput: false }
  const [aberto, setAberto] = useState(etapa.status === 'aguardando_aprovacao')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [info, setInfo] = useState('')
  const [inputManual, setInputManual] = useState(etapa.input_manual ?? '')
  const [feedback, setFeedback] = useState('')
  const [mostrandoAjuste, setMostrandoAjuste] = useState(false)

  async function chamar(url: string, body: Record<string, unknown>) {
    setLoading(true); setErro(''); setInfo('')
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteId, marcaId, etapaKey: etapa.etapa, ...body }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { setErro(data.error ?? 'Erro inesperado'); return }
      if (data.completo) { setInfo('Documento já está completo — nada mais a continuar.'); return }
      router.refresh()
    } catch {
      setErro('Falha de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const StatusBadge = () => {
    const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
      pendente:             { label: 'Pendente', cls: 'bg-zinc-100 text-zinc-500', icon: <Clock className="h-3 w-3" /> },
      gerando:              { label: 'Gerando…', cls: 'bg-amber-100 text-amber-700', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
      aguardando_aprovacao: { label: 'Aguardando aprovação', cls: 'bg-violet-100 text-violet-700', icon: <Sparkles className="h-3 w-3" /> },
      aprovado:             { label: 'Aprovado', cls: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="h-3 w-3" /> },
      ajuste_solicitado:    { label: 'Ajustando…', cls: 'bg-amber-100 text-amber-700', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
      erro:                 { label: 'Erro', cls: 'bg-red-100 text-red-600', icon: <AlertTriangle className="h-3 w-3" /> },
    }
    const cfg = map[etapa.status] ?? map.pendente
    return (
      <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.cls}`}>
        {cfg.icon} {cfg.label}
      </span>
    )
  }

  const temOutput = !!etapa.output
  // Os controles são guiados por "tem texto?" + loading — nunca pelo status do
  // banco, que pode ficar preso em 'gerando' se uma tentativa expirou.
  const gerandoAgora = loading
  const revisavel = temOutput && !loading       // já gerou → revisar/aprovar/continuar
  const podeGerar = !temOutput && !loading        // ainda não gerou → gerar/tentar

  return (
    <div className={`overflow-hidden rounded-2xl border ${
      ativa ? 'border-violet-200 bg-violet-50/30' : bloqueada ? 'border-zinc-100 bg-zinc-50/50' : 'border-zinc-200 bg-white'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          {bloqueada
            ? <Lock className="h-4 w-4 flex-none text-zinc-300" />
            : etapa.status === 'aprovado'
            ? <CheckCircle2 className="h-4 w-4 flex-none text-green-500" />
            : <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700">{etapa.ordem}</span>
          }
          <span className={`text-sm font-semibold ${bloqueada ? 'text-zinc-400' : 'text-zinc-800'}`}>{meta.label}</span>
          <StatusBadge />
        </div>
        {temOutput && (
          <button onClick={() => setAberto((a) => !a)} className="flex-none text-xs text-zinc-400 hover:text-zinc-600">
            {aberto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Corpo */}
      <div className="border-t border-zinc-100 px-5 py-4 space-y-3">
        {bloqueada && (
          <p className="text-xs italic text-zinc-400">Aguardando aprovação da etapa anterior.</p>
        )}

        {/* Etapa ativa, ainda não gerada → Gerar */}
        {ativa && podeGerar && (
          <div className="space-y-3">
            {meta.requerInput && (
              <div>
                <p className="mb-1 text-xs text-zinc-500">{meta.inputLabel}</p>
                <textarea
                  value={inputManual}
                  onChange={(e) => setInputManual(e.target.value)}
                  rows={4}
                  placeholder="Links, prints, observações…"
                  className="w-full resize-none rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10"
                />
              </div>
            )}
            {etapa.status === 'erro' && etapa.erro && (
              <p className="text-xs text-red-600">{etapa.erro}</p>
            )}
            {podeEditar && (
              <button
                onClick={() => chamar('/api/pipeline/gerar', meta.requerInput ? { inputManual } : {})}
                disabled={meta.requerInput && !inputManual.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                {etapa.status === 'erro' || etapa.status === 'gerando' ? 'Tentar de novo' : `Gerar ${meta.label}`}
              </button>
            )}
          </div>
        )}

        {gerandoAgora && (
          <p className="flex items-center gap-2 text-xs text-amber-600">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> A Izzi está trabalhando… isso leva alguns segundos.
          </p>
        )}

        {/* Output gerado */}
        {temOutput && aberto && (
          <div className="rounded-xl bg-white border border-zinc-100 p-4 text-sm leading-relaxed text-zinc-700 max-h-[28rem] overflow-y-auto">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>{etapa.output!}</ReactMarkdown>
          </div>
        )}

        {/* Pronto para revisar → Aprovar / Pedir ajustes / Continuar */}
        {ativa && revisavel && podeEditar && (
          <div className="space-y-3 pt-1">
            {!mostrandoAjuste ? (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => chamar('/api/pipeline/aprovar', {})}
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Aprovar e avançar
                </button>
                <button
                  onClick={() => setMostrandoAjuste(true)}
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-4 py-2 text-sm text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
                >
                  <RefreshCw className="h-4 w-4" /> Pedir ajustes
                </button>
                <button
                  onClick={() => chamar('/api/pipeline/continuar', {})}
                  disabled={loading}
                  title="Use se o texto foi cortado no fim — emenda a continuação sem regenerar"
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-4 py-2 text-sm text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
                  Continuar texto
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-zinc-500">
                  O que precisa mudar? A Izzi regenera com esse feedback e passa a calibrar este agente para este cliente.
                </p>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                  placeholder="Ex: as personas ficaram genéricas — quero mais foco no público B2B…"
                  className="w-full resize-none rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setMostrandoAjuste(false); setFeedback('') }}
                    className="rounded-xl border border-zinc-200 px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => chamar('/api/pipeline/ajustar', { feedback })}
                    disabled={loading || !feedback.trim()}
                    className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Regenerar com ajustes
                  </button>
                </div>
              </div>
            )}
            {etapa.ajustes && (
              <p className="text-[11px] text-zinc-400">Último ajuste pedido: “{etapa.ajustes}”</p>
            )}
          </div>
        )}

        {etapa.status === 'aprovado' && (
          <p className="text-[11px] text-zinc-400">
            Aprovado{etapa.aprovado_em ? ` em ${new Date(etapa.aprovado_em).toLocaleDateString('pt-BR')}` : ''} — disponível no Universo da Marca.
          </p>
        )}

        {erro && <p className="text-xs text-red-600">{erro}</p>}
        {info && <p className="flex items-center gap-1.5 text-xs text-green-600"><CheckCircle2 className="h-3.5 w-3.5" />{info}</p>}
      </div>
    </div>
  )
}
