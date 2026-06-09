'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Share2, ExternalLink, Trash2, Settings,
  TrendingUp, Eye, Heart, MessageCircle, Repeat2,
  Plus, X, Upload, AlertCircle, CheckCircle2, Users,
} from 'lucide-react'
import { actionExcluirPublicacao, actionDesconectarIntegracao, actionCriarPublicacao } from './actions'
import type { PublicacaoAgendada, IntegracaoSocial, MetricasSociais, ClienteSimples } from './actions'

type Resumo = {
  totalPublicacoes: number
  publicacoesPublicadas: number
  engajamentoMedio: number
  alcanceTotal: number
  topPosts: (PublicacaoAgendada & { ultimaMetrica?: MetricasSociais })[]
}

const PLAT_LABEL: Record<string, string> = {
  facebook:  'Facebook',
  instagram: 'Instagram',
  linkedin:  'LinkedIn',
  tiktok:    'TikTok',
}

const PLAT_NOMES_CONN: Record<string, string> = {
  meta:     'Facebook e Instagram',
  linkedin: 'LinkedIn',
}

const STATUS_CORES: Record<string, string> = {
  rascunho:  'bg-zinc-100 text-zinc-600',
  agendado:  'bg-blue-100 text-blue-700',
  publicado: 'bg-green-100 text-green-700',
  falhou:    'bg-red-100 text-red-700',
}

const PLAT_COR: Record<string, string> = {
  facebook:  'bg-blue-100 text-blue-700',
  instagram: 'bg-pink-100 text-pink-700',
  linkedin:  'bg-sky-100 text-sky-700',
  tiktok:    'bg-zinc-100 text-zinc-700',
}

type Aba = 'publicacoes' | 'top_posts' | 'integracoes'

const NOW = new Date()

interface Props {
  publicacoes: PublicacaoAgendada[]
  resumo: Resumo
  integracoes: IntegracaoSocial[]
  clientes: ClienteSimples[]
  socialOk?:    string | null
  socialError?: string | null
  clienteIdOk?: string | null
}

