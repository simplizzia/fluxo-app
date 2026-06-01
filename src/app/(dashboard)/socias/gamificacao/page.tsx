import { Trophy, Star, Users } from 'lucide-react'
import { requirePapel } from '@/lib/dal'
import {
  buscarBadgesDefinicoes,
  buscarRankingMensalAction,
  buscarBadgesConquistadosTodos,
} from './actions'
import GamificacaoPainel from './GamificacaoPainel'

export default async function GamificacaoPage() {
  await requirePapel('socia')

  const [badges, ranking, conquistados] = await Promise.all([
    buscarBadgesDefinicoes(),
    buscarRankingMensalAction(),
    buscarBadgesConquistadosTodos(),
  ])

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: 'linear-gradient(135deg, #A046C6 0%, #F9267C 100%)' }}
        >
          <Trophy className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-zinc-900">Gamificação</h1>
          <p className="text-xs text-zinc-500">
            Badges, pontuação e ranking de colaboradores e clientes
          </p>
        </div>
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-zinc-100 bg-white p-4 shadow-sm">
          <div className="mb-1 flex h-7 w-7 items-center justify-center rounded-lg bg-brand-light">
            <Trophy className="h-4 w-4 text-brand" />
          </div>
          <p className="text-2xl font-bold text-zinc-900">{badges.length}</p>
          <p className="text-xs text-zinc-500">Badges configurados</p>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-white p-4 shadow-sm">
          <div className="mb-1 flex h-7 w-7 items-center justify-center rounded-lg bg-green-50">
            <Star className="h-4 w-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900">{conquistados.length}</p>
          <p className="text-xs text-zinc-500">Badges neste mês</p>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-white p-4 shadow-sm">
          <div className="mb-1 flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50">
            <Users className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900">{ranking.length}</p>
          <p className="text-xs text-zinc-500">No ranking mensal</p>
        </div>
      </div>

      <GamificacaoPainel
        badges={badges}
        ranking={ranking}
        conquistados={conquistados}
      />
    </div>
  )
}
