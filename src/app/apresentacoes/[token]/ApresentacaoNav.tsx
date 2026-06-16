'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

export interface NavSlide {
  n: number
  label: string
}

/**
 * Navegador client-side para apresentações públicas.
 * - Barra de progresso de leitura no topo.
 * - Dots laterais (desktop) com rótulo por slide e destaque do slide ativo.
 * - Controle compacto "n / total" + prev/next (mobile).
 * Usa IntersectionObserver para acompanhar o slide visível.
 */
export function ApresentacaoNav({ slides, cor }: { slides: NavSlide[]; cor: string }) {
  const [ativo, setAtivo] = useState(0)
  const [progresso, setProgresso] = useState(0)

  // Acompanha qual slide está visível
  useEffect(() => {
    const secoes = slides
      .map((s) => document.getElementById(`slide-${s.n}`))
      .filter((el): el is HTMLElement => el !== null)

    const observer = new IntersectionObserver(
      (entries) => {
        const visivel = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visivel) {
          const n = Number(visivel.target.id.replace('slide-', ''))
          setAtivo(n - 1)
        }
      },
      { threshold: [0.25, 0.5, 0.75] },
    )
    secoes.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [slides])

  // Barra de progresso de scroll
  useEffect(() => {
    function onScroll() {
      const h = document.documentElement
      const max = h.scrollHeight - h.clientHeight
      setProgresso(max > 0 ? (h.scrollTop / max) * 100 : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const irPara = useCallback((index: number) => {
    const alvo = slides[index]
    if (!alvo) return
    document.getElementById(`slide-${alvo.n}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [slides])

  if (slides.length < 2) return null

  return (
    <>
      {/* Barra de progresso de leitura */}
      <div className="fixed inset-x-0 top-0 z-50 h-1 bg-transparent">
        <div
          className="h-full transition-[width] duration-150 ease-out"
          style={{ width: `${progresso}%`, background: cor }}
        />
      </div>

      {/* Dots laterais — desktop */}
      <nav
        aria-label="Navegação de slides"
        className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-2.5 lg:flex"
      >
        {slides.map((s, i) => {
          const isAtivo = i === ativo
          return (
            <button
              key={s.n}
              onClick={() => irPara(i)}
              aria-label={`Ir para: ${s.label}`}
              aria-current={isAtivo ? 'true' : undefined}
              className="group flex items-center justify-end gap-2"
            >
              <span className="pointer-events-none rounded-md bg-zinc-900/90 px-2 py-1 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                {s.label}
              </span>
              <span
                className="block rounded-full transition-all"
                style={{
                  width: isAtivo ? 12 : 8,
                  height: isAtivo ? 12 : 8,
                  background: isAtivo ? cor : '#d4d4d8',
                }}
              />
            </button>
          )
        })}
      </nav>

      {/* Controle compacto — mobile/tablet */}
      <div className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-full border border-zinc-200 bg-white/95 px-1.5 py-1 shadow-lg backdrop-blur lg:hidden">
        <button
          onClick={() => irPara(Math.max(0, ativo - 1))}
          disabled={ativo === 0}
          aria-label="Slide anterior"
          className="rounded-full p-1.5 text-zinc-500 transition hover:bg-zinc-100 disabled:opacity-30"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <span className="min-w-12 text-center text-xs font-medium tabular-nums text-zinc-600">
          {ativo + 1} / {slides.length}
        </span>
        <button
          onClick={() => irPara(Math.min(slides.length - 1, ativo + 1))}
          disabled={ativo === slides.length - 1}
          aria-label="Próximo slide"
          className="rounded-full p-1.5 text-zinc-500 transition hover:bg-zinc-100 disabled:opacity-30"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    </>
  )
}
