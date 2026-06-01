'use client'

import { useState } from 'react'
import { Share2, ExternalLink, Trash2, Settings, TrendingUp, Eye, Heart, MessageCircle, Repeat2 } from 'lucide-react'
import { actionExcluirPublicacao, actionDesconectarIntegracao } from './actions'
import type { PublicacaoAgendada, IntegracaoSocial, MetricasSociais } from './actions'

type Resumo = {
  totalPublicacoes: number
  publicacoesPublicadas: number
  engajamentoMedio: number
  alcanceTotal: number
  topPosts: (PublicacaoAgendada & { ultimaMetrica?: MetricasSociais })[]
}

interface Props {
  publicacoes: PublicacaoAgendada[]
  resumo: Resumo
  integracoes: IntegracaoSocial[]
}

const STATUS_CORES: Record<string, string> = {
  rascunho:  'bg-zinc-100 text-zinc-600',
  agendado:  'bg-blue-100 text-blue-700',
  publicado: 'bg-green-100 text-green-700',
  falhou:    'bg-red-100 text-red-700',
}

const PLAT_LABEL: Record<string, string> = {
  facebook:  'Facebook',
  instagram: 'Instagram',
  linkedin:  'LinkedIn',
  tiktok:    'TikTok',
}

const PLAT_COR: Record<string, string> = {
  facebook:  'bg-blue-100 text-blue-700',
  instagram: 'bg-pink-100 text-pink-700',
  linkedin:  'bg-sky-100 text-sky-700',
  tiktok:    'bg-zinc-100 text-zinc-700',
}

type Aba = 'publicacoes' | 'top_posts' | 'integracoes'

const NOW = new Date()

