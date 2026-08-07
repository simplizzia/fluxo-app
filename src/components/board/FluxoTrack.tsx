'use client'

import { useEffect, useRef, useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { actionBuscarFluxoCard } from '@/app/(dashboard)/board/actions'
import {
  etapasOrdenadas,
  etapaPorId,
  proximaAcaoLabel,
  isPortaoHumano,
  type FluxoEtapa,
} from '@/lib/cards/fluxos'

// ---------------------------------------------------------------------------
// Faixa de fluxo do card. Mostra o PRÓXIMO PASSO ("de quem é a bola") e uma
// TRILHA COMPACTA (só a vizinhança da etapa atual — o resto poluía). O "?" abre
// o fluxo completo + uma explicação. Encapsula seu próprio fetch para não mexer
// no estado do drawer. Sem fluxo, não renderiza nada.
// ---------------------------------------------------------------------------

// Quantas etapas mostrar antes/depois da atual na trilha compacta.
const ANTES = 1
const DEPOIS = 2

export function FluxoTrack({ cardId }: { cardId: string }) {
  const [etapas, setEtapas] = useState<FluxoEtapa[]>([])
  const [atualId, setAtualId] = useState<string | null>(null)
  const [nome, setNome] = useState<string | null>(null)
  const [descricao, setDescricao] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [aberto, setAberto] = useState(false)
  const popRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let vivo = true
    setCarregando(true)
    actionBuscarFluxoCard(cardId)
      .then((r) => {
        if (!vivo) return
        setEtapas(r.etapas)
        setAtualId(r.etapaAtualId)
        setNome(r.fluxoNome)
        setDescricao(r.fluxoDescricao)
        setCarregando(false)
      })
      .catch(() => {
        if (vivo) setCarregando(false)
      })
    return () => {
      vivo = false
    }
  }, [cardId])

  // Fecha o popover ao clicar fora.
  useEffect(() => {
    if (!aberto) return
    function onDown(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [aberto])

  if (carregando || etapas.length === 0) return null

  const ordenadas = etapasOrdenadas(etapas)
  const atual = etapaPorId(ordenadas, atualId) ?? ordenadas[0]
  const idxAtual = ordenadas.findIndex((e) => e.id === atual?.id)

  // Janela compacta em torno da etapa atual.
  const inicio = Math.max(0, idxAtual - ANTES)
  const fim = Math.min(ordenadas.length, idxAtual + DEPOIS + 1)
  const janela = ordenadas.slice(inicio, fim)
  const temAntes = inicio > 0
  const temDepois = fim < ordenadas.length

  function pill(etapa: FluxoEtapa, i: number, base: number) {
    const idx = base + i
    const feito = idx < idxAtual
    const ehAtual = idx === idxAtual
    return (
      <li
        key={etapa.id}
        className={[
          'rounded-full px-2.5 py-1 text-xs font-medium',
          ehAtual
            ? 'bg-brand text-white'
            : feito
              ? 'bg-green-100 text-green-700'
              : 'bg-zinc-100 text-zinc-400',
        ].join(' ')}
        title={etapa.label}
      >
        {etapa.label}
      </li>
    )
  }

  return (
    <div className="relative border-b border-zinc-100 bg-zinc-50/60 px-6 py-4">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Fluxo</span>
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="text-zinc-300 transition hover:text-brand"
          aria-label="Ver o fluxo completo desta demanda"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Próximo passo — de quem é a bola */}
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-800">
        <span
          className={[
            'inline-block h-2 w-2 flex-none rounded-full',
            atual && isPortaoHumano(atual) ? 'bg-amber-500' : 'bg-brand',
          ].join(' ')}
          aria-hidden="true"
        />
        {proximaAcaoLabel(atual)}
      </p>

      {/* Trilha compacta (vizinhança da etapa atual) */}
      <ol className="flex flex-wrap items-center gap-1.5">
        {temAntes && <li className="px-1 text-xs text-zinc-300">…</li>}
        {janela.map((e, i) => pill(e, i, inicio))}
        {temDepois && <li className="px-1 text-xs text-zinc-300">…</li>}
      </ol>

      {/* Popover: fluxo completo + explicação */}
      {aberto && (
        <div
          ref={popRef}
          className="absolute left-6 right-6 top-14 z-10 rounded-xl border border-zinc-200 bg-white p-4 shadow-xl"
        >
          <div className="mb-1 text-sm font-semibold text-zinc-900">{nome ?? 'Fluxo da demanda'}</div>
          {descricao && <p className="mb-3 text-xs leading-relaxed text-zinc-500">{descricao}</p>}
          <ol className="flex flex-wrap items-center gap-1.5">
            {ordenadas.map((e, i) => pill(e, i, 0))}
          </ol>
        </div>
      )}
    </div>
  )
}