export default function SocialPainel({
  publicacoes, resumo, integracoes, clientes,
  socialOk, socialError, clienteIdOk,
}: Props) {
  const router = useRouter()
  const [aba, setAba] = useState<Aba>(socialOk || socialError ? 'integracoes' : 'publicacoes')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroPlatforma, setFiltroPlatforma] = useState<string>('todas')
  const [excluindo, setExcluindo] = useState<string | null>(null)
  const [desconectando, setDesconectando] = useState<string | null>(null)
  const [pubs, setPubs] = useState(publicacoes)
  const [sheetAberto, setSheetAberto] = useState(false)
  const [banner, setBanner] = useState<{ tipo: 'ok' | 'erro'; msg: string } | null>(() => {
    if (socialOk) {
      const plat = PLAT_NOMES_CONN[socialOk] ?? socialOk
      const cliente = clienteIdOk
        ? clientes.find((c) => c.id === clienteIdOk)?.nome ?? 'cliente'
        : null
      const msg = cliente
        ? `${plat} conectado com sucesso para ${cliente}!`
        : `${plat} conectado com sucesso!`
      return { tipo: 'ok', msg }
    }
    if (socialError) {
      return { tipo: 'erro', msg: `Falha ao conectar ${PLAT_NOMES_CONN[socialError] ?? socialError}. Tente novamente.` }
    }
    return null
  })

  // Remove os query params da URL sem recarregar
  useEffect(() => {
    if (socialOk || socialError) {
      router.replace('/socias/social', { scroll: false })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Agrupa integrações por cliente (null = agência)
  type GrupoIntegracao = { clienteId: string | null; clienteNome: string; itens: IntegracaoSocial[] }

  const grupos: GrupoIntegracao[] = []
  for (const integ of integracoes) {
    const cid   = integ.cliente_id ?? null
    const nome  = integ.cliente?.nome ?? (cid ? `Cliente ${cid.slice(0, 6)}` : '— Agência —')
    let grupo = grupos.find((g) => g.clienteId === cid)
    if (!grupo) {
      grupo = { clienteId: cid, clienteNome: nome, itens: [] }
      grupos.push(grupo)
    }
    grupo.itens.push(integ)
  }

  const integracoesAtivas = integracoes.filter((i) => i.ativo)

  return (
    <>
      {/* Banner de feedback pós-OAuth */}
      {banner && (
        <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
          banner.tipo === 'ok'
            ? 'border-green-200 bg-green-50 text-green-800'
            : 'border-red-200 bg-red-50 text-red-800'
        }`}>
          {banner.tipo === 'ok'
            ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            : <AlertCircle  className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          }
          <span className="flex-1">{banner.msg}</span>
          <button onClick={() => setBanner(null)} className="rounded p-0.5 opacity-60 hover:opacity-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

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
          {/* ============================================================ */}
          {/* Aba: Publicações                                             */}
          {/* ============================================================ */}
          {aba === 'publicacoes' && (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-2">
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
                <div className="ml-auto">
                  <button
                    onClick={() => setSheetAberto(true)}
                    disabled={integracoesAtivas.length === 0}
                    title={integracoesAtivas.length === 0 ? 'Conecte uma rede social primeiro (aba Integrações)' : ''}
                    className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Nova publicação
                  </button>
                </div>
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
                          {pub.rotulo_ia && (
                            <span className="rounded-full bg-purple-100 px-2 py-px text-[10px] font-medium text-purple-700">IA</span>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-zinc-700">{pub.legenda}</p>
                        {pub.card && (
                          <p className="mt-0.5 text-[10px] text-zinc-400">Card: {pub.card.titulo}</p>
                        )}
                        <p className="mt-0.5 text-[10px] text-zinc-400">
                          {pub.status === 'publicado' && pub.publicado_em
                            ? `Publicado em ${new Date(pub.publicado_em).toLocaleString('pt-BR')}`
                            : `Agendado para ${new Date(pub.data_agendada).toLocaleString('pt-BR')}`}
                        </p>
                        {pub.status === 'falhou' && pub.erro_mensagem && (
                          <p className="mt-0.5 flex items-center gap-1 text-[10px] text-red-500">
                            <AlertCircle className="h-2.5 w-2.5 shrink-0" />
                            {pub.erro_mensagem}
                            {pub.tentativas > 0 && (
                              <span className="ml-1 text-zinc-400">({pub.tentativas}/3 tentativas)</span>
                            )}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {pub.plataforma_post_id && (
                          <a
                            href={`https://www.facebook.com/${pub.plataforma_post_id}`}
                            target="_blank" rel="noopener noreferrer"
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

          {/* ============================================================ */}
          {/* Aba: Top Posts                                               */}
          {/* ============================================================ */}
          {aba === 'top_posts' && (
            <div className="space-y-3">
              {resumo.topPosts.length === 0 ? (
                <div className="py-12 text-center">
                  <TrendingUp className="mx-auto mb-3 h-10 w-10 text-zinc-200" />
                  <p className="text-sm text-zinc-400">Nenhum dado de métricas disponível ainda.</p>
                  <p className="mt-1 text-xs text-zinc-400">As métricas são coletadas semanalmente dos posts publicados.</p>
                </div>
              ) : (
                resumo.topPosts.map((post, idx) => (
                  <div key={post.id} className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
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
                        <MetricaKpi label="Alcance"     value={post.ultimaMetrica.alcance}          icon={<Eye className="h-3 w-3" />} />
                        <MetricaKpi label="Curtidas"    value={post.ultimaMetrica.curtidas}          icon={<Heart className="h-3 w-3" />} />
                        <MetricaKpi label="Comentários" value={post.ultimaMetrica.comentarios}       icon={<MessageCircle className="h-3 w-3" />} />
                        <MetricaKpi label="Compart."    value={post.ultimaMetrica.compartilhamentos} icon={<Repeat2 className="h-3 w-3" />} />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* Aba: Integrações (agrupadas por cliente)                     */}
          {/* ============================================================ */}
          {aba === 'integracoes' && (
            <IntegracoesPorCliente
              grupos={grupos}
              clientes={clientes}
              desconectando={desconectando}
              onDesconectar={handleDesconectar}
            />
          )}
        </div>
      </div>

      {/* Sheet: Nova Publicação */}
      {sheetAberto && (
        <NovaPublicacaoSheet
          integracoes={integracoesAtivas}
          clientes={clientes}
          onClose={() => setSheetAberto(false)}
          onCriada={(nova) => setPubs((prev) => [nova, ...prev])}
        />
      )}
    </>
  )
}

// ============================================================================
// Integrações por cliente
// ============================================================================

type GrupoIntegracao = { clienteId: string | null; clienteNome: string; itens: IntegracaoSocial[] }

function IntegracoesPorCliente({
  grupos,
  clientes,
  desconectando,
  onDesconectar,
}: {
  grupos: GrupoIntegracao[]
  clientes: ClienteSimples[]
  desconectando: string | null
  onDesconectar: (id: string, plataforma: string) => void
}) {
  const [clienteSelecionado, setClienteSelecionado] = useState<string>('__agencia__')

  // clienteId para passar nas URLs OAuth
  const clienteIdParam =
    clienteSelecionado === '__agencia__' ? null : clienteSelecionado

  return (
    <div className="space-y-4">
      {/* Selector de cliente para conectar */}
      <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
        <p className="mb-3 text-xs font-medium text-zinc-600">
          Conectar nova conta de rede social
        </p>
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 shrink-0 text-zinc-400" />
          <select
            value={clienteSelecionado}
            onChange={(e) => setClienteSelecionado(e.target.value)}
            className="flex-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-700 outline-none focus:border-brand/40"
          >
            <option value="__agencia__">— Conta da agência —</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/auth/meta${clienteIdParam ? `?cliente_id=${clienteIdParam}` : ''}`}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            <span className="text-blue-600 font-bold">f</span>
            Conectar Facebook / Instagram
          </a>
          <a
            href={`/api/auth/linkedin${clienteIdParam ? `?cliente_id=${clienteIdParam}` : ''}`}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            <span className="text-sky-600 font-bold">in</span>
            Conectar LinkedIn
          </a>
        </div>
      </div>

      {/* Integrações existentes, agrupadas por cliente */}
      {grupos.length === 0 ? (
        <div className="py-10 text-center">
          <Settings className="mx-auto mb-3 h-8 w-8 text-zinc-200" />
          <p className="text-sm text-zinc-400">Nenhuma rede social conectada ainda.</p>
        </div>
      ) : (
        grupos.map((grupo) => (
          <div key={grupo.clienteId ?? '__agencia__'}>
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              <Users className="h-3 w-3" />
              {grupo.clienteNome}
            </p>
            <div className="space-y-2">
              {grupo.itens.map((integ) => {
                const expirou   = integ.expires_at && new Date(integ.expires_at) < NOW
                const expiraEm7 = integ.expires_at && !expirou &&
                  new Date(integ.expires_at).getTime() - NOW.getTime() < 7 * 24 * 60 * 60 * 1000

                return (
                  <div
                    key={integ.id}
                    className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-white px-4 py-3"
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${PLAT_COR[integ.plataforma] ?? 'bg-zinc-100 text-zinc-600'}`}>
                      {(PLAT_LABEL[integ.plataforma] ?? 'S')[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-800">
                        {PLAT_LABEL[integ.plataforma] ?? integ.plataforma}
                        {integ.page_nome && (
                          <span className="ml-1.5 text-xs font-normal text-zinc-500">— {integ.page_nome}</span>
                        )}
                      </p>
                      <p className={`text-[10px] ${expirou ? 'text-red-500' : expiraEm7 ? 'text-amber-600' : 'text-zinc-400'}`}>
                        {integ.ativo
                          ? integ.expires_at
                            ? expirou
                              ? 'Token expirado — reconecte'
                              : `Expira em ${new Date(integ.expires_at).toLocaleDateString('pt-BR')}`
                            : 'Conectado'
                          : 'Desconectado'}
                      </p>
                    </div>
                    <button
                      onClick={() => onDesconectar(integ.id, integ.plataforma)}
                      disabled={desconectando === integ.id}
                      className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-500 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                    >
                      {desconectando === integ.id ? 'Desconectando…' : 'Desconectar'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ============================================================================
// Sheet: Nova Publicação standalone
// ============================================================================

function NovaPublicacaoSheet({
  integracoes,
  clientes,
  onClose,
  onCriada,
}: {
  integracoes: IntegracaoSocial[]
  clientes: ClienteSimples[]
  onClose: () => void
  onCriada: (pub: PublicacaoAgendada) => void
}) {
  // Ao selecionar um cliente, filtra as integrações disponíveis
  const [clienteFiltro, setClienteFiltro] = useState<string>('__todos__')
  const [tipoConteudo, setTipoConteudo]   = useState('feed')
  const [legenda, setLegenda]             = useState('')
  const [hashtags, setHashtags]           = useState('')
  const [dataAgendada, setDataAgendada]   = useState('')
  const [rotuloIa, setRotuloIa]           = useState(false)
  const [nomeArquivo, setNomeArquivo]     = useState<string | null>(null)
  const [erro, setErro]                   = useState<string | null>(null)
  const [pending, startTransition]        = useTransition()

  // Filtra integracoes pelo cliente selecionado
  const integracoesFiltradas = clienteFiltro === '__todos__'
    ? integracoes
    : integracoes.filter((i) =>
        clienteFiltro === '__agencia__'
          ? i.cliente_id === null
          : i.cliente_id === clienteFiltro
      )

  const [plataforma, setPlataforma] = useState(integracoesFiltradas[0]?.plataforma ?? '')

  // Quando muda o cliente, reseta a plataforma para a primeira disponível
  useEffect(() => {
    setPlataforma(integracoesFiltradas[0]?.plataforma ?? '')
  }, [clienteFiltro]) // eslint-disable-line react-hooks/exhaustive-deps

  // Mapa plataforma → integracao_id (dentro das integrações filtradas)
  const integracaoMap = new Map(integracoesFiltradas.map((i) => [i.plataforma, i.id]))

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro(null)

    const integracaoId = integracaoMap.get(plataforma)
    if (!integracaoId) {
      setErro('Nenhuma integração ativa para a plataforma selecionada.')
      return
    }

    const fd = new FormData(e.currentTarget)
    fd.set('integracao_id', integracaoId)
    fd.set('rotulo_ia', String(rotuloIa))

    startTransition(async () => {
      try {
        await actionCriarPublicacao(fd)
        const agora = new Date().toISOString()
        onCriada({
          id:                 crypto.randomUUID(),
          organization_id:    '',
          card_id:            null,
          integracao_id:      integracaoId,
          plataforma,
          tipo_conteudo:      tipoConteudo,
          legenda,
          hashtags:           hashtags || null,
          storage_path:       null,
          data_agendada:      dataAgendada,
          publicado_em:       null,
          status:             'agendado',
          plataforma_post_id: null,
          tentativas:         0,
          rotulo_ia:          rotuloIa,
          erro_mensagem:      null,
          created_at:         agora,
        })
        onClose()
      } catch (err) {
        setErro(err instanceof Error ? err.message : 'Erro ao criar publicação.')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/30">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-800">Nova publicação</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
          {/* Filtro por cliente */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">
              Cliente
            </label>
            <select
              value={clienteFiltro}
              onChange={(e) => setClienteFiltro(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand/50"
            >
              <option value="__todos__">Todos os clientes</option>
              <option value="__agencia__">— Conta da agência —</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          {/* Plataforma (filtrada pelo cliente) */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Plataforma</label>
            {integracoesFiltradas.length === 0 ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Nenhuma integração ativa para este cliente. Conecte uma conta na aba Integrações.
              </p>
            ) : (
              <select
                name="plataforma"
                value={plataforma}
                onChange={(e) => setPlataforma(e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand/50"
              >
                {integracoesFiltradas.map((integ) => (
                  <option key={integ.id} value={integ.plataforma}>
                    {PLAT_LABEL[integ.plataforma] ?? integ.plataforma}
                    {integ.page_nome ? ` — ${integ.page_nome}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Tipo de conteúdo */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Tipo de conteúdo</label>
            <select
              name="tipo_conteudo"
              value={tipoConteudo}
              onChange={(e) => setTipoConteudo(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand/50"
            >
              <option value="feed">Feed</option>
              <option value="carrossel">Carrossel</option>
              <option value="reel">Reel</option>
              <option value="story">Story</option>
              <option value="bts">BTS</option>
            </select>
          </div>

          {/* Legenda */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Legenda</label>
            <textarea
              name="legenda"
              value={legenda}
              onChange={(e) => setLegenda(e.target.value)}
              required
              rows={4}
              placeholder="Escreva a legenda do post…"
              className="w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand/50"
            />
          </div>

          {/* Hashtags */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">
              Hashtags <span className="font-normal text-zinc-400">(opcional)</span>
            </label>
            <input
              type="text"
              name="hashtags"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="#marca #produto #novidade"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand/50"
            />
          </div>

          {/* Arquivo */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">
              Mídia <span className="font-normal text-zinc-400">(opcional para Facebook/LinkedIn)</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-zinc-200 px-3 py-3 text-sm text-zinc-500 transition hover:border-brand/40 hover:bg-zinc-50">
              <Upload className="h-4 w-4 shrink-0" />
              <span className="truncate">{nomeArquivo ?? 'Selecionar imagem ou vídeo'}</span>
              <input
                type="file"
                name="arquivo"
                accept="image/*,video/mp4,video/quicktime,video/webm"
                className="sr-only"
                onChange={(e) => setNomeArquivo(e.target.files?.[0]?.name ?? null)}
              />
            </label>
          </div>

          {/* Data e hora */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Data e hora de publicação</label>
            <input
              type="datetime-local"
              name="data_agendada"
              value={dataAgendada}
              onChange={(e) => setDataAgendada(e.target.value)}
              required
              min={new Date().toISOString().slice(0, 16)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand/50"
            />
          </div>

          {/* Rótulo de IA */}
          <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2.5">
            <input
              type="checkbox"
              checked={rotuloIa}
              onChange={(e) => setRotuloIa(e.target.checked)}
              className="h-3.5 w-3.5 cursor-pointer accent-brand"
            />
            <span className="text-xs text-zinc-700">Marcar como conteúdo gerado por IA</span>
          </label>

          {/* Erro */}
          {erro && (
            <p className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {erro}
            </p>
          )}

          {/* Ações */}
          <div className="mt-auto flex gap-2 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-200 py-2 text-sm text-zinc-600 transition hover:bg-zinc-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending || integracoesFiltradas.length === 0}
              className="flex-1 rounded-lg bg-brand py-2 text-sm font-medium text-white transition hover:bg-brand/90 disabled:opacity-60"
            >
              {pending ? 'Agendando…' : 'Agendar publicação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================================================
// Helpers
// ============================================================================

function MetricaKpi({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white px-2 py-2 text-center shadow-sm">
      <div className="flex items-center justify-center gap-1 text-zinc-400">
        {icon}
        <span className="text-[9px] uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-0.5 text-sm font-bold text-zinc-800">{value.toLocaleString('pt-BR')}</p>
    </div>
  )
}
