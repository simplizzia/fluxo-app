'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Loader2, Kanban, Users, Calendar, Palette } from 'lucide-react'
import type { BuscaResultado } from '@/app/api/buscar/route'

const TIPO_CONFIG = {
  card:    { label: 'Demanda',   icon: Kanban,   color: 'text-violet-600' },
  cliente: { label: 'Cliente',   icon: Users,    color: 'text-blue-600'   },
  reuniao: { label: 'Reunião',   icon: Calendar, color: 'text-emerald-600'},
  marca:   { label: 'Marca',     icon: Palette,  color: 'text-pink-600'   },
} as const

export function BuscaGlobal() {
  const [aberto, setAberto] = useState(false)
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<BuscaResultado[]>([])
  const [carregando, setCarregando] = useState(false)
  const [selecionado, setSelecionado] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Atalho de teclado: Ctrl+K / Cmd+K
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setAberto((prev) => !prev)
      }
      if (e.key === 'Escape') setAberto(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  // Focar no input ao abrir
  useEffect(() => {
    if (aberto) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
      setResultados([])
      setSelecionado(0)
    }
  }, [aberto])

  // Busca com debounce
  const buscar = useCallback(async (q: string) => {
    if (q.length < 2) { setResultados([]); return }
    setCarregando(true)
    try {
      const res = await fetch(`/api/buscar?q=${encodeURIComponent(q)}`)
      const data = await res.json() as { resultados: BuscaResultado[] }
      setResultados(data.resultados ?? [])
      setSelecionado(0)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => buscar(query), 300)
    return () => clearTimeout(t)
  }, [query, buscar])

  // Navegação com teclado
  function onKeyDownInput(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelecionado((prev) => Math.min(prev + 1, resultados.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelecionado((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      if (resultados[selecionado]) navegar(resultados[selecionado].href)
    }
  }

  function navegar(href: string) {
    setAberto(false)
    router.push(href)
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-400 hover:border-zinc-300 hover:text-zinc-600 transition"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Buscar...</span>
        <kbd className="hidden sm:inline rounded border border-zinc-200 bg-white px-1 py-0.5 text-[10px] text-zinc-400">⌘K</kbd>
      </button>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={() => setAberto(false)}
      />

      {/* Dialog */}
      <div className="fixed left-1/2 top-16 z-50 w-full max-w-lg -translate-x-1/2 px-4">
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-2xl overflow-hidden">
          {/* Input */}
          <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3">
            {carregando
              ? <Loader2 className="h-4 w-4 text-zinc-400 animate-spin flex-none" />
              : <Search className="h-4 w-4 text-zinc-400 flex-none" />}
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDownInput}
              placeholder="Buscar demandas, clientes, reuniões..."
              className="flex-1 text-sm text-zinc-800 placeholder-zinc-400 outline-none bg-transparent"
            />
            <button onClick={() => setAberto(false)} className="text-zinc-300 hover:text-zinc-500">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Resultados */}
          {resultados.length > 0 && (
            <div className="py-2 max-h-80 overflow-y-auto">
              {/* Agrupar por tipo */}
              {(Object.keys(TIPO_CONFIG) as (keyof typeof TIPO_CONFIG)[])
                .filter((tipo) => resultados.some((r) => r.tipo === tipo))
                .map((tipo) => {
                  const cfg = TIPO_CONFIG[tipo]
                  const Icon = cfg.icon
                  const items = resultados.filter((r) => r.tipo === tipo)
                  return (
                    <div key={tipo}>
                      <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                        {cfg.label}
                      </p>
                      {items.map((item) => {
                        const idx = resultados.indexOf(item)
                        return (
                          <button
                            key={item.id}
                            onClick={() => navegar(item.href)}
                            onMouseEnter={() => setSelecionado(idx)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                              idx === selecionado ? 'bg-zinc-50' : 'hover:bg-zinc-50'
                            }`}
                          >
                            <Icon className={`h-4 w-4 flex-none ${cfg.color}`} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-zinc-800 truncate">{item.titulo}</p>
                              {item.subtitulo && (
                                <p className="text-[11px] text-zinc-400 truncate">{item.subtitulo}</p>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
            </div>
          )}

          {query.length >= 2 && !carregando && resultados.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-zinc-400">
              Nenhum resultado para &ldquo;{query}&rdquo;
            </div>
          )}

          {query.length < 2 && (
            <div className="px-4 py-4 text-center text-xs text-zinc-400">
              Digite ao menos 2 caracteres para buscar
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-zinc-100 px-4 py-2 flex items-center gap-4 text-[10px] text-zinc-400">
            <span>↑↓ navegar</span>
            <span>↵ abrir</span>
            <span>esc fechar</span>
          </div>
        </div>
      </div>
    </>
  )
}
