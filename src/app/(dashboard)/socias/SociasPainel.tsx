'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  TrendingUp, FileText, Link2, Users, AlertTriangle,
  Loader2, ExternalLink, Trash2, X, CheckCircle2,
  Clock, Copy, Timer, Settings,
} from 'lucide-react'
import Link from 'next/link'
import type {
  MrrData, SociaDocumento, ExternalShareLink,
  Colaborador, AreaSocia, SlaComplianceData,
} from './actions'
import {
  actionExcluirDocumento, actionCriarShareLink,
  actionRevogarShareLink, actionAtualizarStatusColaborador,
} from './actions'

interface Props {
  mrr: MrrData
  documentos: SociaDocumento[]
  shareLinks: ExternalShareLink[]
  colaboradores: Colaborador[]
  perfisDisponiveis: { id: string; nome: string; papel: string }[]
  slaCompliance: SlaComplianceData
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AREA_LABELS: Record<AreaSocia, string> = {
  financeiro: 'Financeiro',
  contabilidade: 'Contabilidade',
  juridico: 'Jurídico',
  rh: 'RH',
  cultura: 'Cultura',
  outros: 'Outros',
}

const AREA_COLORS: Record<AreaSocia, string> = {
  financeiro:    'bg-emerald-100 text-emerald-700',
  contabilidade: 'bg-blue-100 text-blue-700',
  juridico:      'bg-violet-100 text-violet-700',
  rh:            'bg-orange-100 text-orange-700',
  cultura:       'bg-pink-100 text-pink-700',
  outros:        'bg-zinc-100 text-zinc-600',
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

// ---------------------------------------------------------------------------
// Aba Executivo
// ---------------------------------------------------------------------------
function AbaExecutivo({ mrr }: { mrr: MrrData }) {
  return (
    <div className="space-y-6">
      {/* KPIs principais */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
          <p className="text-xs font-semibold text-emerald-600 mb-1">MRR Atual</p>
          <p className="text-3xl font-bold font-display text-emerald-700">
            {formatCurrency(mrr.mrr_atual)}
          </p>
          <p className="text-[11px] text-emerald-500 mt-1">Receita mensal recorrente</p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <p className="text-xs font-semibold text-blue-600 mb-1">Clientes Ativos</p>
          <p className="text-3xl font-bold font-display text-blue-700">{mrr.clientes_ativos}</p>
          <p className="text-[11px] text-blue-500 mt-1">
            + {mrr.prospects_total} prospects no funil
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
          <p className="text-xs font-semibold text-zinc-600 mb-1">Contratos Inativos</p>
          <p className="text-3xl font-bold font-display text-zinc-700">{mrr.clientes_inativos}</p>
          <p className="text-[11px] text-zinc-500 mt-1">Encerrados / sem renovação</p>
        </div>
      </div>

      {/* Alertas */}
      {mrr.planos_renovar_60d > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-none" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {mrr.planos_renovar_60d} contrato{mrr.planos_renovar_60d > 1 ? 's' : ''} renovando em até 60 dias
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Acesse o Pipeline para verificar os contratos próximos do vencimento.
            </p>
          </div>
        </div>
      )}

      {/* Placeholder historico */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <p className="text-xs font-semibold text-zinc-500 mb-4">Evolução do MRR (últimos 6 meses)</p>
        <div className="flex items-end justify-center gap-2 h-32 text-center">
          <p className="text-sm text-zinc-300">
            Histórico disponível após implementação de coleta mensal automática.
          </p>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Aba Documentos
// ---------------------------------------------------------------------------
function AbaDocumentos({ documentos }: { documentos: SociaDocumento[] }) {
  const [filtroArea, setFiltroArea] = useState<AreaSocia | 'todos'>('todos')
  const [excluindo, setExcluindo] = useState<string | null>(null)
  const router = useRouter()

  const filtrados = filtroArea === 'todos'
    ? documentos
    : documentos.filter((d) => d.area === filtroArea)

  async function excluir(id: string) {
    if (!confirm('Confirma exclusão do documento?')) return
    setExcluindo(id)
    try {
      await actionExcluirDocumento(id)
      router.refresh()
    } finally {
      setExcluindo(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filtros de área */}
      <div className="flex flex-wrap gap-1.5">
        {(['todos', ...Object.keys(AREA_LABELS)] as (AreaSocia | 'todos')[]).map((a) => (
          <button
            key={a}
            onClick={() => setFiltroArea(a)}
            className={`rounded-xl px-3 py-1.5 text-xs font-medium border transition ${
              filtroArea === a
                ? 'bg-zinc-900 border-zinc-900 text-white'
                : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'
            }`}
          >
            {a === 'todos' ? 'Todos' : AREA_LABELS[a as AreaSocia]}
          </button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <div className="text-center py-10 text-sm text-zinc-400">
          <FileText className="h-8 w-8 text-zinc-200 mx-auto mb-2" />
          Nenhum documento nesta área.
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
              <FileText className="h-5 w-5 text-zinc-300 flex-none" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-zinc-800 truncate">{doc.nome}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${AREA_COLORS[doc.area]}`}>
                    {AREA_LABELS[doc.area]}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap gap-3 text-[10px] text-zinc-400">
                  <span>{formatBytes(doc.tamanho_bytes)}</span>
                  {doc.mes_competencia && (
                    <span>{new Date(doc.mes_competencia).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                  )}
                  {doc.tags.length > 0 && <span>{doc.tags.join(', ')}</span>}
                  {doc.uploaded_by_nome && <span>por {doc.uploaded_by_nome}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-none">
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[11px] text-zinc-500 hover:border-violet-300 hover:text-violet-600 transition"
                >
                  <ExternalLink className="h-3 w-3" />
                  Abrir
                </a>
                <button
                  onClick={() => excluir(doc.id)}
                  disabled={excluindo === doc.id}
                  className="rounded-lg border border-zinc-100 p-1.5 text-zinc-300 hover:border-red-200 hover:text-red-500 transition disabled:opacity-40"
                >
                  {excluindo === doc.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dialog — criar link de compartilhamento
// ---------------------------------------------------------------------------
function CriarLinkDialog({
  documentos,
  onClose,
  onCriado,
}: {
  documentos: SociaDocumento[]
  onClose: () => void
  onCriado: (token: string) => void
}) {
  const [area, setArea] = useState<AreaSocia>('financeiro')
  const [descricao, setDescricao] = useState('')
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])
  const [expiraDias, setExpiraDias] = useState(7)
  const [senha, setSenha] = useState('')
  const [isPending, startTransition] = useTransition()

  const docsArea = documentos.filter((d) => d.area === area)

  function toggleDoc(id: string) {
    setSelectedDocs((prev) => prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id])
  }

  function criar() {
    if (!descricao.trim() || selectedDocs.length === 0) return
    startTransition(async () => {
      const expira = new Date(Date.now() + expiraDias * 24 * 60 * 60 * 1000).toISOString()
      const fd = new FormData()
      fd.set('area', area)
      fd.set('descricao', descricao)
      fd.set('documentos_ids', JSON.stringify(selectedDocs))
      fd.set('expira_em', expira)
      if (senha) fd.set('senha', senha)
      const token = await actionCriarShareLink(fd)
      onCriado(token)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-sm font-bold text-zinc-900">Criar Link de Compartilhamento</h3>
          <button onClick={onClose}><X className="h-4 w-4 text-zinc-400 hover:text-zinc-600" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label-form">Área</label>
            <select value={area} onChange={(e) => { setArea(e.target.value as AreaSocia); setSelectedDocs([]) }} className="input-form">
              {Object.entries(AREA_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div>
            <label className="label-form">Descrição *</label>
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Documentos para o contador — Maio/2026"
              className="input-form"
            />
          </div>

          <div>
            <label className="label-form">Documentos ({area && AREA_LABELS[area]})</label>
            {docsArea.length === 0 ? (
              <p className="text-xs text-zinc-400 mt-1">Nenhum documento nesta área.</p>
            ) : (
              <div className="space-y-1 mt-1 max-h-40 overflow-y-auto border border-zinc-200 rounded-xl p-2">
                {docsArea.map((d) => (
                  <label key={d.id} className="flex items-center gap-2 cursor-pointer rounded-lg px-2 py-1.5 hover:bg-zinc-50">
                    <input
                      type="checkbox"
                      checked={selectedDocs.includes(d.id)}
                      onChange={() => toggleDoc(d.id)}
                      className="rounded"
                    />
                    <span className="text-xs text-zinc-700 truncate">{d.nome}</span>
                    <span className="text-[10px] text-zinc-400 ml-auto">{formatBytes(d.tamanho_bytes)}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-form">Validade (dias)</label>
              <input type="number" min={1} max={365} value={expiraDias} onChange={(e) => setExpiraDias(parseInt(e.target.value))} className="input-form" />
            </div>
            <div>
              <label className="label-form">Senha (opcional)</label>
              <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Deixe vazio para acesso livre" className="input-form" />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 rounded-xl border border-zinc-200 py-2 text-sm text-zinc-600 hover:bg-zinc-50 transition">
            Cancelar
          </button>
          <button
            onClick={criar}
            disabled={isPending || !descricao.trim() || selectedDocs.length === 0}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 py-2 text-sm font-semibold text-white hover:bg-zinc-800 transition disabled:opacity-60"
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Gerar Link
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Aba Links de Compartilhamento
// ---------------------------------------------------------------------------
function AbaShareLinks({
  links,
  documentos,
}: {
  links: ExternalShareLink[]
  documentos: SociaDocumento[]
}) {
  const [showDialog, setShowDialog] = useState(false)
  const [novoToken, setNovoToken] = useState<string | null>(null)
  const [revogando, setRevogando] = useState<string | null>(null)
  const router = useRouter()

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  async function revogar(linkId: string) {
    if (!confirm('Revogar este link? Ele não poderá mais ser acessado.')) return
    setRevogando(linkId)
    try {
      await actionRevogarShareLink(linkId)
      router.refresh()
    } finally {
      setRevogando(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowDialog(true)}
          className="flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 transition"
        >
          <Link2 className="h-4 w-4" />
          Criar Link
        </button>
      </div>

      {/* Link recém-criado */}
      {novoToken && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-semibold text-emerald-700 mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Link criado com sucesso!
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-xl bg-white border border-emerald-200 px-3 py-2 text-xs text-zinc-700 truncate font-mono">
              {`${baseUrl}/compartilhamento/${novoToken}`}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(`${baseUrl}/compartilhamento/${novoToken}`)}
              className="flex-none flex items-center gap-1 rounded-xl border border-emerald-200 px-3 py-2 text-xs text-emerald-700 hover:bg-emerald-100 transition"
            >
              <Copy className="h-3 w-3" />
              Copiar
            </button>
            <button onClick={() => setNovoToken(null)} className="text-zinc-400 hover:text-zinc-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {links.length === 0 ? (
        <div className="text-center py-10 text-sm text-zinc-400">
          <Link2 className="h-8 w-8 text-zinc-200 mx-auto mb-2" />
          Nenhum link de compartilhamento criado.
        </div>
      ) : (
        <div className="space-y-2">
          {links.map((link) => {
            const expirado = new Date(link.expira_em) < new Date()
            const valido = !link.revogado && !expirado
            return (
              <div key={link.id} className={`rounded-2xl border p-4 ${link.revogado || expirado ? 'border-zinc-100 bg-zinc-50 opacity-60' : 'border-zinc-200 bg-white'}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-zinc-800 truncate">{link.descricao}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${AREA_COLORS[link.area]}`}>
                        {AREA_LABELS[link.area]}
                      </span>
                      {link.revogado && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">Revogado</span>}
                      {!link.revogado && expirado && <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">Expirado</span>}
                      {valido && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">Ativo</span>}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Expira {new Date(link.expira_em).toLocaleDateString('pt-BR')}
                      </span>
                      <span>{link.acessos ?? 0} acessos</span>
                      <span>{link.documentos_ids.length} doc{link.documentos_ids.length !== 1 ? 's' : ''}</span>
                      {link.criado_por_nome && <span>por {link.criado_por_nome}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-none">
                    {valido && (
                      <button
                        onClick={() => navigator.clipboard.writeText(`${baseUrl}/compartilhamento/${link.token}`)}
                        className="flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[11px] text-zinc-500 hover:border-violet-300 hover:text-violet-600 transition"
                      >
                        <Copy className="h-3 w-3" />
                        Copiar
                      </button>
                    )}
                    {!link.revogado && (
                      <button
                        onClick={() => revogar(link.id)}
                        disabled={revogando === link.id}
                        className="rounded-lg border border-zinc-100 p-1.5 text-zinc-300 hover:border-red-200 hover:text-red-500 transition disabled:opacity-40"
                      >
                        {revogando === link.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showDialog && (
        <CriarLinkDialog
          documentos={documentos}
          onClose={() => setShowDialog(false)}
          onCriado={(token) => {
            setNovoToken(token)
            setShowDialog(false)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Aba Mapa da Equipe
// ---------------------------------------------------------------------------
function AbaEquipe({ colaboradores }: { colaboradores: Colaborador[] }) {
  const [atualizando, setAtualizando] = useState<string | null>(null)
  const router = useRouter()

  const STATUS_STYLES = {
    ativo:         'bg-emerald-100 text-emerald-700',
    inativo:       'bg-zinc-100 text-zinc-500',
    em_avaliacao:  'bg-amber-100 text-amber-700',
  }

  const REGIME_LABELS = { clt: 'CLT', pj: 'PJ', freelancer: 'Freelancer' }

  async function toggleStatus(id: string, status: 'ativo' | 'inativo') {
    setAtualizando(id)
    try {
      await actionAtualizarStatusColaborador(id, status)
      router.refresh()
    } finally {
      setAtualizando(null)
    }
  }

  const ativos   = colaboradores.filter((c) => c.status === 'ativo')
  const inativos = colaboradores.filter((c) => c.status !== 'ativo')

  function ColabCard({ c }: { c: Colaborador }) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="h-10 w-10 flex-none flex items-center justify-center rounded-full bg-zinc-100 text-sm font-bold text-zinc-600">
          {(c.nome ?? '?').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-zinc-800">{c.nome ?? 'Desconhecido'}</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[c.status]}`}>
              {c.status === 'em_avaliacao' ? 'Em avaliação' : c.status === 'ativo' ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          <div className="mt-0.5 flex flex-wrap gap-3 text-[10px] text-zinc-400">
            <span className="capitalize">{c.papel}</span>
            <span>{REGIME_LABELS[c.regime]}</span>
            <span>desde {new Date(c.data_inicio).toLocaleDateString('pt-BR')}</span>
          </div>
          {c.especialidades.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {c.especialidades.map((e) => (
                <span key={e} className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500">{e}</span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => toggleStatus(c.id, c.status === 'ativo' ? 'inativo' : 'ativo')}
          disabled={atualizando === c.id}
          className="flex-none rounded-lg border border-zinc-100 px-2.5 py-1.5 text-[11px] text-zinc-500 hover:border-zinc-300 transition disabled:opacity-40"
        >
          {atualizando === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : c.status === 'ativo' ? 'Desativar' : 'Reativar'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
          Ativos ({ativos.length})
        </h3>
        {ativos.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-4">Nenhum colaborador ativo.</p>
        ) : (
          <div className="space-y-2">
            {ativos.map((c) => <ColabCard key={c.id} c={c} />)}
          </div>
        )}
      </div>

      {inativos.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">
            Inativos / Em avaliação ({inativos.length})
          </h3>
          <div className="space-y-2 opacity-70">
            {inativos.map((c) => <ColabCard key={c.id} c={c} />)}
          </div>
        </div>
      )}

      {colaboradores.length === 0 && (
        <div className="text-center py-10 text-sm text-zinc-400">
          <Users className="h-8 w-8 text-zinc-200 mx-auto mb-2" />
          Nenhum colaborador no mapa ainda.
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Aba SLA Compliance
// ---------------------------------------------------------------------------
function AbaSla({ data }: { data: SlaComplianceData }) {
  if (data.total_monitorados === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-8 text-center">
          <Timer className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-500">Nenhum SLA configurado</p>
          <p className="text-xs text-zinc-400 mt-1 mb-4">
            Configure prazos por tipo de demanda para monitorar a performance da equipe.
          </p>
          <Link
            href="/admin/tipos-demanda"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90 transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
            Configurar SLA
          </Link>
        </div>
      </div>
    )
  }

  const taxaGeral = data.total_monitorados > 0
    ? Math.round(((data.total_monitorados - data.total_violados) / data.total_monitorados) * 100)
    : 100

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-xs font-semibold text-emerald-600 mb-1">Compliance Geral</p>
          <p className="text-3xl font-bold font-display text-emerald-700">{taxaGeral}%</p>
          <p className="text-[11px] text-emerald-500 mt-1">{data.total_monitorados} cards monitorados</p>
        </div>
        <div className={`rounded-2xl border p-4 ${data.total_atencao > 0 ? 'border-amber-100 bg-amber-50' : 'border-zinc-100 bg-zinc-50'}`}>
          <p className={`text-xs font-semibold mb-1 ${data.total_atencao > 0 ? 'text-amber-600' : 'text-zinc-400'}`}>Em Atenção</p>
          <p className={`text-3xl font-bold font-display ${data.total_atencao > 0 ? 'text-amber-700' : 'text-zinc-400'}`}>{data.total_atencao}</p>
          <p className={`text-[11px] mt-1 ${data.total_atencao > 0 ? 'text-amber-500' : 'text-zinc-400'}`}>Acima de 80% do prazo</p>
        </div>
        <div className={`rounded-2xl border p-4 ${data.total_violados > 0 ? 'border-red-100 bg-red-50' : 'border-zinc-100 bg-zinc-50'}`}>
          <p className={`text-xs font-semibold mb-1 ${data.total_violados > 0 ? 'text-red-600' : 'text-zinc-400'}`}>Violados</p>
          <p className={`text-3xl font-bold font-display ${data.total_violados > 0 ? 'text-red-700' : 'text-zinc-400'}`}>{data.total_violados}</p>
          <p className={`text-[11px] mt-1 ${data.total_violados > 0 ? 'text-red-500' : 'text-zinc-400'}`}>Prazo ultrapassado</p>
        </div>
      </div>

      {/* Por tipo */}
      {data.por_tipo.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-zinc-500 mb-3">Compliance por tipo de demanda</p>
          <div className="space-y-2">
            {data.por_tipo.map((row) => (
              <div key={row.tipo_nome} className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-zinc-800">{row.tipo_nome}</span>
                  <div className="flex items-center gap-3 text-xs">
                    {row.violado > 0 && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-600 font-medium">
                        {row.violado} violado{row.violado > 1 ? 's' : ''}
                      </span>
                    )}
                    {row.atencao > 0 && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-600">
                        {row.atencao} atenção
                      </span>
                    )}
                    <span className={`font-semibold ${row.compliance_rate < 80 ? 'text-red-600' : row.compliance_rate < 100 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {row.compliance_rate}%
                    </span>
                  </div>
                </div>
                {/* Barra de progresso */}
                <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${row.compliance_rate >= 100 ? 'bg-emerald-500' : row.compliance_rate >= 80 ? 'bg-amber-400' : 'bg-red-500'}`}
                    style={{ width: `${row.compliance_rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Link
          href="/admin/tipos-demanda"
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-brand transition-colors"
        >
          <Settings className="h-3.5 w-3.5" />
          Configurar prazos
        </Link>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Painel principal
// ---------------------------------------------------------------------------
export function SociasPainel({ mrr, documentos, shareLinks, colaboradores, perfisDisponiveis, slaCompliance }: Props) {
  const [aba, setAba] = useState<'executivo' | 'documentos' | 'links' | 'equipe' | 'sla'>('executivo')

  const slaAlert = slaCompliance.total_violados > 0 || slaCompliance.total_atencao > 0

  const abas = [
    { key: 'executivo',  label: 'Painel Executivo', icon: TrendingUp },
    { key: 'documentos', label: `Documentos (${documentos.length})`, icon: FileText },
    { key: 'links',      label: `Links (${shareLinks.filter((l) => !l.revogado).length} ativos)`, icon: Link2 },
    { key: 'equipe',     label: `Equipe (${colaboradores.filter((c) => c.status === 'ativo').length})`, icon: Users },
    {
      key: 'sla',
      label: slaCompliance.total_violados > 0
        ? `SLA (${slaCompliance.total_violados} violado${slaCompliance.total_violados > 1 ? 's' : ''})`
        : 'SLA',
      icon: Timer,
      alert: slaAlert,
    },
  ] as const

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-200 mb-6 overflow-x-auto">
        {abas.map((a) => {
          const Icon = a.icon
          const hasAlert = 'alert' in a && a.alert
          return (
            <button
              key={a.key}
              onClick={() => setAba(a.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                aba === a.key
                  ? 'border-violet-600 text-violet-700'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <Icon className={`h-4 w-4 ${hasAlert && aba !== a.key ? 'text-red-500' : ''}`} />
              <span className={hasAlert && aba !== a.key ? 'text-red-600' : ''}>
                {a.label}
              </span>
            </button>
          )
        })}
      </div>

      {aba === 'executivo'  && <AbaExecutivo mrr={mrr} />}
      {aba === 'documentos' && <AbaDocumentos documentos={documentos} />}
      {aba === 'links'      && <AbaShareLinks links={shareLinks} documentos={documentos} />}
      {aba === 'equipe'     && <AbaEquipe colaboradores={colaboradores} />}
      {aba === 'sla'        && <AbaSla data={slaCompliance} />}
    </div>
  )
}
