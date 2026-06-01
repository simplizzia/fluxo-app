'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Shield, FileDown, AlertTriangle, Clock,
  CheckCircle2, Loader2, Trash2, X,
} from 'lucide-react'
import type {
  AuditLogEntry, PiiScanEntry,
  PortabilidadeRequest, Encerramento,
} from './actions'
import { actionEncerrarContrato, actionAnonimizarCliente } from './actions'
import { piiTipoLabel } from '@/lib/lgpd/piiScanner'

interface Props {
  resumo: {
    totalAudit: number
    totalPii: number
    portabPendente: number
    clientesInativos: number
  }
  auditLog: AuditLogEntry[]
  piiScans: PiiScanEntry[]
  portabilidade: PortabilidadeRequest[]
  encerramentos: Encerramento[]
  clientesAtivos: { id: string; nome: string }[]
}

// ---------------------------------------------------------------------------
// Dialog — Encerrar contrato
// ---------------------------------------------------------------------------
function EncerrarContratoDialog({
  clientes,
  onClose,
}: {
  clientes: { id: string; nome: string }[]
  onClose: () => void
}) {
  const [clienteId, setClienteId] = useState(clientes[0]?.id ?? '')
  const [motivo, setMotivo] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function confirmar() {
    if (!clienteId) return
    startTransition(async () => {
      await actionEncerrarContrato(clienteId, motivo || undefined)
      router.refresh()
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-sm font-bold text-zinc-900 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Encerrar Contrato
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-zinc-500 mb-4 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
          Esta ação revoga o acesso do cliente imediatamente e registra o encerramento conforme a LGPD.
          Os dados são retidos pelo período legal (5 anos).
        </p>

        <div className="space-y-3">
          <div>
            <label className="label-form">Cliente *</label>
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="input-form">
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="label-form">Motivo</label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="Ex: Fim de contrato por vencimento, cancelamento a pedido do cliente..."
              className="input-form resize-none text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 rounded-xl border border-zinc-200 py-2 text-sm text-zinc-600 hover:bg-zinc-50 transition">
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={isPending || !clienteId}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 transition disabled:opacity-60"
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirmar Encerramento
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Aba Audit Log
// ---------------------------------------------------------------------------
function AbaAudit({ entries }: { entries: AuditLogEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-zinc-400">
        Nenhuma entrada de auditoria ainda.
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {entries.map((e) => (
        <div key={e.id} className="flex items-start gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-2.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <code className="text-[11px] font-mono font-semibold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded">
                {e.acao}
              </code>
              <span className="text-[11px] text-zinc-500">{e.entidade}</span>
              {e.usuario_nome && (
                <span className="text-[11px] text-zinc-400">— {e.usuario_nome}</span>
              )}
            </div>
          </div>
          <span className="text-[10px] text-zinc-400 whitespace-nowrap">
            {new Date(e.created_at).toLocaleString('pt-BR')}
          </span>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Aba PII
// ---------------------------------------------------------------------------
function AbaPii({ scans }: { scans: PiiScanEntry[] }) {
  if (scans.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-zinc-400">
        <Shield className="h-8 w-8 text-zinc-200 mx-auto mb-2" />
        Nenhum dado pessoal identificado ainda.
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {scans.map((s) => (
        <div key={s.id} className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-none" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold text-zinc-700 capitalize">{s.entidade}</span>
              <span className="text-[10px] font-mono text-zinc-400">{s.entidade_id.slice(0, 8)}…</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {s.tipos_pii_encontrados.map((t) => (
                <span key={t} className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                  {piiTipoLabel(t)}
                </span>
              ))}
            </div>
          </div>
          <span className="text-[10px] text-zinc-400 whitespace-nowrap">
            {new Date(s.escaneado_em).toLocaleString('pt-BR')}
          </span>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Aba Portabilidade
// ---------------------------------------------------------------------------
function AbaPortabilidade({ requests }: { requests: PortabilidadeRequest[] }) {
  const STATUS_STYLES: Record<string, string> = {
    pendente: 'bg-amber-100 text-amber-700',
    processando: 'bg-blue-100 text-blue-700',
    concluido: 'bg-emerald-100 text-emerald-700',
    erro: 'bg-red-100 text-red-600',
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-zinc-400">
        <FileDown className="h-8 w-8 text-zinc-200 mx-auto mb-2" />
        Nenhuma solicitação de portabilidade ainda.
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {requests.map((r) => (
        <div key={r.id} className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3">
          <FileDown className="h-4 w-4 text-zinc-400 flex-none" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-zinc-800">
              {r.cliente_nome ?? r.solicitado_por_nome ?? 'Exportação'}
            </p>
            {r.solicitado_por_nome && (
              <p className="text-[10px] text-zinc-400">Solicitado por: {r.solicitado_por_nome}</p>
            )}
          </div>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[r.status] ?? ''}`}>
            {r.status}
          </span>
          <span className="text-[10px] text-zinc-400 whitespace-nowrap">
            {new Date(r.created_at).toLocaleDateString('pt-BR')}
          </span>
          {r.file_url && (
            <a
              href={r.file_url}
              download
              className="text-violet-500 text-[10px] font-medium hover:underline"
            >
              Baixar
            </a>
          )}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Aba Encerramentos
// ---------------------------------------------------------------------------
function AbaEncerramentos({
  encerramentos,
}: {
  encerramentos: Encerramento[]
}) {
  const [anonimizando, setAnonimizando] = useState<string | null>(null)
  const router = useRouter()

  async function anonimizar(encerramento: Encerramento) {
    setAnonimizando(encerramento.id)
    try {
      await actionAnonimizarCliente(encerramento.cliente_id, encerramento.id)
      router.refresh()
    } finally {
      setAnonimizando(null)
    }
  }

  if (encerramentos.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-zinc-400">
        <CheckCircle2 className="h-8 w-8 text-zinc-200 mx-auto mb-2" />
        Nenhum encerramento registrado.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {encerramentos.map((e) => (
        <div key={e.id} className={`rounded-2xl border p-4 ${e.anonimizado_em ? 'border-zinc-100 bg-zinc-50' : 'border-red-100 bg-red-50'}`}>
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-zinc-800">
                  {e.cliente_nome ?? 'Cliente anonimizado'}
                </p>
                {e.anonimizado_em ? (
                  <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
                    Anonimizado
                  </span>
                ) : (
                  <span className="rounded-full bg-red-200 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                    Dados retidos
                  </span>
                )}
              </div>
              {e.motivo && <p className="text-xs text-zinc-500 mt-0.5">{e.motivo}</p>}
              <div className="mt-1 flex gap-3 text-[10px] text-zinc-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Encerrado em {new Date(e.created_at).toLocaleDateString('pt-BR')}
                </span>
                {e.solicitado_por_nome && <span>por {e.solicitado_por_nome}</span>}
                {e.anonimizado_em && (
                  <span className="text-emerald-600">
                    Anonimizado em {new Date(e.anonimizado_em).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
            </div>

            {!e.anonimizado_em && (
              <button
                onClick={() => anonimizar(e)}
                disabled={anonimizando === e.id}
                className="flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-100 transition disabled:opacity-60"
              >
                {anonimizando === e.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
                Anonimizar
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Painel principal
// ---------------------------------------------------------------------------
export function LgpdPainel({ resumo, auditLog, piiScans, portabilidade, encerramentos, clientesAtivos }: Props) {
  const [aba, setAba] = useState<'audit' | 'pii' | 'portabilidade' | 'encerramentos'>('audit')
  const [showEncerrar, setShowEncerrar] = useState(false)

  const abas = [
    { key: 'audit',         label: `Audit Log (${resumo.totalAudit})` },
    { key: 'pii',           label: `PII (${resumo.totalPii})` },
    { key: 'portabilidade', label: `Portabilidade (${resumo.portabPendente} pendentes)` },
    { key: 'encerramentos', label: `Encerramentos (${encerramentos.length})` },
  ] as const

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Eventos de auditoria', value: resumo.totalAudit, color: 'text-violet-700', bg: 'bg-violet-50 border-violet-100' },
          { label: 'Detecções de PII',     value: resumo.totalPii,   color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-100'   },
          { label: 'Exports pendentes',    value: resumo.portabPendente, color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-100'     },
          { label: 'Clientes inativos',    value: resumo.clientesInativos, color: 'text-red-700', bg: 'bg-red-50 border-red-100'       },
        ].map((kpi) => (
          <div key={kpi.label} className={`rounded-2xl border p-4 ${kpi.bg}`}>
            <p className={`text-2xl font-bold font-display ${kpi.color}`}>{kpi.value}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Ação: Encerrar contrato */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowEncerrar(true)}
          disabled={clientesAtivos.length === 0}
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 transition disabled:opacity-50"
        >
          <AlertTriangle className="h-4 w-4" />
          Encerrar contrato de cliente
        </button>
      </div>

      {/* Tabs */}
      <div>
        <div className="flex gap-1 border-b border-zinc-200 mb-5 overflow-x-auto">
          {abas.map((a) => (
            <button
              key={a.key}
              onClick={() => setAba(a.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                aba === a.key
                  ? 'border-violet-600 text-violet-700'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        {aba === 'audit'         && <AbaAudit entries={auditLog} />}
        {aba === 'pii'           && <AbaPii scans={piiScans} />}
        {aba === 'portabilidade' && <AbaPortabilidade requests={portabilidade} />}
        {aba === 'encerramentos' && <AbaEncerramentos encerramentos={encerramentos} />}
      </div>

      {showEncerrar && (
        <EncerrarContratoDialog
          clientes={clientesAtivos}
          onClose={() => setShowEncerrar(false)}
        />
      )}
    </div>
  )
}
