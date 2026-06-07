'use client'

import { useTransition } from 'react'
import { UserCircle2, Calendar } from 'lucide-react'
import type { Colaborador, StatusColaborador } from '@/app/(dashboard)/socias/actions'
import { actionAtualizarStatusColaborador } from '@/app/(dashboard)/socias/actions'

interface Props {
  colaboradores: Colaborador[]
}

const REGIME_LABEL: Record<string, string> = {
  clt: 'CLT',
  pj: 'PJ',
  freelancer: 'Freelancer',
}

const STATUS_COLORS: Record<string, string> = {
  ativo: 'bg-emerald-100 text-emerald-700',
  inativo: 'bg-zinc-100 text-zinc-500',
  em_avaliacao: 'bg-amber-100 text-amber-700',
}

const STATUS_LABEL: Record<string, string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
  em_avaliacao: 'Em avaliação',
}

export function AbaEquipe({ colaboradores }: Props) {
  const [isPending, startTransition] = useTransition()

  const ativos = colaboradores.filter((c) => c.status === 'ativo')
  const outros = colaboradores.filter((c) => c.status !== 'ativo')

  function toggleStatus(c: Colaborador) {
    const novoStatus: StatusColaborador = c.status === 'ativo' ? 'inativo' : 'ativo'
    startTransition(async () => {
      await actionAtualizarStatusColaborador(c.id, novoStatus)
    })
  }

  if (!colaboradores.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <UserCircle2 className="mb-3 h-10 w-10 text-zinc-300" />
        <p className="text-sm font-medium text-zinc-500">Nenhum colaborador cadastrado ainda.</p>
        <p className="mt-1 text-xs text-zinc-400">
          Convide pessoas via a aba <strong>Convites</strong>.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Ativos */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Ativos · {ativos.length}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ativos.map((c) => (
            <ColaboradorCard key={c.id} colaborador={c} onToggle={toggleStatus} isPending={isPending} />
          ))}
        </div>
      </section>

      {/* Inativos / Em avaliação */}
      {outros.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Inativos & Em avaliação · {outros.length}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {outros.map((c) => (
              <ColaboradorCard key={c.id} colaborador={c} onToggle={toggleStatus} isPending={isPending} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function ColaboradorCard({
  colaborador: c,
  onToggle,
  isPending,
}: {
  colaborador: Colaborador
  onToggle: (c: Colaborador) => void
  isPending: boolean
}) {
  const iniciais = (c.nome ?? '?')
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
          {iniciais}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900">{c.nome ?? '—'}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[c.status] ?? ''}`}>
              {STATUS_LABEL[c.status] ?? c.status}
            </span>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500">
              {REGIME_LABEL[c.regime] ?? c.regime}
            </span>
          </div>
        </div>
      </div>

      {c.especialidades?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {c.especialidades.slice(0, 3).map((e) => (
            <span key={e} className="rounded-full bg-zinc-50 border border-zinc-200 px-2 py-0.5 text-[10px] text-zinc-600">
              {e}
            </span>
          ))}
          {c.especialidades.length > 3 && (
            <span className="text-[10px] text-zinc-400">+{c.especialidades.length - 3}</span>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-400">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Desde {c.data_inicio ? new Date(c.data_inicio).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : '—'}
        </span>
        <button
          onClick={() => onToggle(c)}
          disabled={isPending}
          className="rounded-lg border border-zinc-200 px-2 py-1 text-[10px] font-medium text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 disabled:opacity-50 transition"
        >
          {c.status === 'ativo' ? 'Desativar' : 'Reativar'}
        </button>
      </div>
    </div>
  )
}
