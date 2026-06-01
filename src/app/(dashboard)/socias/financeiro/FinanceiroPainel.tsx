'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle, DollarSign,
  FileText, Upload, Trash2, Download, Plus, X,
  Loader2, History, Archive, CheckCircle2,
} from 'lucide-react'
import type {
  Receita, FinanceiroVisaoGeral, DocFinanceiro, HistoricoItem,
  StatusPagamento, TipoDocFinanceiro, CicloCobranca,
} from './actions'
import {
  actionCriarReceita, actionAtualizarStatusReceita, actionArquivarReceita,
  actionRegistrarHistorico, actionUploadDocFinanceiro, actionExcluirDocFinanceiro,
  buscarHistoricoReceita,
} from './actions'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  receitas: Receita[]
  visaoGeral: FinanceiroVisaoGeral
  documentos: DocFinanceiro[]
  clientes: { id: string; nome: string }[]
}

// ---------------------------------------------------------------------------
// Helpers (client-safe, sem 'server-only')
// ---------------------------------------------------------------------------

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function labelCiclo(ciclo: CicloCobranca): string {
  const map: Record<CicloCobranca, string> = {
    mensal: 'Mensal',
    trimestral: 'Trimestral',
    semestral: 'Semestral',
    anual: 'Anual',
  }
  return map[ciclo] ?? ciclo
}

