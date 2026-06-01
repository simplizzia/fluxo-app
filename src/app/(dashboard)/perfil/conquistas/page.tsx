import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Trophy, Star } from 'lucide-react'
import { getCurrentProfile } from '@/lib/dal'
import { buscarMeusBadges } from '../../../(dashboard)/socias/gamificacao/actions'

export const metadata: Metadata = {
  title: 'Minhas Conquistas — Simplizzia',
}

export default async function ConquistasPage() {
  const profile = await getCurrentProfile()
  const { badges, pontuacaoMes } = await buscarMeusBadges()

  // Agrupa por badge
  const badgesUnicos = badges.reduce<Map<string, (typeof badges)[0] & { vezes: number }>>(
    (map, b) => {
      const existing = map.get(b.badge_id)
      if (existing) {
        existing.vezes++
      } else {
        map.set(b.badge_id, { ...b, vezes: 1 })
      }
      return map
    },
    new Map()
  )

  const mesAtual = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/perfil"
          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700"
        >
          <ArrowLeft className="h-3 w-3" />
          Perfil
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: 'linear-gradient(135deg, #A046C6 0%, #F9267C 100%)' }}
        >
          <Trophy className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Minhas Conquistas</h1>
          <p className="text-xs text-zinc-500">{profile.papel === 'cliente' ? 'Sua parceria conosco' : 'Seu desempenho na equipe'}</p>
        </div>
      </div>

      {/* Pontuação do mês */}
      {pontuacaoMes && (
        <section className="rounded-xl border border-brand/20 bg-brand-light/30 p-5">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-brand">
            {mesAtual}
          </p>
          <p className="text-3xl font-bold text-brand">{pontuacaoMes.pontos} pts</p>
          {pontuacaoMes.detalhes && pontuacaoMes.detalhes.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {pontuacaoMes.detalhes.map((d, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 rounded-full border border-brand/20 bg-white px-2.5 py-1 text-[11px] text-zinc-700"
                >
                  {d.icone ?? '⭐'} {d.badge}
                  <span className="font-semibold text-brand">+{d.pontos}</span>
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Badges conquistados */}
      {badgesUnicos.size === 0 ? (
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 py-12 text-center">
          <Star className="mx-auto mb-3 h-10 w-10 text-zinc-200" />
          <p className="text-sm text-zinc-500">
            Você ainda não conquistou nenhum badge.
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {profile.papel === 'cliente'
              ? 'Aprove demandas rapidamente e envie briefs completos para ganhar badges!'
              : 'Conclua demandas sem revisões e no prazo para ganhar badges!'}
          </p>
        </div>
      ) : (
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-zinc-700">
            Todos os badges
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[...badgesUnicos.values()].map((b) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const badge = b.badge as any
              return (
                <div
                  key={b.badge_id}
                  className="relative flex flex-col items-center rounded-xl border border-zinc-100 bg-zinc-50 p-4 text-center"
                >
                  {b.vezes > 1 && (
                    <span className="absolute right-2 top-2 rounded-full bg-brand px-1.5 py-0.5 text-[9px] font-bold text-white">
                      x{b.vezes}
                    </span>
                  )}
                  <span className="text-3xl">{badge?.icone ?? '🏆'}</span>
                  <p className="mt-2 text-xs font-semibold text-zinc-800">
                    {badge?.nome ?? 'Badge'}
                  </p>
                  <p className="mt-1 text-[10px] text-zinc-500 leading-tight">
                    {badge?.descricao ?? ''}
                  </p>
                  {badge?.beneficio_descricao && (
                    <p className="mt-2 text-[10px] font-medium text-amber-600">
                      🎁 {badge.beneficio_descricao}
                    </p>
                  )}
                  <p className="mt-2 text-[9px] text-zinc-400">
                    {new Date(b.conquistado_em).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Histórico */}
      {badges.length > 0 && (
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-zinc-700">
            Histórico de conquistas
          </h2>
          <div className="space-y-2">
            {badges.map((b) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const badge = b.badge as any
              return (
                <div
                  key={b.id}
                  className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2.5"
                >
                  <span className="text-lg">{badge?.icone ?? '🏆'}</span>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-zinc-800">{badge?.nome ?? 'Badge'}</p>
                  </div>
                  <p className="text-[10px] text-zinc-400">
                    {new Date(b.conquistado_em).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
