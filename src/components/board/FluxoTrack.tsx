'use client'

import { useEffect, useState } from 'react'
import { actionBuscarFluxoCard } from '@/app/(dashboard)/board/actions'
import {
  etapasOrdenadas,
  etapaPorId,
  proximaAcaoLabel,
  isPortaoHumano,
  type FluxoEtapa,
} from '@/lib/cards/fluxos'

// ---------------------------------------------------------------------------
// Faixa de fluxo do card: mostra a TRILHA de etapas (o que já foi feito, onde
// está, o que falta) e o PRÓXIMO PASSO ("de quem é a bola"). Combate o "não sei
// se é copy ou design / qual o próximo passo". Encapsula seu próprio fetch para
// não mexer no estado do drawer. Se o card não tem fluxo, não renderiza nada.
// ---------------------------------------------------------------------------

export function FluxoTrack({ cardId }: { cardId: string }) {
  const [etapas, setEtapas] = useState<FluxoEtapa[]>([])
  const [atualId, setAtualId] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let vivo = true
    setCarregando(true)
    actionBuscarFluxoCard(cardId)
      .then((r) => {
        if (!vivo) return
        setEtapas(r.etapas)
        setAtualId(r.etapaAtualId)
        setCarregando(false)
      })
      .catch(() => {
        if (vivo) setCarregando(false)
      })
    return () => {
      vivo = false
    }
  }, [cardId])

  if (carregando || etapas.length === 0) return null

  const ordenadas = etapasOrdenadas(etapas)
  const atual = etapaPorId(ordenadas, atualId) ?? ordenadas[0]
  const idxAtual = ordenadas.findIndex((e) => e.id === atual?.id)

  return (
    <div className="border-b border-zinc-100 bg-zinc-50/60 px-6 py-4">
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
        Fluxo
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

      {/* Trilha de etapas */}
      <ol className="flex flex-wrap items-center gap-1.5">
        {ordenadas.map((etapa, i) => {
          const feito = i < idxAtual
          const ehAtual = i === idxAtual
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
        })}
      </ol>
    </div>
  )
}