function labelTipoDoc(tipo: TipoDocFinanceiro): string {
  const map: Record<TipoDocFinanceiro, string> = {
    nota_fiscal: 'Nota Fiscal',
    comprovante: 'Comprovante',
    contrato: 'Contrato',
    boleto: 'Boleto',
    outro: 'Outro',
  }
  return map[tipo] ?? tipo
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const STATUS_CFG: Record<StatusPagamento, { label: string; cls: string }> = {
  pago:      { label: 'Pago',       cls: 'bg-emerald-100 text-emerald-700' },
  pendente:  { label: 'Pendente',   cls: 'bg-amber-100 text-amber-700'     },
  em_atraso: { label: 'Em atraso',  cls: 'bg-red-100 text-red-700'         },
}

const PROX_STATUS: Record<StatusPagamento, StatusPagamento> = {
  pago: 'pendente',
  pendente: 'em_atraso',
  em_atraso: 'pago',
}

const TIPOS_DOC: TipoDocFinanceiro[] = [
  'nota_fiscal', 'comprovante', 'contrato', 'boleto', 'outro',
]

// ---------------------------------------------------------------------------
// AbaVisaoGeral
// ---------------------------------------------------------------------------

function AbaVisaoGeral({
  visaoGeral,
  receitas,
}: {
  visaoGeral: FinanceiroVisaoGeral
  receitas: Receita[]
}) {
  const hoje = new Date().getDate()
  const proximas = receitas
    .filter((r) => r.ativo && r.status !== 'em_atraso' && r.data_cobranca_dia >= hoje)
    .sort((a, b) => a.data_cobranca_dia - b.data_cobranca_dia)
    .slice(0, 6)

  const atrasadas = receitas.filter((r) => r.ativo && r.status === 'em_atraso')
  const semReceitas = visaoGeral.total_receitas_ativas === 0 && atrasadas.length === 0

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* MRR */}
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
          <p className="text-xs font-semibold text-emerald-600 mb-1">MRR</p>
          <p className="text-2xl font-bold font-display text-emerald-700">
            {formatBRL(visaoGeral.mrr)}
          </p>
          <p className="text-[11px] text-emerald-500 mt-1">Receita mensal recorrente</p>
        </div>

        {/* Total ativas */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <p className="text-xs font-semibold text-blue-600 mb-1">Receitas ativas</p>
          <p className="text-2xl font-bold font-display text-blue-700">
            {visaoGeral.total_receitas_ativas}
          </p>
          <p className="text-[11px] text-blue-500 mt-1">contratos em vigor</p>
        </div>

        {/* Em atraso */}
        <div
          className={`rounded-2xl border p-5 ${
            visaoGeral.em_atraso > 0
              ? 'border-red-100 bg-red-50'
              : 'border-zinc-200 bg-zinc-50'
          }`}
        >
          <p
            className={`text-xs font-semibold mb-1 ${
              visaoGeral.em_atraso > 0 ? 'text-red-600' : 'text-zinc-600'
            }`}
          >
            Em atraso
          </p>
          <p
            className={`text-2xl font-bold font-display ${
              visaoGeral.em_atraso > 0 ? 'text-red-700' : 'text-zinc-700'
            }`}
          >
            {visaoGeral.em_atraso}
          </p>
          <p
            className={`text-[11px] mt-1 ${
              visaoGeral.em_atraso > 0 ? 'text-red-500' : 'text-zinc-500'
            }`}
          >
            {formatBRL(visaoGeral.valor_em_atraso)}
          </p>
        </div>

        {/* Pendentes */}
        <div
          className={`rounded-2xl border p-5 ${
            visaoGeral.pendentes > 0
              ? 'border-amber-100 bg-amber-50'
              : 'border-zinc-200 bg-zinc-50'
          }`}
        >
          <p
            className={`text-xs font-semibold mb-1 ${
              visaoGeral.pendentes > 0 ? 'text-amber-600' : 'text-zinc-600'
            }`}
          >
            Pendentes
          </p>
          <p
            className={`text-2xl font-bold font-display ${
              visaoGeral.pendentes > 0 ? 'text-amber-700' : 'text-zinc-700'
            }`}
          >
            {visaoGeral.pendentes}
          </p>
          <p
            className={`text-[11px] mt-1 ${
              visaoGeral.pendentes > 0 ? 'text-amber-500' : 'text-zinc-500'
            }`}
          >
            {formatBRL(visaoGeral.valor_pendente)}
          </p>
        </div>
      </div>

      {/* Alerta de inadimplência */}
      {atrasadas.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-red-500 flex-none" />
            <p className="text-sm font-semibold text-red-800">
              {atrasadas.length} receita{atrasadas.length > 1 ? 's' : ''} em atraso
            </p>
          </div>
          {atrasadas.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-xl bg-white border border-red-100 px-4 py-2.5"
            >
              <div>
                <p className="text-sm font-medium text-zinc-800">{r.descricao}</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {r.cliente?.nome ?? 'Sem cliente vinculado'}
                </p>
              </div>
              <p className="text-sm font-semibold text-red-700">
                {formatBRL(Number(r.valor_mensal))}/mês
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Próximas cobranças */}
      {proximas.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-xs font-semibold text-zinc-500 mb-4">
            Próximas cobranças este mês
          </p>
          <div className="space-y-3">
            {proximas.map((r) => (
              <div key={r.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-600 flex-none">
                    {r.data_cobranca_dia}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-800">{r.descricao}</p>
                    <p className="text-xs text-zinc-400">{r.cliente?.nome ?? '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_CFG[r.status].cls}`}
                  >
                    {STATUS_CFG[r.status].label}
                  </span>
                  <p className="text-sm font-semibold text-zinc-700">
                    {formatBRL(Number(r.valor_mensal))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {semReceitas && (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center">
          <DollarSign className="mx-auto h-10 w-10 text-zinc-200 mb-3" />
          <p className="text-sm font-medium text-zinc-400">Nenhuma receita cadastrada.</p>
          <p className="text-xs text-zinc-400 mt-1">
            Adicione receitas recorrentes na aba &quot;Por Cliente&quot;.
          </p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ModalNovaReceita
// ---------------------------------------------------------------------------

function ModalNovaReceita({
  clientes,
  onClose,
  onSuccess,
}: {
  clientes: { id: string; nome: string }[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  const [form, setForm] = useState({
    descricao: '',
    cliente_id: '',
    valor_mensal: '',
    ciclo: 'mensal' as CicloCobranca,
    data_cobranca_dia: '5',
    observacoes: '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    const valor = parseFloat(form.valor_mensal.replace(',', '.'))
    if (isNaN(valor) || valor <= 0) { setErro('Informe um valor válido.'); return }
    const dia = parseInt(form.data_cobranca_dia)
    if (isNaN(dia) || dia < 1 || dia > 28) { setErro('Dia de cobrança deve ser entre 1 e 28.'); return }

    startTransition(async () => {
      const res = await actionCriarReceita({
        descricao: form.descricao.trim(),
        cliente_id: form.cliente_id || null,
        valor_mensal: valor,
        ciclo: form.ciclo,
        data_cobranca_dia: dia,
        observacoes: form.observacoes.trim() || undefined,
      })
      if (res.error) { setErro(res.error); return }
      onSuccess()
    })
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
            <h2 className="font-display text-base font-semibold text-zinc-900">
              Nova Receita Recorrente
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Descrição */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-700">
                Descrição *
              </label>
              <input
                type="text"
                required
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Ex: Gestão de Redes Sociais"
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>

            {/* Cliente */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-700">
                Cliente
              </label>
              <select
                value={form.cliente_id}
                onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              >
                <option value="">Sem cliente vinculado</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>

            {/* Valor + Ciclo */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700">
                  Valor mensal *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={form.valor_mensal}
                    onChange={(e) => setForm({ ...form, valor_mensal: e.target.value })}
                    placeholder="0,00"
                    className="w-full rounded-xl border border-zinc-200 pl-8 pr-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700">
                  Ciclo
                </label>
                <select
                  value={form.ciclo}
                  onChange={(e) => setForm({ ...form, ciclo: e.target.value as CicloCobranca })}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-brand focus:outline-none"
                >
                  <option value="mensal">Mensal</option>
                  <option value="trimestral">Trimestral</option>
                  <option value="semestral">Semestral</option>
                  <option value="anual">Anual</option>
                </select>
              </div>
            </div>

            {/* Dia de cobrança */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-700">
                Dia de cobrança <span className="text-zinc-400">(1 – 28)</span>
              </label>
              <input
                type="number"
                min={1}
                max={28}
                required
                value={form.data_cobranca_dia}
                onChange={(e) => setForm({ ...form, data_cobranca_dia: e.target.value })}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>

            {/* Observações */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-700">
                Observações
              </label>
              <textarea
                rows={2}
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                placeholder="Notas internas sobre esta receita..."
                className="w-full resize-none rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>

            {erro && (
              <p className="flex items-center gap-1.5 text-xs text-red-600">
                <AlertTriangle className="h-3.5 w-3.5 flex-none" />
                {erro}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-zinc-200 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 transition"
              >
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Criar receita
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// ModalHistorico
// ---------------------------------------------------------------------------

function ModalHistorico({
  receita,
  onClose,
  onRefresh,
}: {
  receita: Receita
  onClose: () => void
  onRefresh: () => void
}) {
  const [historico, setHistorico] = useState<HistoricoItem[] | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  const agora = new Date()
  const mesAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`
  const [form, setForm] = useState({
    competencia: mesAtual,
    status: 'pago' as StatusPagamento,
    pago_em: agora.toISOString().slice(0, 10),
    observacoes: '',
  })

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCarregando(true)
    buscarHistoricoReceita(receita.id).then((h) => {
      setHistorico(h)
      setCarregando(false)
    })
  }, [receita.id])

  async function recarregar() {
    const h = await buscarHistoricoReceita(receita.id)
    setHistorico(h)
  }

  function handleRegistrar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    startTransition(async () => {
      const res = await actionRegistrarHistorico({
        receitaId: receita.id,
        competencia: `${form.competencia}-01`,
        valorCobrado: Number(receita.valor_mensal),
        status: form.status,
        pagoEm: form.status === 'pago' ? new Date(form.pago_em + 'T12:00:00').toISOString() : undefined,
      })
      if (res.error) { setErro(res.error); return }
      await recarregar()
      onRefresh()
    })
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="flex w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl max-h-[85vh]">
          {/* Header */}
          <div className="flex flex-none items-center justify-between border-b border-zinc-100 px-5 py-4">
            <div>
              <h2 className="font-display text-base font-semibold text-zinc-900">
                Histórico de Pagamentos
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">{receita.descricao}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {/* Registrar nova competência */}
            <form
              onSubmit={handleRegistrar}
              className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-3"
            >
              <p className="text-xs font-semibold text-zinc-700">Registrar competência</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-zinc-600">Mês</label>
                  <input
                    type="month"
                    required
                    value={form.competencia}
                    onChange={(e) => setForm({ ...form, competencia: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-brand focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-600">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as StatusPagamento })}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-brand focus:outline-none"
                  >
                    <option value="pago">Pago</option>
                    <option value="pendente">Pendente</option>
                    <option value="em_atraso">Em atraso</option>
                  </select>
                </div>
              </div>
              {form.status === 'pago' && (
                <div>
                  <label className="mb-1 block text-xs text-zinc-600">Data de pagamento</label>
                  <input
                    type="date"
                    value={form.pago_em}
                    onChange={(e) => setForm({ ...form, pago_em: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-brand focus:outline-none"
                  />
                </div>
              )}
              {erro && <p className="text-xs text-red-600">{erro}</p>}
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-medium text-white disabled:opacity-60"
              >
                {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                Salvar
              </button>
            </form>

            {/* Lista histórico */}
            {carregando ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-300" />
              </div>
            ) : historico?.length === 0 ? (
              <p className="py-6 text-center text-sm text-zinc-400">
                Nenhuma competência registrada ainda.
              </p>
            ) : (
              <div className="space-y-2">
                {historico?.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between rounded-xl border border-zinc-100 bg-white px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-800">
                        {new Date(h.competencia + 'T12:00:00').toLocaleDateString('pt-BR', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                      {h.pago_em && (
                        <p className="mt-0.5 text-xs text-zinc-400">
                          Pago em {new Date(h.pago_em).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                      {h.observacoes && (
                        <p className="mt-0.5 text-xs text-zinc-400">{h.observacoes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-semibold text-zinc-700">
                        {formatBRL(Number(h.valor_cobrado))}
                      </p>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUS_CFG[h.status].cls}`}
                      >
                        {STATUS_CFG[h.status].label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// AbaPorCliente
// ---------------------------------------------------------------------------

function AbaPorCliente({
  receitas,
  clientes,
  onRefresh,
}: {
  receitas: Receita[]
  clientes: { id: string; nome: string }[]
  onRefresh: () => void
}) {
  const [mostrarInativas, setMostrarInativas] = useState(false)
  const [modalNova, setModalNova] = useState(false)
  const [receitaHistorico, setReceitaHistorico] = useState<Receita | null>(null)
  const [atualizandoStatus, setAtualizandoStatus] = useState<string | null>(null)
  const [arquivando, setArquivando] = useState<string | null>(null)

  const filtradas = mostrarInativas ? receitas : receitas.filter((r) => r.ativo)

  async function toggleStatus(r: Receita) {
    setAtualizandoStatus(r.id)
    try {
      await actionAtualizarStatusReceita(r.id, PROX_STATUS[r.status])
      onRefresh()
    } finally {
      setAtualizandoStatus(null)
    }
  }

  async function arquivar(r: Receita) {
    if (!confirm(`Arquivar "${r.descricao}"? Ela não será mais contabilizada no MRR.`)) return
    setArquivando(r.id)
    try {
      await actionArquivarReceita(r.id)
      onRefresh()
    } finally {
      setArquivando(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setMostrarInativas((v) => !v)}
          className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
            mostrarInativas
              ? 'border-zinc-900 bg-zinc-900 text-white'
              : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300'
          }`}
        >
          {mostrarInativas ? 'Ocultar arquivadas' : 'Incluir arquivadas'}
        </button>
        <button
          onClick={() => setModalNova(true)}
          className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 transition"
        >
          <Plus className="h-3.5 w-3.5" />
          Nova receita
        </button>
      </div>

      {/* Tabela */}
      {filtradas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center">
          <DollarSign className="mx-auto h-10 w-10 text-zinc-200 mb-3" />
          <p className="text-sm font-medium text-zinc-400">Nenhuma receita.</p>
          <p className="text-xs text-zinc-400 mt-1">Clique em &quot;Nova receita&quot; para começar.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">
                  Receita
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold text-zinc-500 sm:table-cell">
                  Cliente
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500">
                  Valor/mês
                </th>
                <th className="hidden px-4 py-3 text-center text-xs font-semibold text-zinc-500 md:table-cell">
                  Ciclo
                </th>
                <th className="hidden px-4 py-3 text-center text-xs font-semibold text-zinc-500 md:table-cell">
                  Dia
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtradas.map((r) => (
                <tr
                  key={r.id}
                  className={`transition hover:bg-zinc-50/50 ${!r.ativo ? 'opacity-50' : ''}`}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-800">{r.descricao}</p>
                    {r.observacoes && (
                      <p className="mt-0.5 max-w-[180px] truncate text-xs text-zinc-400">
                        {r.observacoes}
                      </p>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-zinc-500 sm:table-cell">
                    {r.cliente?.nome ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-zinc-800">
                    {formatBRL(Number(r.valor_mensal))}
                  </td>
                  <td className="hidden px-4 py-3 text-center text-xs text-zinc-500 md:table-cell">
                    {labelCiclo(r.ciclo)}
                  </td>
                  <td className="hidden px-4 py-3 text-center text-xs text-zinc-500 md:table-cell">
                    dia {r.data_cobranca_dia}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.ativo ? (
                      <button
                        onClick={() => toggleStatus(r)}
                        disabled={atualizandoStatus === r.id}
                        title="Clique para alterar status"
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition hover:opacity-75 disabled:opacity-50 ${STATUS_CFG[r.status].cls}`}
                      >
                        {atualizandoStatus === r.id && (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        )}
                        {STATUS_CFG[r.status].label}
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-400">Arquivada</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setReceitaHistorico(r)}
                        title="Histórico de pagamentos"
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition"
                      >
                        <History className="h-3.5 w-3.5" />
                      </button>
                      {r.ativo && (
                        <button
                          onClick={() => arquivar(r)}
                          disabled={arquivando === r.id}
                          title="Arquivar receita"
                          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-50 transition"
                        >
                          {arquivando === r.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Archive className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {modalNova && (
        <ModalNovaReceita
          clientes={clientes}
          onClose={() => setModalNova(false)}
          onSuccess={() => { setModalNova(false); onRefresh() }}
        />
      )}
      {receitaHistorico && (
        <ModalHistorico
          receita={receitaHistorico}
          onClose={() => setReceitaHistorico(null)}
          onRefresh={onRefresh}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// AbaDocumentos
// ---------------------------------------------------------------------------

function AbaDocumentos({
  documentos,
  clientes,
  onRefresh,
}: {
  documentos: DocFinanceiro[]
  clientes: { id: string; nome: string }[]
  onRefresh: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [uploadPending, startUpload] = useTransition()
  const [excluindoId, setExcluindoId] = useState<string | null>(null)
  const [erroUpload, setErroUpload] = useState<string | null>(null)
  const [uploadOk, setUploadOk] = useState(false)

  // Filtros locais (sem re-fetch)
  const [filtroMes, setFiltroMes] = useState('')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<TipoDocFinanceiro | ''>('')

  const docsFiltrados = documentos.filter((d) => {
    if (filtroMes && d.mes_referencia !== `${filtroMes}-01`) return false
    if (filtroCliente && d.cliente_id !== filtroCliente) return false
    if (filtroTipo && d.tipo !== filtroTipo) return false
    return true
  })

  function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErroUpload(null)
    setUploadOk(false)
    const fd = new FormData(e.currentTarget)
    startUpload(async () => {
      const res = await actionUploadDocFinanceiro(fd)
      if (res.error) {
        setErroUpload(res.error)
        return
      }
      formRef.current?.reset()
      setUploadOk(true)
      onRefresh()
    })
  }

  async function excluir(id: string, nome: string) {
    if (!confirm(`Excluir "${nome}"? Esta ação não pode ser desfeita.`)) return
    setExcluindoId(id)
    try {
      await actionExcluirDocFinanceiro(id)
      onRefresh()
    } finally {
      setExcluindoId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload form */}
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
        <p className="mb-3 text-xs font-semibold text-zinc-700">Enviar documento</p>
        <form ref={formRef} onSubmit={handleUpload} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">
                Arquivo *
              </label>
              <input
                ref={fileRef}
                type="file"
                name="arquivo"
                required
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 file:mr-2 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-white cursor-pointer"
              />
              <p className="mt-1 text-[10px] text-zinc-400">PDF, imagem, Word, Excel · máx 20 MB</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Tipo</label>
              <select
                name="tipo"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 focus:border-brand focus:outline-none"
              >
                {TIPOS_DOC.map((t) => (
                  <option key={t} value={t}>{labelTipoDoc(t)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <label className="mb-1 block text-xs font-medium text-zinc-600">
                Nome personalizado
              </label>
              <input
                type="text"
                name="nome"
                placeholder="Deixe em branco para usar nome do arquivo"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 placeholder:text-zinc-400 focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">
                Mês de referência
              </label>
              <input
                type="month"
                name="mes_referencia"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Cliente</label>
              <select
                name="cliente_id"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 focus:border-brand focus:outline-none"
              >
                <option value="">Documento geral</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={uploadPending}
              className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-60 transition"
            >
              {uploadPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {uploadPending ? 'Enviando...' : 'Enviar'}
            </button>
            {erroUpload && (
              <p className="flex items-center gap-1 text-xs text-red-600">
                <AlertTriangle className="h-3 w-3 flex-none" />
                {erroUpload}
              </p>
            )}
            {uploadOk && (
              <p className="flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle2 className="h-3 w-3 flex-none" />
                Documento enviado!
              </p>
            )}
          </div>
        </form>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <input
          type="month"
          value={filtroMes}
          onChange={(e) => setFiltroMes(e.target.value)}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 focus:border-brand focus:outline-none"
        />
        <select
          value={filtroCliente}
          onChange={(e) => setFiltroCliente(e.target.value)}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 focus:border-brand focus:outline-none"
        >
          <option value="">Todos os clientes</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value as TipoDocFinanceiro | '')}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 focus:border-brand focus:outline-none"
        >
          <option value="">Todos os tipos</option>
          {TIPOS_DOC.map((t) => (
            <option key={t} value={t}>{labelTipoDoc(t)}</option>
          ))}
        </select>
        {(filtroMes || filtroCliente || filtroTipo) && (
          <button
            onClick={() => { setFiltroMes(''); setFiltroCliente(''); setFiltroTipo('') }}
            className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50 transition"
          >
            <X className="h-3 w-3" />
            Limpar
          </button>
        )}
      </div>

      {/* Lista */}
      {docsFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-zinc-200 mb-3" />
          <p className="text-sm font-medium text-zinc-400">Nenhum documento.</p>
          <p className="text-xs text-zinc-400 mt-1">
            {filtroMes || filtroCliente || filtroTipo
              ? 'Tente remover os filtros.'
              : 'Faça o upload do primeiro documento acima.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {docsFiltrados.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 transition hover:border-zinc-300"
            >
              <FileText className="h-4 w-4 flex-none text-zinc-400" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-zinc-800">{d.nome}</p>
                  <span className="flex-none rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                    {labelTipoDoc(d.tipo)}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-zinc-400">
                  {d.cliente?.nome && <span>{d.cliente.nome}</span>}
                  {d.mes_referencia && (
                    <>
                      {d.cliente?.nome && <span>·</span>}
                      <span>
                        {new Date(d.mes_referencia + 'T12:00:00').toLocaleDateString('pt-BR', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </>
                  )}
                  <span className={d.cliente?.nome || d.mes_referencia ? '· ' : ''}>
                    {formatBytes(d.tamanho_bytes)}
                  </span>
                </div>
              </div>
              <div className="flex flex-none items-center gap-1">
                {d.url_assinada && (
                  <a
                    href={d.url_assinada}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Download"
                    className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                )}
                <button
                  onClick={() => excluir(d.id, d.nome)}
                  disabled={excluindoId === d.id}
                  title="Excluir"
                  className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                >
                  {excluindoId === d.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
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
// FinanceiroPainel (main export)
// ---------------------------------------------------------------------------

type Aba = 'visao_geral' | 'por_cliente' | 'documentos'

const ABAS: { id: Aba; label: string }[] = [
  { id: 'visao_geral', label: 'Visão Geral' },
  { id: 'por_cliente', label: 'Por Cliente' },
  { id: 'documentos',  label: 'Documentos'  },
]

export function FinanceiroPainel({ receitas, visaoGeral, documentos, clientes }: Props) {
  const [aba, setAba] = useState<Aba>('visao_geral')
  const router = useRouter()

  function refresh() { router.refresh() }

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-2xl border border-zinc-200 bg-zinc-50 p-1">
        {ABAS.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
              aba === a.id
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {aba === 'visao_geral' && (
        <AbaVisaoGeral visaoGeral={visaoGeral} receitas={receitas} />
      )}
      {aba === 'por_cliente' && (
        <AbaPorCliente receitas={receitas} clientes={clientes} onRefresh={refresh} />
      )}
      {aba === 'documentos' && (
        <AbaDocumentos documentos={documentos} clientes={clientes} onRefresh={refresh} />
      )}
    </div>
  )
}
