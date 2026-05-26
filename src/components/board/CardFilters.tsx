'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import type { PrioridadeCard } from '@/types/database'

interface FilterOption {
  id: string
  nome: string
}

interface CardFiltersProps {
  clientes: FilterOption[]
  tipos: FilterOption[]
  executores: FilterOption[]
}

const PRIORIDADES: { value: PrioridadeCard; label: string }[] = [
  { value: 'urgente', label: 'Urgente' },
  { value: 'alta', label: 'Alta' },
  { value: 'normal', label: 'Normal' },
  { value: 'baixa', label: 'Baixa' },
]

export function CardFilters({ clientes, tipos, executores }: CardFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const clienteAtual = searchParams.get('cliente') ?? ''
  const tipoAtual = searchParams.get('tipo') ?? ''
  const prioridadeAtual = searchParams.get('prioridade') ?? ''
  const responsavelAtual = searchParams.get('responsavel') ?? ''

  const temFiltros = clienteAtual || tipoAtual || prioridadeAtual || responsavelAtual

  function setFilter(key: string, value: string) {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set(key, value)
      else params.delete(key)
      router.replace(`${pathname}?${params.toString()}`)
    })
  }

  function limparFiltros() {
    startTransition(() => {
      router.replace(pathname)
    })
  }

  const selectClass =
    'rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 cursor-pointer'

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Filtros
      </div>

      {/* Cliente */}
      <select
        value={clienteAtual}
        onChange={(e) => setFilter('cliente', e.target.value)}
        className={selectClass}
      >
        <option value="">Todos os clientes</option>
        {clientes.map((c) => (
          <option key={c.id} value={c.id}>{c.nome}</option>
        ))}
      </select>

      {/* Tipo */}
      <select
        value={tipoAtual}
        onChange={(e) => setFilter('tipo', e.target.value)}
        className={selectClass}
      >
        <option value="">Todos os tipos</option>
        {tipos.map((t) => (
          <option key={t.id} value={t.id}>{t.nome}</option>
        ))}
      </select>

      {/* Prioridade */}
      <select
        value={prioridadeAtual}
        onChange={(e) => setFilter('prioridade', e.target.value)}
        className={selectClass}
      >
        <option value="">Todas as prioridades</option>
        {PRIORIDADES.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>

      {/* Responsável */}
      <select
        value={responsavelAtual}
        onChange={(e) => setFilter('responsavel', e.target.value)}
        className={selectClass}
      >
        <option value="">Todos os responsáveis</option>
        {executores.map((e) => (
          <option key={e.id} value={e.id}>{e.nome}</option>
        ))}
      </select>

      {/* Limpar filtros */}
      {temFiltros && (
        <button
          onClick={limparFiltros}
          className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700"
        >
          <X className="h-3.5 w-3.5" />
          Limpar
        </button>
      )}
    </div>
  )
}
