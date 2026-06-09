'use client'

import { useState, useTransition } from 'react'
import { X, ChevronDown, Loader2 } from 'lucide-react'
import { actionBulkUpdate } from '@/app/(dashboard)/board/actions'
import type { StatusCard, PrioridadeCard, PapelUsuario } from '@/types/database'
import type { BoardCard } from '@/app/(dashboard)/board/actions'

const STATUS_OPCOES: { value: Exclude<StatusCard, 'para_aprovacao' | 'concluido' | 'cancelado'>; label: string }[] = [
  { value: 'aguardando_info', label: 'Aguardando Info' },
  { value: 'a_fazer',         label: 'A Fazer' },
  { value: 'em_andamento',    label: 'Em Andamento' },
  { value: 'necessita_ajustes', label: 'Necessita Ajustes' },
]

const PRIORIDADE_OPCOES: { value: PrioridadeCard; label: string }[] = [
  { value: 'urgente', label: 'Urgente' },
  { value: 'alta',    label: 'Alta' },
  { value: 'normal',  label: 'Normal' },
  { value: 'baixa',   label: 'Baixa' },
]

interface ExecutorBasico {
  id: string
  nome: string
  papel: PapelUsuario
}

interface BulkActionsBarProps {
  selectedIds: string[]
  executores: ExecutorBasico[]
  onClear: () => void
  onCardsUpdated: (ids: string[], update: Partial<BoardCard>) => void
}

type Dropdown = 'status' | 'prioridade' | 'responsavel' | null

export function BulkActionsBar({ selectedIds, executores, onClear, onCardsUpdated }: BulkActionsBarProps) {
  const [dropdown, setDropdown] = useState<Dropdown>(null)
  const [isPending, startTransition] = useTransition()

  function toggleDropdown(d: Dropdown) {
    setDropdown((prev) => (prev === d ? null : d))
  }

  function aplicar(update: Parameters<typeof actionBulkUpdate>[1] & {
    _optimistic?: Partial<BoardCard>
  }) {
    const { _optimistic, ...serverUpdate } = update
    startTransition(async () => {
      setDropdown(null)
      const result = await actionBulkUpdate(selectedIds, serverUpdate)
      if (!result.error && _optimistic) {
        onCardsUpdated(selectedIds, _optimistic)
      }
    })
  }

  return (
    <div
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
      style={{ animation: 'fadeInUp 0.2s ease-out' }}
    >
      <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 shadow-xl">
        {/* Contador */}
        <span className="mr-1 text-sm font-semibold text-zinc-800">
          {selectedIds.length} selecionado{selectedIds.length !== 1 ? 's' : ''}
        </span>

        <div className="h-5 w-px bg-zinc-200" />

        {/* Mover para */}
        <div className="relative">
          <button
            disabled={isPending}
            onClick={() => toggleDropdown('status')}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50"
          >
            Mover para
            <ChevronDown className="h-3 w-3" />
          </button>
          {dropdown === 'status' && (
            <div className="absolute bottom-full mb-1 left-0 w-44 rounded-xl border border-zinc-200 bg-white py-1 shadow-lg">
              {STATUS_OPCOES.map((op) => (
                <button
                  key={op.value}
                  onClick={() => aplicar({ status: op.value, _optimistic: { status: op.value } as Partial<BoardCard> })}
                  className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 transition hover:bg-zinc-50"
                >
                  {op.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Atribuir a */}
        <div className="relative">
          <button
            disabled={isPending}
            onClick={() => toggleDropdown('responsavel')}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50"
          >
            Atribuir a
            <ChevronDown className="h-3 w-3" />
          </button>
          {dropdown === 'responsavel' && (
            <div className="absolute bottom-full mb-1 left-0 w-44 rounded-xl border border-zinc-200 bg-white py-1 shadow-lg">
              <button
                onClick={() => aplicar({ responsavel_id: null, _optimistic: { responsavel: null } as Partial<BoardCard> })}
                className="w-full px-3 py-1.5 text-left text-xs text-zinc-400 transition hover:bg-zinc-50"
              >
                Nenhum
              </button>
              {executores.map((e) => (
                <button
                  key={e.id}
                  onClick={() => aplicar({
                    responsavel_id: e.id,
                    _optimistic: { responsavel: { id: e.id, nome: e.nome } } as Partial<BoardCard>,
                  })}
                  className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 transition hover:bg-zinc-50"
                >
                  {e.nome}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Prioridade */}
        <div className="relative">
          <button
            disabled={isPending}
            onClick={() => toggleDropdown('prioridade')}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50"
          >
            Prioridade
            <ChevronDown className="h-3 w-3" />
          </button>
          {dropdown === 'prioridade' && (
            <div className="absolute bottom-full mb-1 left-0 w-36 rounded-xl border border-zinc-200 bg-white py-1 shadow-lg">
              {PRIORIDADE_OPCOES.map((op) => (
                <button
                  key={op.value}
                  onClick={() => aplicar({ prioridade: op.value, _optimistic: { prioridade: op.value } as Partial<BoardCard> })}
                  className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 transition hover:bg-zinc-50"
                >
                  {op.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />}

        <div className="h-5 w-px bg-zinc-200" />

        {/* Limpar seleção */}
        <button
          onClick={onClear}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100"
        >
          <X className="h-3.5 w-3.5" />
          Limpar
        </button>
      </div>
    </div>
  )
}
