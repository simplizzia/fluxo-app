'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ChevronLeft, ChevronRight, Download, FileText } from 'lucide-react'
import {
  actionAprovarCard,
  actionReprovarCard,
} from '@/app/(dashboard)/board/actions'
import type { CardAprovacao, ArquivoAprovacao } from './actions'

interface Props {
  cardId: string
  card: CardAprovacao
  arquivos: ArquivoAprovacao[]
  podeAprovar: boolean
  ehEquipe: boolean
}

export default function AprovacaoActions({
  cardId,
  card,
  arquivos,
  podeAprovar,
  ehEquipe,
}: Props) {
  const router = useRouter()
  const [indice, setIndice] = useState(0)
  const [mostrandoReprova, setMostrandoReprova] = useState(false)
  const [motivoReprova, setMotivoReprova] = useState('')
  const [pendingAprovar, setPendingAprovar] = useState(false)
  const [pendingReprovar, setPendingReprovar] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aprovado, setAprovado] = useState(false)

  const arquivo = arquivos[indice]
  const total = arquivos.length

  async function handleAprovar() {
    setErro(null)
    setPendingAprovar(true)
    const res = await actionAprovarCard(cardId)
    setPendingAprovar(false)
    if (res.error) {
      setErro(res.error)
    } else {
      setAprovado(true)
    }
  }

  async function handleReprovar(e: React.FormEvent) {
    e.preventDefault()
    const comentario = motivoReprova.trim()
    if (!comentario) return
    setErro(null)
    setPendingReprovar(true)
    const res = await actionReprovarCard(cardId, comentario)
    setPendingReprovar(false)
    if (res.error) {
      setErro(res.error)
    } else {
      router.refresh()
    }
  }

  if (aprovado) {
    return (
      <div className="rounded-2xl border border-green-200 bg-white p-10 text-center">
        <p className="text-5xl">🎉</p>
        <p className="mt-4 text-lg font-bold text-green-700">Aprovado!</p>
        <p className="mt-2 text-sm text-zinc-500">
          Obrigada pela resposta rápida! A equipe foi notificada.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Preview principal */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {/* Navegação de múltiplos arquivos */}
        {total > 1 && (
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2">
            <button
              onClick={() => setIndice((i) => Math.max(0, i - 1))}
              disabled={indice === 0}
              className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-zinc-500">
              Arquivo {indice + 1} de {total}
              {arquivo.versao != null && (
                <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                  v{arquivo.versao}
                </span>
              )}
            </span>
            <button
              onClick={() => setIndice((i) => Math.min(total - 1, i + 1))}
              disabled={indice === total - 1}
              className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Área de preview */}
        <div className="min-h-48">
          <ArquivoPreview arquivo={arquivo} />
        </div>

        {/* Info do arquivo */}
        <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-2">
          <p className="truncate text-xs text-zinc-500">{arquivo.nome_arquivo}</p>
          {arquivo.url_assinada && (
            <a
              href={arquivo.url_assinada}
              target="_blank"
              rel="noopener noreferrer"
              download={arquivo.nome_arquivo}
              className="ml-2 shrink-0 rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
              title="Baixar arquivo"
            >
              <Download className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Thumbnails de navegação (quando múltiplos arquivos) */}
      {total > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {arquivos.map((arq, i) => (
            <button
              key={arq.id}
              onClick={() => setIndice(i)}
              className={`shrink-0 rounded-xl border-2 transition ${
                i === indice
                  ? 'border-brand shadow-sm'
                  : 'border-transparent hover:border-zinc-300'
              }`}
            >
              <ArquivoThumbnail arquivo={arq} />
            </button>
          ))}
        </div>
      )}

      {/* Ações de aprovação */}
      {podeAprovar && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="mb-1 text-sm font-semibold text-zinc-800">
            O que você acha desta entrega?
          </p>
          <p className="mb-4 text-xs text-zinc-400">
            {card.cliente.nome} · {card.tipo.nome}
          </p>

          {erro && (
            <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{erro}</p>
          )}

          {!mostrandoReprova ? (
            <div className="flex gap-2">
              <button
                onClick={handleAprovar}
                disabled={pendingAprovar || pendingReprovar}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 active:scale-[.98] disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                {pendingAprovar ? 'Aprovando…' : 'Aprovar ✓'}
              </button>
              <button
                onClick={() => setMostrandoReprova(true)}
                disabled={pendingAprovar || pendingReprovar}
                className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-100 active:scale-[.98] disabled:opacity-50"
              >
                Solicitar ajustes
              </button>
            </div>
          ) : (
            <form onSubmit={handleReprovar} className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700">
                  O que precisa ser ajustado?
                  <span className="ml-1 text-red-500">*</span>
                </label>
                <textarea
                  value={motivoReprova}
                  onChange={(e) => setMotivoReprova(e.target.value)}
                  placeholder="Descreva com clareza os ajustes necessários…"
                  rows={4}
                  disabled={pendingReprovar}
                  autoFocus
                  className="w-full resize-none rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/10 disabled:opacity-50"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!motivoReprova.trim() || pendingReprovar}
                  className="flex flex-1 items-center justify-center rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {pendingReprovar ? 'Enviando…' : 'Enviar feedback'}
                </button>
                <button
                  type="button"
                  onClick={() => { setMostrandoReprova(false); setMotivoReprova(''); setErro(null) }}
                  disabled={pendingReprovar}
                  className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm text-zinc-500 transition hover:bg-zinc-50"
                >
                  Voltar
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Equipe: read-only notice */}
      {ehEquipe && card.status === 'para_aprovacao' && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-center">
          <p className="text-xs text-amber-700">
            Aguardando resposta do cliente. Esta é a visualização que o cliente verá.
          </p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Subcomponentes de preview
// ---------------------------------------------------------------------------

function ArquivoPreview({ arquivo }: { arquivo: ArquivoAprovacao }) {
  const url = arquivo.url_assinada

  if (!url) {
    return (
      <div className="flex h-48 items-center justify-center text-zinc-400">
        <p className="text-sm">Prévia indisponível.</p>
      </div>
    )
  }

  // Imagem
  if (arquivo.mime_type.startsWith('image/')) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={arquivo.nome_arquivo}
        className="max-h-[60vh] w-full object-contain"
      />
    )
  }

  // Vídeo
  if (arquivo.mime_type.startsWith('video/')) {
    return (
      <video
        src={url}
        controls
        className="max-h-[60vh] w-full bg-black"
      />
    )
  }

  // PDF — iframe inline
  if (arquivo.mime_type === 'application/pdf') {
    return (
      <iframe
        src={url}
        title={arquivo.nome_arquivo}
        className="h-[60vh] w-full border-0"
      />
    )
  }

  // Outros (doc, xls, ppt, zip…) — não há preview, mostra link de download
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-3 px-6 text-center">
      <FileText className="h-10 w-10 text-zinc-300" />
      <p className="text-sm font-medium text-zinc-600">{arquivo.nome_arquivo}</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-medium text-brand transition hover:bg-brand-light"
      >
        Abrir arquivo →
      </a>
    </div>
  )
}

function ArquivoThumbnail({ arquivo }: { arquivo: ArquivoAprovacao }) {
  const url = arquivo.url_assinada

  if (arquivo.mime_type.startsWith('image/') && url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={arquivo.nome_arquivo}
        className="h-12 w-16 rounded-lg object-cover"
      />
    )
  }

  // Thumbnail genérico para não-imagens
  const cor = arquivo.mime_type.startsWith('video/')
    ? 'bg-blue-100 text-blue-500'
    : arquivo.mime_type === 'application/pdf'
      ? 'bg-red-100 text-red-500'
      : 'bg-zinc-100 text-zinc-400'

  return (
    <div
      className={`flex h-12 w-16 items-center justify-center rounded-lg text-xs font-bold ${cor}`}
    >
      {arquivo.mime_type.startsWith('video/')
        ? '▶'
        : arquivo.mime_type === 'application/pdf'
          ? 'PDF'
          : '📄'}
    </div>
  )
}
