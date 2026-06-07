'use client'

/**
 * AvisoPopupModal — modal overlay global para avisos da equipe.
 *
 * Renderizado no layout do dashboard (Server Component) e montado
 * no cliente. Busca avisos não lidos na montagem e assina Realtime
 * para receber novos em tempo real.
 */

import { useState, useEffect, useCallback } from 'react'
import { X, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { actionMarcarAvisoLido, buscarAvisosNaoLidos } from '@/app/(dashboard)/socias/pessoas/actions'
import type { AvisoEquipe } from '@/app/(dashboard)/socias/pessoas/actions'

const STORAGE_KEY = 'izzi_avisos_vistos'

function getVistos(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
}
function marcarVisto(id: string) {
  const vistos = getVistos()
  if (!vistos.includes(id)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...vistos, id]))
  }
}

interface Props {
  organizationId: string
}

export function AvisoPopupModal({ organizationId }: Props) {
  const [fila, setFila] = useState<AvisoEquipe[]>([])
  const [fechando, setFechando] = useState(false)

  const atual = fila[0] ?? null

  // Carregar avisos não lidos na montagem
  useEffect(() => {
    buscarAvisosNaoLidos().then((avisos) => {
      const vistos = getVistos()
      const novos = avisos.filter((a) => !vistos.includes(a.id))
      if (novos.length) setFila(novos)
    }).catch(() => {/* silencioso */})
  }, [])

  // Realtime: assistir novos avisos publicados
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`avisos-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'avisos_equipe',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          const novo = payload.new as AvisoEquipe
          if (!novo.publicado_em) return
          const vistos = getVistos()
          if (vistos.includes(novo.id)) return
          setFila((f) => [...f, { ...novo, parceiro_ids: (novo.parceiro_ids ?? []) as string[] }])
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [organizationId])

  const fechar = useCallback(async () => {
    if (!atual) return
    setFechando(true)
    marcarVisto(atual.id)
    try { await actionMarcarAvisoLido(atual.id) } catch {/* silencioso */}
    setTimeout(() => {
      setFila((f) => f.slice(1))
      setFechando(false)
    }, 200)
  }, [atual])

  // Tecla Esc fecha
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') fechar() }
    if (atual) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [atual, fechar])

  if (!atual) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        className={[
          'relative w-full max-w-md rounded-2xl bg-white shadow-2xl transition-all duration-200',
          fechando ? 'scale-95 opacity-0' : 'scale-100 opacity-100',
        ].join(' ')}
      >
        {/* Imagem de banner (opcional) */}
        {atual.imagem_url && (
          <div className="overflow-hidden rounded-t-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={atual.imagem_url}
              alt={atual.titulo}
              className="h-40 w-full object-cover"
            />
          </div>
        )}

        {/* Cabeçalho com gradiente quando sem imagem */}
        {!atual.imagem_url && (
          <div className="rounded-t-2xl bg-gradient-to-r from-violet-600 to-pink-500 px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">
                I
              </div>
              <p className="text-xs font-semibold text-white/80">Aviso da Simplizzia</p>
            </div>
          </div>
        )}

        {/* Conteúdo */}
        <div className="p-6">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h2 className="text-lg font-bold text-zinc-900 leading-snug">{atual.titulo}</h2>
            <button
              onClick={fechar}
              className="flex-none rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-line">
            {atual.conteudo}
          </p>

          {/* Indicador de fila */}
          {fila.length > 1 && (
            <p className="mt-3 text-[11px] text-zinc-400">
              {fila.length - 1} aviso(s) restante(s)
            </p>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex gap-2 border-t border-zinc-100 px-6 pb-6 pt-4">
          {atual.link_url && (
            <a
              href={atual.link_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={fechar}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-pink-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {atual.link_label || 'Ver mais'}
            </a>
          )}
          <button
            onClick={fechar}
            className={[
              'rounded-xl px-4 py-2 text-sm font-semibold transition',
              atual.link_url
                ? 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                : 'flex-1 bg-zinc-900 text-white hover:bg-zinc-700',
            ].join(' ')}
          >
            Entendido ✓
          </button>
        </div>
      </div>
    </div>
  )
}
