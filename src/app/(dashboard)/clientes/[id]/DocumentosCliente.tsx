'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Brain, Edit2, Check, X, Loader2, ArrowDownToLine } from 'lucide-react'
import type { SecaoMarca } from './actions'
import { actionSalvarSecaoMarca } from './actions'
import { actionContinuarBriefingGeral } from './onboarding-actions'

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
  secoes: SecaoMarca[]
  podeEditar: boolean
}

// Documentos de nível cliente (marca_id = NULL): perfil do cliente e o
// briefing completo legado (gerado antes da arquitetura por marca).
export default function DocumentosCliente({ clienteId, secoes, podeEditar }: Props) {
  const docs = secoes
    .filter((s) => s.marcaId === null)
    .filter((s) => s.subcategoria === 'perfil_cliente' || s.subcategoria === 'briefing_completo')
    .sort((a, b) => {
      // perfil_cliente primeiro, briefing_completo depois
      const ordem = (sub: string | null) => (sub === 'perfil_cliente' ? 0 : 1)
      return ordem(a.subcategoria) - ordem(b.subcategoria)
    })

  if (docs.length === 0) return null

  return (
    <div className="space-y-3">
      {docs.map((secao) => (
        <DocumentoCard key={secao.id} secao={secao} clienteId={clienteId} podeEditar={podeEditar} />
      ))}
    </div>
  )
}

function DocumentoCard({
  secao,
  clienteId,
  podeEditar,
}: {
  secao: SecaoMarca
  clienteId: string
  podeEditar: boolean
}) {
  const router = useRouter()
  const textoAtual = (secao.conteudo?.texto as string) ?? ''
  const isLegado = secao.subcategoria === 'briefing_completo'

  const [aberto, setAberto] = useState(false)
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState(textoAtual)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [salvando, startSalvar] = useTransition()
  const [continuando, startContinuar] = useTransition()

  function abrirEdicao() {
    setTexto(textoAtual)
    setErro(null)
    setAviso(null)
    setEditando(true)
    setAberto(true)
  }

  function handleSalvar() {
    setErro(null)
    startSalvar(async () => {
      const res = await actionSalvarSecaoMarca({
        clienteId,
        marcaId: null,
        categoria: secao.categoria,
        subcategoria: secao.subcategoria ?? undefined,
        titulo: secao.titulo,
        conteudo: { texto },
        visivelParaCliente: secao.visivelParaCliente,
      })
      if (res.error) { setErro(res.error); return }
      setEditando(false)
      router.refresh()
    })
  }

  function handleContinuar() {
    setErro(null)
    setAviso(null)
    startContinuar(async () => {
      const res = await actionContinuarBriefingGeral(clienteId)
      if (res.error) { setErro(res.error); return }
      if (res.completo) { setAviso('O briefing já parece completo — nada a acrescentar.'); return }
      router.refresh()
    })
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50/60">
      <div className="flex w-full items-center justify-between px-5 py-3.5">
        <button onClick={() => setAberto((a) => !a)} className="flex items-center gap-2 text-left min-w-0">
          <Brain className="h-4 w-4 flex-none text-zinc-400" />
          <span className="truncate text-sm font-semibold text-zinc-800">{secao.titulo}</span>
          {isLegado ? (
            <span className="flex-none rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              Legado · todas as marcas
            </span>
          ) : (
            <span className="flex-none rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
              Perfil do Cliente · Izzi
            </span>
          )}
        </button>
        <div className="flex flex-none items-center gap-3">
          {podeEditar && !editando && (
            <>
              {isLegado && (
                <button
                  onClick={handleContinuar}
                  disabled={continuando}
                  className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-800 disabled:opacity-50"
                  title="Emenda o briefing de onde parou, caso tenha sido cortado"
                >
                  {continuando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowDownToLine className="h-3.5 w-3.5" />}
                  {continuando ? 'Continuando...' : 'Continuar'}
                </button>
              )}
              <button
                onClick={abrirEdicao}
                className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-800"
              >
                <Edit2 className="h-3.5 w-3.5" /> Editar
              </button>
            </>
          )}
          <button onClick={() => setAberto((a) => !a)} className="text-xs text-zinc-400">
            {aberto ? 'Recolher' : 'Abrir'}
          </button>
        </div>
      </div>

      {isLegado && aberto && !editando && (
        <p className="px-5 pb-1 text-[11px] text-amber-600">
          Este é o briefing antigo (todas as marcas juntas). Para os briefings isolados por marca, gere o Briefing por marca e veja na página de cada marca.
        </p>
      )}
      {aviso && <p className="px-5 pb-2 text-xs text-amber-600">{aviso}</p>}
      {erro && <p className="px-5 pb-2 text-xs text-red-500">{erro}</p>}

      {aberto && (
        <div className="border-t border-zinc-100 bg-white px-5 py-4 text-sm leading-relaxed text-zinc-700">
          {editando ? (
            <div className="space-y-3">
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={24}
                className="w-full rounded-lg border border-zinc-300 p-3 font-mono text-xs leading-relaxed focus:border-brand/40 focus:outline-none focus:ring-1 focus:ring-brand/30"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSalvar}
                  disabled={salvando}
                  className="flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
                >
                  {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Salvar
                </button>
                <button
                  onClick={() => { setEditando(false); setErro(null) }}
                  className="flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                >
                  <X className="h-3.5 w-3.5" /> Cancelar
                </button>
              </div>
            </div>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>{textoAtual}</ReactMarkdown>
          )}
        </div>
      )}
    </div>
  )
}
