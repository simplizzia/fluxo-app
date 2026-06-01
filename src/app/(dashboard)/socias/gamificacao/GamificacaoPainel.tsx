'use client'

import { useState, useTransition } from 'react'
import { Trophy, Star, Settings, Plus, Eye, EyeOff } from 'lucide-react'
import { actionSalvarBadge, actionToggleBadge } from './actions'
import type { Badge, BadgeConquistado, RankingEntry } from '@/types/gamificacao'

interface Props {
  badges: Badge[]
  ranking: RankingEntry[]
  conquistados: (BadgeConquistado & { usuario_nome: string })[]
}

type Aba = 'ranking' | 'badges' | 'feed'

export default function GamificacaoPainel({ badges: badgesInicial, ranking, conquistados }: Props) {
  const [aba, setAba] = useState<Aba>('ranking')
  const [badges, setBadges] = useState(badgesInicial)
  const [mostrandoFormBadge, setMostrandoFormBadge] = useState(false)
  const [badgeEditando, setBadgeEditando] = useState<Badge | null>(null)
  const [erroBadge, setErroBadge] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const ABAS: { id: Aba; label: string }[] = [
    { id: 'ranking', label: '🏆 Ranking' },
    { id: 'feed',    label: '⭐ Feed de Conquistas' },
    { id: 'badges',  label: '⚙️ Gerenciar Badges' },
  ]

  async function handleToggleBadge(id: string, ativoAtual: boolean) {
    startTransition(async () => {
      await actionToggleBadge(id, !ativoAtual)
      setBadges((prev) =>
        prev.map((b) => b.id === id ? { ...b, ativo: !ativoAtual } : b)
      )
    })
  }

  async function handleSalvarBadge(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErroBadge(null)
    const fd = new FormData(e.currentTarget)
    if (badgeEditando) fd.set('id', badgeEditando.id)

    try {
      await actionSalvarBadge(fd)
      setMostrandoFormBadge(false)
      setBadgeEditando(null)
    } catch (err) {
      setErroBadge(err instanceof Error ? err.message : 'Erro ao salvar')
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-100 px-4 pt-3">
        {ABAS.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`rounded-t-lg px-4 py-2 text-xs font-medium transition ${
              aba === a.id
                ? 'border-b-2 border-brand text-brand'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* Aba: Ranking */}
        {aba === 'ranking' && (
          <div className="space-y-2">
            {ranking.length === 0 ? (
              <div className="py-12 text-center">
                <Trophy className="mx-auto mb-3 h-10 w-10 text-zinc-200" />
                <p className="text-sm text-zinc-400">
                  Nenhuma pontuação registrada este mês ainda.
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  As pontuações são calculadas automaticamente ao concluir cards.
                </p>
              </div>
            ) : (
              ranking.map((entry, idx) => (
                <div
                  key={entry.usuario_id}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                    idx === 0 ? 'border-amber-200 bg-amber-50'
                    : idx === 1 ? 'border-zinc-200 bg-zinc-50'
                    : idx === 2 ? 'border-orange-100 bg-orange-50'
                    : 'border-zinc-100 bg-white'
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                    {idx === 0 ? <span className="text-lg">🥇</span>
                    : idx === 1 ? <span className="text-lg">🥈</span>
                    : idx === 2 ? <span className="text-lg">🥉</span>
                    : <span className="text-sm font-bold text-zinc-500">{idx + 1}</span>}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-zinc-800">{entry.nome}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-brand">{entry.pontos}</p>
                    <p className="text-[10px] text-zinc-400">pontos</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Aba: Feed de Conquistas */}
        {aba === 'feed' && (
          <div className="space-y-2">
            {conquistados.length === 0 ? (
              <div className="py-12 text-center">
                <Star className="mx-auto mb-3 h-10 w-10 text-zinc-200" />
                <p className="text-sm text-zinc-400">
                  Nenhuma conquista registrada este mês ainda.
                </p>
              </div>
            ) : (
              conquistados.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3"
                >
                  <span className="text-2xl">{(c.badge as Badge)?.icone ?? '🏆'}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-zinc-800">
                      {c.usuario_nome}
                    </p>
                    <p className="text-xs text-zinc-500">
                      conquistou{' '}
                      <span className="font-medium text-zinc-700">
                        {(c.badge as Badge)?.nome ?? 'Badge'}
                      </span>
                    </p>
                  </div>
                  <p className="shrink-0 text-[10px] text-zinc-400">
                    {new Date(c.conquistado_em).toLocaleDateString('pt-BR', {
                      day: '2-digit', month: 'short',
                    })}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {/* Aba: Gerenciar Badges */}
        {aba === 'badges' && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs text-zinc-500">
                Configure quais badges estão ativos e seus benefícios.
              </p>
              <button
                onClick={() => { setMostrandoFormBadge(true); setBadgeEditando(null) }}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-brand/40 hover:text-brand"
              >
                <Plus className="h-3 w-3" />
                Novo badge
              </button>
            </div>

            {/* Formulário de badge */}
            {(mostrandoFormBadge || badgeEditando) && (
              <form
                onSubmit={handleSalvarBadge}
                className="mb-4 space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4"
              >
                <p className="text-xs font-semibold text-zinc-700">
                  {badgeEditando ? 'Editar badge' : 'Novo badge'}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                      Nome
                    </label>
                    <input
                      name="nome"
                      required
                      defaultValue={badgeEditando?.nome}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-brand/40 focus:ring-1 focus:ring-brand/10"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                      Ícone (emoji)
                    </label>
                    <input
                      name="icone"
                      maxLength={4}
                      defaultValue={badgeEditando?.icone ?? '🏆'}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-brand/40"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                    Descrição
                  </label>
                  <textarea
                    name="descricao"
                    required
                    rows={2}
                    defaultValue={badgeEditando?.descricao}
                    className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-brand/40 focus:ring-1 focus:ring-brand/10"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                      Tipo
                    </label>
                    <select
                      name="tipo"
                      defaultValue={badgeEditando?.tipo ?? 'colaborador'}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-brand/40"
                    >
                      <option value="colaborador">Colaborador</option>
                      <option value="cliente">Cliente</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                      Ativo
                    </label>
                    <select
                      name="ativo"
                      defaultValue={badgeEditando ? String(badgeEditando.ativo) : 'true'}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-brand/40"
                    >
                      <option value="true">Sim</option>
                      <option value="false">Não</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                    Benefício (opcional)
                  </label>
                  <input
                    name="beneficio_descricao"
                    defaultValue={badgeEditando?.beneficio_descricao ?? ''}
                    placeholder="Ex.: Gift card R$50, 1h de mentoria…"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-brand/40"
                  />
                </div>
                {erroBadge && <p className="text-xs text-red-600">{erroBadge}</p>}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="rounded-lg bg-gradient-brand px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMostrandoFormBadge(false); setBadgeEditando(null); setErroBadge(null) }}
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-100"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {/* Lista de badges */}
            <div className="space-y-2">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition ${
                    badge.ativo ? 'border-zinc-100 bg-zinc-50' : 'border-zinc-100 bg-zinc-100 opacity-60'
                  }`}
                >
                  <span className="text-xl">{badge.icone}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-zinc-800">{badge.nome}</p>
                      <span className={`rounded-full px-2 py-px text-[9px] font-medium ${
                        badge.tipo === 'colaborador'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {badge.tipo}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500">{badge.descricao}</p>
                    {badge.beneficio_descricao && (
                      <p className="mt-0.5 text-[10px] text-amber-600">
                        🎁 {badge.beneficio_descricao}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => { setBadgeEditando(badge); setMostrandoFormBadge(false) }}
                      className="rounded p-1.5 text-zinc-400 transition hover:bg-zinc-200 hover:text-zinc-600"
                      title="Editar"
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleBadge(badge.id, badge.ativo)}
                      className={`rounded p-1.5 transition ${
                        badge.ativo
                          ? 'text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600'
                          : 'text-brand hover:bg-brand-light'
                      }`}
                      title={badge.ativo ? 'Desativar' : 'Ativar'}
                    >
                      {badge.ativo
                        ? <EyeOff className="h-3.5 w-3.5" />
                        : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