export default function SocialPainel({ publicacoes, resumo, integracoes }: Props) {
  const [aba, setAba] = useState<Aba>('publicacoes')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroPlatforma, setFiltroPlatforma] = useState<string>('todas')
  const [excluindo, setExcluindo] = useState<string | null>(null)
  const [desconectando, setDesconectando] = useState<string | null>(null)
  const [pubs, setPubs] = useState(publicacoes)

  const pubsFiltradas = pubs.filter((p) => {
    if (filtroStatus !== 'todos' && p.status !== filtroStatus) return false
    if (filtroPlatforma !== 'todas' && p.plataforma !== filtroPlatforma) return false
    return true
  })

  async function handleExcluir(id: string) {
    if (!confirm('Excluir esta publicação?')) return
    setExcluindo(id)
    try {
      await actionExcluirPublicacao(id)
      setPubs((prev) => prev.filter((p) => p.id !== id))
    } finally {
      setExcluindo(null)
    }
  }

  async function handleDesconectar(id: string, plataforma: string) {
    if (!confirm(`Desconectar integração com ${PLAT_LABEL[plataforma] ?? plataforma}?`)) return
    setDesconectando(id)
    try {
      await actionDesconectarIntegracao(id)
    } finally {
      setDesconectando(null)
    }
  }

  const ABAS: { id: Aba; label: string }[] = [
    { id: 'publicacoes', label: 'Publicações' },
    { id: 'top_posts',   label: 'Top Posts' },
    { id: 'integracoes', label: 'Integrações' },
  ]

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
        {/* Aba: Publicações */}
        {aba === 'publicacoes' && (
          <>
            {/* Filtros */}
            <div className="mb-4 flex flex-wrap gap-2">
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-700 outline-none focus:border-brand/40"
              >
                <option value="todos">Todos os status</option>
                <option value="rascunho">Rascunho</option>
                <option value="agendado">Agendado</option>
                <option value="publicado">Publicado</option>
                <option value="falhou">Falhou</option>
              </select>
              <select
                value={filtroPlatforma}
                onChange={(e) => setFiltroPlatforma(e.target.value)}
                className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-700 outline-none focus:border-brand/40"
              >
                <option value="todas">Todas as plataformas</option>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="linkedin">LinkedIn</option>
              </select>
            </div>

            {pubsFiltradas.length === 0 ? (
              <div className="py-12 text-center">
                <Share2 className="mx-auto mb-3 h-10 w-10 text-zinc-200" />
                <p className="text-sm text-zinc-400">Nenhuma publicação encontrada.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pubsFiltradas.map((pub) => (
                  <div
                    key={pub.id}
                    className="flex items-start gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3"
                  >
                    <Share2 className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-px text-[10px] font-semibold ${PLAT_COR[pub.plataforma] ?? 'bg-zinc-100 text-zinc-600'}`}>
                          {PLAT_LABEL[pub.plataforma] ?? pub.plataforma}
                        </span>
                        <span className="text-[10px] text-zinc-400">{pub.tipo_conteudo}</span>
                        <span className={`rounded-full px-2 py-px text-[10px] font-medium ${STATUS_CORES[pub.status] ?? 'bg-zinc-100 text-zinc-500'}`}>
                          {pub.status}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-zinc-700">{pub.legenda}</p>
                      {pub.card && (
                        <p className="mt-0.5 text-[10px] text-zinc-400">
                          Card: {pub.card.titulo}
                        </p>
                      )}
                      <p className="mt-0.5 text-[10px] text-zinc-400">
                        {pub.status === 'publicado' && pub.publicado_em
                          ? `Publicado em ${new Date(pub.publicado_em).toLocaleString('pt-BR')}`
                          : `Agendado para ${new Date(pub.data_agendada).toLocaleString('pt-BR')}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {pub.plataforma_post_id && (
                        <a
                          href={`https://www.facebook.com/${pub.plataforma_post_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded p-1 text-zinc-400 transition hover:bg-zinc-200 hover:text-zinc-700"
                          title="Ver post"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {['rascunho', 'agendado'].includes(pub.status) && (
                        <button
                          onClick={() => handleExcluir(pub.id)}
                          disabled={excluindo === pub.id}
                          className="rounded p-1 text-zinc-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Aba: Top Posts */}
        {aba === 'top_posts' && (
          <div className="space-y-3">
            {resumo.topPosts.length === 0 ? (
              <div className="py-12 text-center">
                <TrendingUp className="mx-auto mb-3 h-10 w-10 text-zinc-200" />
                <p className="text-sm text-zinc-400">
                  Nenhum dado de métricas disponível ainda.
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  As métricas são coletadas semanalmente dos posts publicados.
                </p>
              </div>
            ) : (
              resumo.topPosts.map((post, idx) => (
                <div
                  key={post.id}
                  className="rounded-xl border border-zinc-100 bg-zinc-50 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-light text-xs font-bold text-brand">
                      {idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-px text-[10px] font-semibold ${PLAT_COR[post.plataforma] ?? 'bg-zinc-100 text-zinc-600'}`}>
                          {PLAT_LABEL[post.plataforma] ?? post.plataforma}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-zinc-700">{post.legenda}</p>
                    </div>
                  </div>
                  {post.ultimaMetrica && (
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      <MetricaKpi label="Alcance" value={post.ultimaMetrica.alcance} icon={<Eye className="h-3 w-3" />} />
                      <MetricaKpi label="Curtidas" value={post.ultimaMetrica.curtidas} icon={<Heart className="h-3 w-3" />} />
                      <MetricaKpi label="Comentários" value={post.ultimaMetrica.comentarios} icon={<MessageCircle className="h-3 w-3" />} />
                      <MetricaKpi label="Compart." value={post.ultimaMetrica.compartilhamentos} icon={<Repeat2 className="h-3 w-3" />} />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Aba: Integrações */}
        {aba === 'integracoes' && (
          <div className="space-y-3">
            {/* Botões de conexão */}
            <div className="mb-4 flex flex-wrap gap-2">
              <a
                href="/api/auth/meta"
                className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                <span className="text-blue-600">f</span>
                Conectar Facebook/Instagram
              </a>
              <a
                href="/api/auth/linkedin"
                className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                <span className="text-sky-600">in</span>
                Conectar LinkedIn
              </a>
            </div>

            {integracoes.length === 0 ? (
              <div className="py-10 text-center">
                <Settings className="mx-auto mb-3 h-8 w-8 text-zinc-200" />
                <p className="text-sm text-zinc-400">
                  Nenhuma rede social conectada ainda.
                </p>
              </div>
            ) : (
              integracoes.map((integ) => {
                const expirou = integ.expires_at && new Date(integ.expires_at) < NOW
                const expiraEm7 = integ.expires_at && !expirou &&
                  new Date(integ.expires_at).getTime() - NOW.getTime() < 7 * 24 * 60 * 60 * 1000

                return (
                  <div
                    key={integ.id}
                    className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3"
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${PLAT_COR[integ.plataforma] ?? 'bg-zinc-100 text-zinc-600'}`}>
                      {(PLAT_LABEL[integ.plataforma] ?? 'S')[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-800">
                        {PLAT_LABEL[integ.plataforma] ?? integ.plataforma}
                        {integ.page_nome && (
                          <span className="ml-1.5 text-xs font-normal text-zinc-500">
                            — {integ.page_nome}
                          </span>
                        )}
                      </p>
                      <p className={`text-[10px] ${expirou ? 'text-red-500' : expiraEm7 ? 'text-amber-600' : 'text-zinc-400'}`}>
                        {integ.ativo ? (
                          integ.expires_at
                            ? expirou
                              ? 'Token expirado — reconecte'
                              : `Expira em ${new Date(integ.expires_at).toLocaleDateString('pt-BR')}`
                            : 'Conectado'
                        ) : 'Desconectado'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDesconectar(integ.id, integ.plataforma)}
                      disabled={desconectando === integ.id}
                      className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-500 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                    >
                      {desconectando === integ.id ? 'Desconectando…' : 'Desconectar'}
                    </button>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function MetricaKpi({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white px-2 py-2 text-center shadow-sm">
      <div className="flex items-center justify-center gap-1 text-zinc-400">
        {icon}
        <span className="text-[9px] uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-0.5 text-sm font-bold text-zinc-800">
        {value.toLocaleString('pt-BR')}
      </p>
    </div>
  )
}
