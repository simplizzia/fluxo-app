'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle, DollarSign, TrendingUp, TrendingDown,
  FileText, Upload, Trash2, Download, Plus, X,
  Loader2, History, Archive, CheckCircle2, Receipt,
  Calendar, Filter, ChevronLeft, ChevronRight,
} from 'lucide-react'
import type {
  Receita, FinanceiroVisaoGeral, DocFinanceiro, HistoricoItem,
  StatusPagamento, TipoDocFinanceiro, CicloCobranca,
  Despesa, CategoriaDespesa, StatusDespesa, FluxoCaixaMes,
} from './actions'
import {
  actionCriarReceita, actionAtualizarStatusReceita, actionArquivarReceita,
  actionRegistrarHistorico, actionUploadDocFinanceiro, actionExcluirDocFinanceiro,
  buscarHistoricoReceita,
  actionCriarDespesa, actionAtualizarStatusDespesa, actionArquivarDespesa,
  actionExportarCSV,
} from './actions'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  receitas: Receita[]
  visaoGeral: FinanceiroVisaoGeral
  documentos: DocFinanceiro[]
  clientes: { id: string; nome: string }[]
  despesas: Despesa[]
  fluxoCaixa: FluxoCaixaMes[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function labelCiclo(ciclo: CicloCobranca): string {
  const map: Record<CicloCobranca, string> = {
    mensal: 'Mensal', trimestral: 'Trimestral',
    semestral: 'Semestral', anual: 'Anual',
  }
  return map[ciclo] ?? ciclo
}

function labelTipoDoc(tipo: TipoDocFinanceiro): string {
  const map: Record<TipoDocFinanceiro, string> = {
    nota_fiscal: 'Nota Fiscal', comprovante: 'Comprovante',
    contrato: 'Contrato', boleto: 'Boleto', outro: 'Outro',
  }
  return map[tipo] ?? tipo
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function labelCategoria(cat: CategoriaDespesa): string {
  const map: Record<CategoriaDespesa, string> = {
    impostos: 'Impostos', colaboradores: 'Colaboradores',
    ferramentas: 'Ferramentas', fornecedores: 'Fornecedores',
    marketing: 'Marketing', escritorio: 'Escritório', outros: 'Outros',
  }
  return map[cat] ?? cat
}

const STATUS_CFG: Record<StatusPagamento, { label: string; cls: string }> = {
  pago:      { label: 'Pago',       cls: 'bg-emerald-100 text-emerald-700' },
  pendente:  { label: 'Pendente',   cls: 'bg-amber-100 text-amber-700'     },
  em_atraso: { label: 'Em atraso',  cls: 'bg-red-100 text-red-700'         },
}

const PROX_STATUS: Record<StatusPagamento, StatusPagamento> = {
  pago: 'pendente', pendente: 'em_atraso', em_atraso: 'pago',
}

const STATUS_DESPESA_CFG: Record<StatusDespesa, { label: string; cls: string }> = {
  paga:     { label: 'Paga',     cls: 'bg-emerald-100 text-emerald-700' },
  pendente: { label: 'Pendente', cls: 'bg-amber-100 text-amber-700'     },
  vencida:  { label: 'Vencida',  cls: 'bg-red-100 text-red-700'         },
}

const TIPOS_DOC: TipoDocFinanceiro[] = [
  'nota_fiscal', 'comprovante', 'contrato', 'boleto', 'outro',
]

const CATEGORIAS_DESPESA: CategoriaDespesa[] = [
  'impostos', 'colaboradores', 'ferramentas', 'fornecedores',
  'marketing', 'escritorio', 'outros',
]

// ---------------------------------------------------------------------------
// AbaVisaoGeral
// ---------------------------------------------------------------------------

function AbaVisaoGeral({
  visaoGeral, receitas, despesas, fluxoCaixa,
}: {
  visaoGeral: FinanceiroVisaoGeral
  receitas: Receita[]
  despesas: Despesa[]
  fluxoCaixa: FluxoCaixaMes[]
}) {
  const hoje = new Date()
  const mesAtualKey = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    .toISOString().split('T')[0]

  // KPIs de despesas
  const diaHoje = hoje.getDate()
  const mesHoje = hoje.getMonth()
  const anoHoje = hoje.getFullYear()
  const em5Dias = new Date(anoHoje, mesHoje, diaHoje + 5)

  const despesasPendentesDoMes = despesas.filter(
    (d) => d.status === 'pendente' && new Date(d.vencimento + 'T12:00:00').getMonth() === mesHoje &&
           new Date(d.vencimento + 'T12:00:00').getFullYear() === anoHoje,
  )
  const valorAPagar = despesasPendentesDoMes.reduce((s, d) => s + Number(d.valor), 0)

  const vencendoBreve = despesas.filter((d) => {
    if (d.status !== 'pendente') return false
    const v = new Date(d.vencimento + 'T12:00:00')
    return v >= hoje && v <= em5Dias
  })

  const mesCorrente = fluxoCaixa.find((m) => m.mes === mesAtualKey)
  const resultadoMes = mesCorrente ? mesCorrente.resultado : visaoGeral.mrr - valorAPagar

  // Próximas cobranças (receitas)
  const proxCobrancas = receitas
    .filter((r) => r.ativo && r.status !== 'em_atraso' && r.data_cobranca_dia >= hoje.getDate())
    .sort((a, b) => a.data_cobranca_dia - b.data_cobranca_dia)
    .slice(0, 5)

  // Próximos vencimentos (despesas) — pendentes nos próximos 30 dias
  const proxVencimentos = despesas
    .filter((d) => {
      if (d.status !== 'pendente') return false
      const v = new Date(d.vencimento + 'T12:00:00')
      const em30 = new Date(hoje); em30.setDate(em30.getDate() + 30)
      return v >= hoje && v <= em30
    })
    .slice(0, 5)

  const atrasadas = receitas.filter((r) => r.ativo && r.status === 'em_atraso')
  const despesasVencidas = despesas.filter((d) => d.status === 'vencida')

  return (
    <div className="space-y-6">
      {/* Row 1: KPIs de receitas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-xs font-semibold text-emerald-600 mb-1">MRR</p>
          <p className="text-xl font-bold font-display text-emerald-700">{formatBRL(visaoGeral.mrr)}</p>
          <p className="text-[11px] text-emerald-500 mt-1">Receita mensal recorrente</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs font-semibold text-blue-600 mb-1">Receitas ativas</p>
          <p className="text-xl font-bold font-display text-blue-700">{visaoGeral.total_receitas_ativas}</p>
          <p className="text-[11px] text-blue-500 mt-1">contratos em vigor</p>
        </div>
        <div className={`rounded-2xl border p-4 ${visaoGeral.em_atraso > 0 ? 'border-red-100 bg-red-50' : 'border-zinc-200 bg-zinc-50'}`}>
          <p className={`text-xs font-semibold mb-1 ${visaoGeral.em_atraso > 0 ? 'text-red-600' : 'text-zinc-600'}`}>
            Inadimplências
          </p>
          <p className={`text-xl font-bold font-display ${visaoGeral.em_atraso > 0 ? 'text-red-700' : 'text-zinc-700'}`}>
            {visaoGeral.em_atraso}
          </p>
          <p className={`text-[11px] mt-1 ${visaoGeral.em_atraso > 0 ? 'text-red-500' : 'text-zinc-500'}`}>
            {formatBRL(visaoGeral.valor_em_atraso)}
          </p>
        </div>
        <div className={`rounded-2xl border p-4 ${visaoGeral.pendentes > 0 ? 'border-amber-100 bg-amber-50' : 'border-zinc-200 bg-zinc-50'}`}>
          <p className={`text-xs font-semibold mb-1 ${visaoGeral.pendentes > 0 ? 'text-amber-600' : 'text-zinc-600'}`}>
            Rec. pendentes
          </p>
          <p className={`text-xl font-bold font-display ${visaoGeral.pendentes > 0 ? 'text-amber-700' : 'text-zinc-700'}`}>
            {visaoGeral.pendentes}
          </p>
          <p className={`text-[11px] mt-1 ${visaoGeral.pendentes > 0 ? 'text-amber-500' : 'text-zinc-500'}`}>
            {formatBRL(visaoGeral.valor_pendente)}
          </p>
        </div>
      </div>

      {/* Row 2: KPIs de despesas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className={`rounded-2xl border p-4 ${valorAPagar > 0 ? 'border-orange-100 bg-orange-50' : 'border-zinc-200 bg-zinc-50'}`}>
          <p className={`text-xs font-semibold mb-1 ${valorAPagar > 0 ? 'text-orange-600' : 'text-zinc-600'}`}>
            A pagar este mês
          </p>
          <p className={`text-xl font-bold font-display ${valorAPagar > 0 ? 'text-orange-700' : 'text-zinc-700'}`}>
            {formatBRL(valorAPagar)}
          </p>
          <p className={`text-[11px] mt-1 ${valorAPagar > 0 ? 'text-orange-500' : 'text-zinc-500'}`}>
            {despesasPendentesDoMes.length} despesa{despesasPendentesDoMes.length !== 1 ? 's' : ''} pendente{despesasPendentesDoMes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className={`rounded-2xl border p-4 ${vencendoBreve.length > 0 ? 'border-red-100 bg-red-50' : 'border-zinc-200 bg-zinc-50'}`}>
          <p className={`text-xs font-semibold mb-1 ${vencendoBreve.length > 0 ? 'text-red-600' : 'text-zinc-600'}`}>
            Vencendo em 5 dias
          </p>
          <p className={`text-xl font-bold font-display ${vencendoBreve.length > 0 ? 'text-red-700' : 'text-zinc-700'}`}>
            {vencendoBreve.length}
          </p>
          <p className={`text-[11px] mt-1 ${vencendoBreve.length > 0 ? 'text-red-500' : 'text-zinc-500'}`}>
            {vencendoBreve.length > 0
              ? formatBRL(vencendoBreve.reduce((s, d) => s + Number(d.valor), 0))
              : 'Tudo em dia'}
          </p>
        </div>
        <div className={`rounded-2xl border p-4 col-span-2 sm:col-span-1 ${
          resultadoMes >= 0 ? 'border-emerald-100 bg-emerald-50' : 'border-red-100 bg-red-50'
        }`}>
          <p className={`text-xs font-semibold mb-1 ${resultadoMes >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            Resultado estimado
          </p>
          <p className={`text-xl font-bold font-display flex items-center gap-1 ${resultadoMes >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {resultadoMes >= 0
              ? <TrendingUp className="h-4 w-4" />
              : <TrendingDown className="h-4 w-4" />}
            {formatBRL(Math.abs(resultadoMes))}
          </p>
          <p className={`text-[11px] mt-1 ${resultadoMes >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            Receitas − Despesas do mês
          </p>
        </div>
      </div>

      {/* Alerta: despesas vencidas */}
      {despesasVencidas.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-red-500 flex-none" />
            <p className="text-sm font-semibold text-red-800">
              {despesasVencidas.length} despesa{despesasVencidas.length > 1 ? 's' : ''} vencida{despesasVencidas.length > 1 ? 's' : ''}
            </p>
          </div>
          {despesasVencidas.slice(0, 4).map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-xl bg-white border border-red-100 px-4 py-2.5">
              <div>
                <p className="text-sm font-medium text-zinc-800">{d.descricao}</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Venceu em {new Date(d.vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                  {d.fornecedor ? ` · ${d.fornecedor}` : ''}
                </p>
              </div>
              <p className="text-sm font-semibold text-red-700">{formatBRL(Number(d.valor))}</p>
            </div>
          ))}
        </div>
      )}

      {/* Alerta: inadimplências de receitas */}
      {atrasadas.length > 0 && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-orange-500 flex-none" />
            <p className="text-sm font-semibold text-orange-800">
              {atrasadas.length} receita{atrasadas.length > 1 ? 's' : ''} em atraso
            </p>
          </div>
          {atrasadas.slice(0, 4).map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl bg-white border border-orange-100 px-4 py-2.5">
              <div>
                <p className="text-sm font-medium text-zinc-800">{r.descricao}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{r.cliente?.nome ?? 'Sem cliente'}</p>
              </div>
              <p className="text-sm font-semibold text-orange-700">{formatBRL(Number(r.valor_mensal))}/mês</p>
            </div>
          ))}
        </div>
      )}

      {/* Próximas cobranças + vencimentos */}
      <div className="grid gap-4 sm:grid-cols-2">
        {proxCobrancas.length > 0 && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold text-zinc-500 mb-3">Cobranças este mês</p>
            <div className="space-y-2.5">
              {proxCobrancas.map((r) => (
                <div key={r.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-blue-50 flex items-center justify-center text-xs font-bold text-blue-600 flex-none">
                      {r.data_cobranca_dia}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-zinc-800 truncate max-w-[140px]">{r.descricao}</p>
                      <p className="text-[10px] text-zinc-400">{r.cliente?.nome ?? '—'}</p>
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-zinc-700">{formatBRL(Number(r.valor_mensal))}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {proxVencimentos.length > 0 && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold text-zinc-500 mb-3">Vencimentos próximos</p>
            <div className="space-y-2.5">
              {proxVencimentos.map((d) => {
                const v = new Date(d.vencimento + 'T12:00:00')
                const diffDays = Math.ceil((v.getTime() - hoje.getTime()) / 86400000)
                const isUrgente = diffDays <= 5
                return (
                  <div key={d.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-none ${isUrgente ? 'bg-red-50 text-red-600' : 'bg-zinc-100 text-zinc-600'}`}>
                        {diffDays}d
                      </div>
                      <div>
                        <p className="text-xs font-medium text-zinc-800 truncate max-w-[140px]">{d.descricao}</p>
                        <p className="text-[10px] text-zinc-400">{labelCategoria(d.categoria)}</p>
                      </div>
                    </div>
                    <p className={`text-xs font-semibold ${isUrgente ? 'text-red-600' : 'text-zinc-700'}`}>
                      {formatBRL(Number(d.valor))}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {visaoGeral.total_receitas_ativas === 0 && despesas.length === 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center">
          <DollarSign className="mx-auto h-10 w-10 text-zinc-200 mb-3" />
          <p className="text-sm font-medium text-zinc-400">Nenhum dado financeiro cadastrado.</p>
          <p className="text-xs text-zinc-400 mt-1">
            Adicione receitas na aba &quot;Receitas&quot; e despesas na aba &quot;Despesas&quot;.
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
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
            <h2 className="font-display text-base font-semibold text-zinc-900">Nova Receita Recorrente</h2>
            <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-700">Descrição *</label>
              <input type="text" required value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Ex: Gestão de Redes Sociais"
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-700">Cliente</label>
              <select value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20">
                <option value="">Sem cliente vinculado</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700">Valor mensal *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">R$</span>
                  <input type="text" inputMode="decimal" required value={form.valor_mensal}
                    onChange={(e) => setForm({ ...form, valor_mensal: e.target.value })}
                    placeholder="0,00"
                    className="w-full rounded-xl border border-zinc-200 pl-8 pr-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700">Ciclo</label>
                <select value={form.ciclo} onChange={(e) => setForm({ ...form, ciclo: e.target.value as CicloCobranca })}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-brand focus:outline-none">
                  <option value="mensal">Mensal</option>
                  <option value="trimestral">Trimestral</option>
                  <option value="semestral">Semestral</option>
                  <option value="anual">Anual</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-700">
                Dia de cobrança <span className="text-zinc-400">(1 – 28)</span>
              </label>
              <input type="number" min={1} max={28} required value={form.data_cobranca_dia}
                onChange={(e) => setForm({ ...form, data_cobranca_dia: e.target.value })}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-700">Observações</label>
              <textarea rows={2} value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                placeholder="Notas internas..."
                className="w-full resize-none rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
            </div>
            {erro && <p className="flex items-center gap-1.5 text-xs text-red-600"><AlertTriangle className="h-3.5 w-3.5 flex-none" />{erro}</p>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 rounded-xl border border-zinc-200 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition">
                Cancelar
              </button>
              <button type="submit" disabled={isPending}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 transition">
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
  receita, onClose, onRefresh,
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
    setCarregando(true)
    buscarHistoricoReceita(receita.id).then((h) => { setHistorico(h); setCarregando(false) })
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
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="flex w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl max-h-[85vh]">
          <div className="flex flex-none items-center justify-between border-b border-zinc-100 px-5 py-4">
            <div>
              <h2 className="font-display text-base font-semibold text-zinc-900">Histórico de Pagamentos</h2>
              <p className="mt-0.5 text-xs text-zinc-500">{receita.descricao}</p>
            </div>
            <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            <form onSubmit={handleRegistrar} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-3">
              <p className="text-xs font-semibold text-zinc-700">Registrar competência</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-zinc-600">Mês</label>
                  <input type="month" required value={form.competencia}
                    onChange={(e) => setForm({ ...form, competencia: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-brand focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-600">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as StatusPagamento })}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-brand focus:outline-none">
                    <option value="pago">Pago</option>
                    <option value="pendente">Pendente</option>
                    <option value="em_atraso">Em atraso</option>
                  </select>
                </div>
              </div>
              {form.status === 'pago' && (
                <div>
                  <label className="mb-1 block text-xs text-zinc-600">Data de pagamento</label>
                  <input type="date" value={form.pago_em}
                    onChange={(e) => setForm({ ...form, pago_em: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-brand focus:outline-none" />
                </div>
              )}
              {erro && <p className="text-xs text-red-600">{erro}</p>}
              <button type="submit" disabled={isPending}
                className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-medium text-white disabled:opacity-60">
                {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                Salvar
              </button>
            </form>
            {carregando ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-zinc-300" /></div>
            ) : historico?.length === 0 ? (
              <p className="py-6 text-center text-sm text-zinc-400">Nenhuma competência registrada ainda.</p>
            ) : (
              <div className="space-y-2">
                {historico?.map((h) => (
                  <div key={h.id} className="flex items-center justify-between rounded-xl border border-zinc-100 bg-white px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-800">
                        {new Date(h.competencia + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                      </p>
                      {h.pago_em && <p className="mt-0.5 text-xs text-zinc-400">Pago em {new Date(h.pago_em).toLocaleDateString('pt-BR')}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-semibold text-zinc-700">{formatBRL(Number(h.valor_cobrado))}</p>
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUS_CFG[h.status].cls}`}>
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
// AbaReceitas (ex-AbaPorCliente)
// ---------------------------------------------------------------------------

function AbaReceitas({
  receitas, clientes, onRefresh,
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
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => setMostrarInativas((v) => !v)}
          className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${mostrarInativas ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300'}`}>
          {mostrarInativas ? 'Ocultar arquivadas' : 'Incluir arquivadas'}
        </button>
        <button onClick={() => setModalNova(true)}
          className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 transition">
          <Plus className="h-3.5 w-3.5" />
          Nova receita
        </button>
      </div>
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">Receita</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold text-zinc-500 sm:table-cell">Cliente</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500">Valor/mês</th>
                <th className="hidden px-4 py-3 text-center text-xs font-semibold text-zinc-500 md:table-cell">Ciclo</th>
                <th className="hidden px-4 py-3 text-center text-xs font-semibold text-zinc-500 md:table-cell">Dia</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtradas.map((r) => (
                <tr key={r.id} className={`transition hover:bg-zinc-50/50 ${!r.ativo ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-800">{r.descricao}</p>
                    {r.observacoes && <p className="mt-0.5 max-w-[180px] truncate text-xs text-zinc-400">{r.observacoes}</p>}
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-zinc-500 sm:table-cell">{r.cliente?.nome ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-zinc-800">{formatBRL(Number(r.valor_mensal))}</td>
                  <td className="hidden px-4 py-3 text-center text-xs text-zinc-500 md:table-cell">{labelCiclo(r.ciclo)}</td>
                  <td className="hidden px-4 py-3 text-center text-xs text-zinc-500 md:table-cell">dia {r.data_cobranca_dia}</td>
                  <td className="px-4 py-3 text-center">
                    {r.ativo ? (
                      <button onClick={() => toggleStatus(r)} disabled={atualizandoStatus === r.id}
                        title="Clique para alterar status"
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition hover:opacity-75 disabled:opacity-50 ${STATUS_CFG[r.status].cls}`}>
                        {atualizandoStatus === r.id && <Loader2 className="h-3 w-3 animate-spin" />}
                        {STATUS_CFG[r.status].label}
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-400">Arquivada</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setReceitaHistorico(r)} title="Histórico de pagamentos"
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition">
                        <History className="h-3.5 w-3.5" />
                      </button>
                      {r.ativo && (
                        <button onClick={() => arquivar(r)} disabled={arquivando === r.id} title="Arquivar receita"
                          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-50 transition">
                          {arquivando === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
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
      {modalNova && (
        <ModalNovaReceita clientes={clientes} onClose={() => setModalNova(false)}
          onSuccess={() => { setModalNova(false); onRefresh() }} />
      )}
      {receitaHistorico && (
        <ModalHistorico receita={receitaHistorico} onClose={() => setReceitaHistorico(null)} onRefresh={onRefresh} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ModalNovaDespesa
// ---------------------------------------------------------------------------

function ModalNovaDespesa({
  onClose, onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  const [form, setForm] = useState({
    descricao: '',
    categoria: 'outros' as CategoriaDespesa,
    fornecedor: '',
    valor: '',
    competencia: '',
    vencimento: '',
    recorrente: false,
    ciclo: 'mensal' as CicloCobranca,
    observacoes: '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    const valor = parseFloat(form.valor.replace(',', '.'))
    if (isNaN(valor) || valor <= 0) { setErro('Informe um valor válido.'); return }
    if (!form.vencimento) { setErro('Informe a data de vencimento.'); return }

    startTransition(async () => {
      const res = await actionCriarDespesa({
        descricao: form.descricao.trim(),
        categoria: form.categoria,
        fornecedor: form.fornecedor.trim() || undefined,
        valor,
        competencia: form.competencia ? form.competencia + '-01' : null,
        vencimento: form.vencimento,
        recorrente: form.recorrente,
        ciclo: form.recorrente ? form.ciclo : null,
        observacoes: form.observacoes.trim() || undefined,
      })
      if (res.error) { setErro(res.error); return }
      onSuccess()
    })
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 flex-none">
            <h2 className="font-display text-base font-semibold text-zinc-900">Nova Despesa</h2>
            <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-700">Descrição *</label>
              <input type="text" required value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Ex: Adobe Creative Cloud"
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700">Categoria *</label>
                <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value as CategoriaDespesa })}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-brand focus:outline-none">
                  {CATEGORIAS_DESPESA.map((c) => <option key={c} value={c}>{labelCategoria(c)}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700">Fornecedor</label>
                <input type="text" value={form.fornecedor}
                  onChange={(e) => setForm({ ...form, fornecedor: e.target.value })}
                  placeholder="Ex: Adobe"
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand focus:outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700">Valor *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">R$</span>
                  <input type="text" inputMode="decimal" required value={form.valor}
                    onChange={(e) => setForm({ ...form, valor: e.target.value })}
                    placeholder="0,00"
                    className="w-full rounded-xl border border-zinc-200 pl-8 pr-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700">Vencimento *</label>
                <input type="date" required value={form.vencimento}
                  onChange={(e) => setForm({ ...form, vencimento: e.target.value })}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-brand focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">
                Competência
                <span className="ml-1.5 font-normal text-zinc-400">(opcional — mês contábil se diferente do vencimento)</span>
              </label>
              <input type="month" value={form.competencia}
                onChange={(e) => setForm({ ...form, competencia: e.target.value })}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-brand focus:outline-none" />
              {form.competencia && form.vencimento && form.competencia !== form.vencimento.slice(0, 7) && (
                <p className="mt-1 text-[11px] text-blue-600">
                  Aparece em {new Date(form.competencia + '-01T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}, vence em {new Date(form.vencimento + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setForm({ ...form, recorrente: !form.recorrente })}
                className={`relative h-5 w-9 flex-none rounded-full transition-colors ${form.recorrente ? 'bg-emerald-500' : 'bg-zinc-200'}`}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.recorrente ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-xs text-zinc-700">Despesa recorrente</span>
              {form.recorrente && (
                <select value={form.ciclo} onChange={(e) => setForm({ ...form, ciclo: e.target.value as CicloCobranca })}
                  className="ml-auto rounded-xl border border-zinc-200 px-2 py-1 text-xs text-zinc-700 focus:border-brand focus:outline-none">
                  <option value="mensal">Mensal</option>
                  <option value="trimestral">Trimestral</option>
                  <option value="semestral">Semestral</option>
                  <option value="anual">Anual</option>
                </select>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-700">Observações</label>
              <textarea rows={2} value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                placeholder="Notas internas..."
                className="w-full resize-none rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand focus:outline-none" />
            </div>
            {erro && <p className="flex items-center gap-1.5 text-xs text-red-600"><AlertTriangle className="h-3.5 w-3.5 flex-none" />{erro}</p>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 rounded-xl border border-zinc-200 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition">
                Cancelar
              </button>
              <button type="submit" disabled={isPending}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 transition">
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Criar despesa
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// ModalPagarDespesa
// ---------------------------------------------------------------------------

function ModalPagarDespesa({
  despesa, onClose, onSuccess,
}: {
  despesa: Despesa
  onClose: () => void
  onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [pagoEm, setPagoEm] = useState(new Date().toISOString().slice(0, 10))

  function handleConfirmar(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      await actionAtualizarStatusDespesa(
        despesa.id,
        'paga',
        new Date(pagoEm + 'T12:00:00').toISOString(),
      )
      onSuccess()
    })
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
            <div>
              <h2 className="font-display text-base font-semibold text-zinc-900">Confirmar Pagamento</h2>
              <p className="mt-0.5 text-xs text-zinc-500 truncate max-w-[240px]">{despesa.descricao}</p>
            </div>
            <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleConfirmar} className="p-5 space-y-4">
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-zinc-500">Valor</span>
              <span className="text-sm font-semibold text-zinc-800">{formatBRL(Number(despesa.valor))}</span>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-700">Data do pagamento</label>
              <input type="date" required value={pagoEm} onChange={(e) => setPagoEm(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-brand focus:outline-none" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose}
                className="flex-1 rounded-xl border border-zinc-200 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition">
                Cancelar
              </button>
              <button type="submit" disabled={isPending}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 transition">
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Confirmar
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// AbaDespesas
// ---------------------------------------------------------------------------

function mesStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function labelMes(ym: string): string {
  const [ano, mes] = ym.split('-').map(Number)
  return new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

function AbaDespesas({
  despesas, onRefresh,
}: {
  despesas: Despesa[]
  onRefresh: () => void
}) {
  const hoje = new Date()
  const [filtroMes, setFiltroMes] = useState(() => mesStr(hoje))
  const [modalNova, setModalNova] = useState(false)
  const [pagando, setPagando] = useState<Despesa | null>(null)
  const [arquivando, setArquivando] = useState<string | null>(null)
  const [filtroStatus, setFiltroStatus] = useState<StatusDespesa | 'todas'>('todas')
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaDespesa | ''>('')

  function navMes(delta: number) {
    const [ano, mes] = filtroMes.split('-').map(Number)
    const nova = new Date(ano, mes - 1 + delta, 1)
    setFiltroMes(mesStr(nova))
  }

  // Filtra despesas pelo mês selecionado.
  // Prioridade: competencia (campo contábil) > vencimento
  // Para despesas pagas sem competencia: usa pago_em para refletir o fluxo real
  const doMes = despesas.filter((d) => {
    if (d.competencia) return d.competencia.slice(0, 7) === filtroMes
    if (d.status === 'paga' && d.pago_em) return d.pago_em.slice(0, 7) === filtroMes
    return d.vencimento.slice(0, 7) === filtroMes
  })

  const filtradas = doMes.filter((d) => {
    if (filtroStatus !== 'todas' && d.status !== filtroStatus) return false
    if (filtroCategoria && d.categoria !== filtroCategoria) return false
    return true
  })

  // Resumo do mês
  const resumo = {
    pendente: doMes.filter((d) => d.status === 'pendente'),
    paga:     doMes.filter((d) => d.status === 'paga'),
    vencida:  doMes.filter((d) => d.status === 'vencida'),
  }

  // Alerta global de vencidas (todos os meses, não só o atual)
  const totalVencidas = despesas.filter((d) => d.status === 'vencida').length
  const valorTotalVencido = despesas.filter((d) => d.status === 'vencida').reduce((s, d) => s + Number(d.valor), 0)

  async function arquivar(d: Despesa) {
    if (!confirm(`Arquivar "${d.descricao}"?`)) return
    setArquivando(d.id)
    try {
      await actionArquivarDespesa(d.id)
      onRefresh()
    } finally {
      setArquivando(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Alerta global de vencidas */}
      {totalVencidas > 0 && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-red-500 flex-none" />
          <p className="text-sm text-red-800">
            <span className="font-semibold">{totalVencidas} despesa{totalVencidas > 1 ? 's' : ''} vencida{totalVencidas > 1 ? 's' : ''}</span>
            {' — '}{formatBRL(valorTotalVencido)} a regularizar
          </p>
        </div>
      )}

      {/* Navegação de mês */}
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
        <button onClick={() => navMes(-1)}
          className="rounded-xl p-1.5 text-zinc-500 hover:bg-white hover:shadow-sm transition">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-zinc-800 capitalize">{labelMes(filtroMes)}</p>
        </div>
        <div className="flex items-center gap-1">
          {filtroMes !== mesStr(hoje) && (
            <button onClick={() => setFiltroMes(mesStr(hoje))}
              className="rounded-lg px-2.5 py-1 text-[11px] font-medium text-zinc-500 hover:bg-white hover:shadow-sm transition">
              Hoje
            </button>
          )}
          <button onClick={() => navMes(1)}
            className="rounded-xl p-1.5 text-zinc-500 hover:bg-white hover:shadow-sm transition">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Resumo do mês */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5 text-center">
          <p className="text-[10px] font-semibold text-amber-600 mb-0.5">A pagar</p>
          <p className="text-sm font-bold text-amber-700">
            {formatBRL(resumo.pendente.reduce((s, d) => s + Number(d.valor), 0))}
          </p>
          <p className="text-[10px] text-amber-500">{resumo.pendente.length} despesa{resumo.pendente.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-center">
          <p className="text-[10px] font-semibold text-emerald-600 mb-0.5">Pagas</p>
          <p className="text-sm font-bold text-emerald-700">
            {formatBRL(resumo.paga.reduce((s, d) => s + Number(d.valor), 0))}
          </p>
          <p className="text-[10px] text-emerald-500">{resumo.paga.length} despesa{resumo.paga.length !== 1 ? 's' : ''}</p>
        </div>
        <div className={`rounded-xl border px-3 py-2.5 text-center ${resumo.vencida.length > 0 ? 'border-red-100 bg-red-50' : 'border-zinc-100 bg-zinc-50'}`}>
          <p className={`text-[10px] font-semibold mb-0.5 ${resumo.vencida.length > 0 ? 'text-red-600' : 'text-zinc-500'}`}>Vencidas</p>
          <p className={`text-sm font-bold ${resumo.vencida.length > 0 ? 'text-red-700' : 'text-zinc-400'}`}>
            {resumo.vencida.length > 0
              ? formatBRL(resumo.vencida.reduce((s, d) => s + Number(d.valor), 0))
              : '—'}
          </p>
          <p className={`text-[10px] ${resumo.vencida.length > 0 ? 'text-red-500' : 'text-zinc-400'}`}>
            {resumo.vencida.length} despesa{resumo.vencida.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {/* Filtro status */}
          <div className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-2 py-1.5">
            <Filter className="h-3 w-3 text-zinc-400" />
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as StatusDespesa | 'todas')}
              className="text-xs text-zinc-700 bg-transparent focus:outline-none">
              <option value="todas">Todas</option>
              <option value="pendente">Pendentes</option>
              <option value="paga">Pagas</option>
              <option value="vencida">Vencidas</option>
            </select>
          </div>
          {/* Filtro categoria */}
          <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value as CategoriaDespesa | '')}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 focus:outline-none">
            <option value="">Todas as categorias</option>
            {CATEGORIAS_DESPESA.map((c) => <option key={c} value={c}>{labelCategoria(c)}</option>)}
          </select>
          {(filtroStatus !== 'todas' || filtroCategoria) && (
            <button onClick={() => { setFiltroStatus('todas'); setFiltroCategoria('') }}
              className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50 transition">
              <X className="h-3 w-3" />Limpar
            </button>
          )}
        </div>
        <button onClick={() => setModalNova(true)}
          className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 transition">
          <Plus className="h-3.5 w-3.5" />
          Nova despesa
        </button>
      </div>

      {/* Tabela */}
      {filtradas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center">
          <Receipt className="mx-auto h-10 w-10 text-zinc-200 mb-3" />
          <p className="text-sm font-medium text-zinc-400">
            {filtroStatus !== 'todas' || filtroCategoria
              ? 'Nenhuma despesa com estes filtros.'
              : `Nenhuma despesa em ${labelMes(filtroMes)}.`}
          </p>
          {filtroStatus === 'todas' && !filtroCategoria && (
            <p className="text-xs text-zinc-400 mt-1">Clique em &quot;Nova despesa&quot; para adicionar.</p>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">Descrição</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold text-zinc-500 sm:table-cell">Categoria</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold text-zinc-500 md:table-cell">Fornecedor</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500">Valor</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500">Vencimento</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtradas.map((d) => {
                const venc = new Date(d.vencimento + 'T12:00:00')
                const isHoje = hoje.toDateString() === venc.toDateString()
                return (
                  <tr key={d.id} className="transition hover:bg-zinc-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-800">{d.descricao}</p>
                      {d.recorrente && (
                        <span className="mt-0.5 inline-block rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                          {d.ciclo ? labelCiclo(d.ciclo) : 'Recorrente'}
                        </span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                        {labelCategoria(d.categoria)}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-zinc-500 md:table-cell">{d.fornecedor ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-zinc-800">{formatBRL(Number(d.valor))}</td>
                    <td className={`px-4 py-3 text-center text-xs ${isHoje ? 'font-semibold text-orange-600' : 'text-zinc-500'}`}>
                      {venc.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUS_DESPESA_CFG[d.status].cls}`}>
                        {STATUS_DESPESA_CFG[d.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {d.status !== 'paga' && (
                          <button onClick={() => setPagando(d)} title="Marcar como paga"
                            className="rounded-lg p-1.5 text-zinc-400 hover:bg-emerald-50 hover:text-emerald-600 transition">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button onClick={() => arquivar(d)} disabled={arquivando === d.id} title="Arquivar despesa"
                          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-50 transition">
                          {arquivando === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalNova && (
        <ModalNovaDespesa onClose={() => setModalNova(false)} onSuccess={() => { setModalNova(false); onRefresh() }} />
      )}
      {pagando && (
        <ModalPagarDespesa despesa={pagando} onClose={() => setPagando(null)} onSuccess={() => { setPagando(null); onRefresh() }} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// AbaFluxoCaixa
// ---------------------------------------------------------------------------

function AbaFluxoCaixa({ fluxoCaixa }: { fluxoCaixa: FluxoCaixaMes[] }) {
  const [exportando, setExportando] = useState(false)
  const agora = new Date()
  const mesAtual = mesStr(agora)
  const mesInicioDefault = mesStr(new Date(agora.getFullYear(), agora.getMonth() - 5, 1))

  const [mesInicio, setMesInicio] = useState(mesInicioDefault)
  const [mesFim, setMesFim] = useState(mesAtual)

  // Filtra a tabela pelo range selecionado (os mesmos pickers do export)
  const dadosExibidos = fluxoCaixa.filter(
    (m) => m.mes >= mesInicio + '-01' && m.mes <= mesFim + '-01',
  )

  const totalReceitas = dadosExibidos.reduce((s, m) => s + m.receitas, 0)
  const totalDespesas = dadosExibidos.reduce((s, m) => s + m.despesas, 0)
  const totalResultado = totalReceitas - totalDespesas

  async function handleExportar() {
    setExportando(true)
    try {
      const res = await actionExportarCSV(mesInicio, mesFim)
      if (res.error || !res.csv) {
        alert('Erro ao exportar. Tente novamente.')
        return
      }
      const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `financeiro-${mesInicio}-a-${mesFim}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExportando(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Seletores de período — controlam tabela E exportação */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">De</label>
          <input type="month" value={mesInicio} onChange={(e) => setMesInicio(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-brand focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">Até</label>
          <input type="month" value={mesFim} onChange={(e) => setMesFim(e.target.value)}
            min={mesInicio}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-brand focus:outline-none" />
        </div>
        <p className="text-[11px] text-zinc-400 self-end pb-2">
          {dadosExibidos.length} mês{dadosExibidos.length !== 1 ? 'es' : ''} exibido{dadosExibidos.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Tabela de fluxo de caixa */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">Mês</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500">Entradas</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500">Saídas</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500">Resultado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {dadosExibidos.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-zinc-400">
                  Nenhum dado para o período selecionado.
                </td>
              </tr>
            ) : (
              dadosExibidos.map((m) => (
                <tr key={m.mes} className="hover:bg-zinc-50/50 transition">
                  <td className="px-4 py-3 font-medium text-zinc-800 capitalize">{m.label}</td>
                  <td className="px-4 py-3 text-right text-emerald-700 font-medium">
                    {m.receitas > 0 ? formatBRL(m.receitas) : <span className="text-zinc-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-red-600 font-medium">
                    {m.despesas > 0 ? formatBRL(m.despesas) : <span className="text-zinc-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${m.resultado >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {m.resultado >= 0 ? '+' : ''}{formatBRL(m.resultado)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {dadosExibidos.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-zinc-200 bg-zinc-50">
                <td className="px-4 py-3 text-xs font-semibold text-zinc-600">
                  Total ({dadosExibidos.length} mês{dadosExibidos.length !== 1 ? 'es' : ''})
                </td>
                <td className="px-4 py-3 text-right text-xs font-semibold text-emerald-700">{formatBRL(totalReceitas)}</td>
                <td className="px-4 py-3 text-right text-xs font-semibold text-red-600">{formatBRL(totalDespesas)}</td>
                <td className={`px-4 py-3 text-right text-xs font-bold ${totalResultado >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {totalResultado >= 0 ? '+' : ''}{formatBRL(totalResultado)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Nota sobre dados */}
      <p className="text-[11px] text-zinc-400 flex items-center gap-1.5">
        <Calendar className="h-3 w-3" />
        Entradas = receitas registradas como &quot;pagas&quot; no histórico · Saídas = despesas pagas no mês
      </p>

      {/* Export para contabilidade */}
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 space-y-3">
        <div>
          <p className="text-sm font-semibold text-zinc-800 mb-1">Exportar para Contabilidade</p>
          <p className="text-xs text-zinc-500">
            Gera um CSV com receitas e despesas do mesmo período exibido acima.
          </p>
        </div>
        <button onClick={handleExportar} disabled={exportando || dadosExibidos.length === 0}
          className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 transition">
          {exportando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {exportando ? 'Gerando...' : `Exportar CSV (${mesInicio} a ${mesFim})`}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AbaDocumentos
// ---------------------------------------------------------------------------

function AbaDocumentos({
  documentos, clientes, onRefresh,
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
      if (res.error) { setErroUpload(res.error); return }
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
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
        <p className="mb-3 text-xs font-semibold text-zinc-700">Enviar documento</p>
        <form ref={formRef} onSubmit={handleUpload} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Arquivo *</label>
              <input ref={fileRef} type="file" name="arquivo" required
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 file:mr-2 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-white cursor-pointer" />
              <p className="mt-1 text-[10px] text-zinc-400">PDF, imagem, Word, Excel · máx 20 MB</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Tipo</label>
              <select name="tipo" className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 focus:border-brand focus:outline-none">
                {TIPOS_DOC.map((t) => <option key={t} value={t}>{labelTipoDoc(t)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <label className="mb-1 block text-xs font-medium text-zinc-600">Nome personalizado</label>
              <input type="text" name="nome" placeholder="Deixe em branco para usar nome do arquivo"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 placeholder:text-zinc-400 focus:border-brand focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Mês de referência</label>
              <input type="month" name="mes_referencia"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 focus:border-brand focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Cliente</label>
              <select name="cliente_id" className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 focus:border-brand focus:outline-none">
                <option value="">Documento geral</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={uploadPending}
              className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-60 transition">
              {uploadPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {uploadPending ? 'Enviando...' : 'Enviar'}
            </button>
            {erroUpload && <p className="flex items-center gap-1 text-xs text-red-600"><AlertTriangle className="h-3 w-3 flex-none" />{erroUpload}</p>}
            {uploadOk && <p className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="h-3 w-3 flex-none" />Documento enviado!</p>}
          </div>
        </form>
      </div>

      <div className="flex flex-wrap gap-2">
        <input type="month" value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 focus:border-brand focus:outline-none" />
        <select value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 focus:border-brand focus:outline-none">
          <option value="">Todos os clientes</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value as TipoDocFinanceiro | '')}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 focus:border-brand focus:outline-none">
          <option value="">Todos os tipos</option>
          {TIPOS_DOC.map((t) => <option key={t} value={t}>{labelTipoDoc(t)}</option>)}
        </select>
        {(filtroMes || filtroCliente || filtroTipo) && (
          <button onClick={() => { setFiltroMes(''); setFiltroCliente(''); setFiltroTipo('') }}
            className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50 transition">
            <X className="h-3 w-3" />Limpar
          </button>
        )}
      </div>

      {docsFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-zinc-200 mb-3" />
          <p className="text-sm font-medium text-zinc-400">Nenhum documento.</p>
          <p className="text-xs text-zinc-400 mt-1">
            {filtroMes || filtroCliente || filtroTipo ? 'Tente remover os filtros.' : 'Faça o upload do primeiro documento acima.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {docsFiltrados.map((d) => (
            <div key={d.id} className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 transition hover:border-zinc-300">
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
                      <span>{new Date(d.mes_referencia + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                    </>
                  )}
                  <span className={d.cliente?.nome || d.mes_referencia ? '· ' : ''}>{formatBytes(d.tamanho_bytes)}</span>
                </div>
              </div>
              <div className="flex flex-none items-center gap-1">
                {d.url_assinada && (
                  <a href={d.url_assinada} target="_blank" rel="noopener noreferrer" title="Download"
                    className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600">
                    <Download className="h-3.5 w-3.5" />
                  </a>
                )}
                <button onClick={() => excluir(d.id, d.nome)} disabled={excluindoId === d.id} title="Excluir"
                  className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50">
                  {excluindoId === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
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

type Aba = 'visao_geral' | 'receitas' | 'despesas' | 'fluxo_caixa' | 'documentos'

const ABAS: { id: Aba; label: string }[] = [
  { id: 'visao_geral',  label: 'Visão Geral'    },
  { id: 'receitas',     label: 'Receitas'        },
  { id: 'despesas',     label: 'Despesas'        },
  { id: 'fluxo_caixa',  label: 'Fluxo de Caixa' },
  { id: 'documentos',   label: 'Documentos'      },
]

export function FinanceiroPainel({
  receitas, visaoGeral, documentos, clientes, despesas, fluxoCaixa,
}: Props) {
  const [aba, setAba] = useState<Aba>('visao_geral')
  const router = useRouter()

  function refresh() { router.refresh() }

  const despesasVencidasCount = despesas.filter((d) => d.status === 'vencida').length

  return (
    <div className="space-y-4">
      {/* Tab bar — scroll horizontal em mobile */}
      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-zinc-200 bg-zinc-50 p-1">
        {ABAS.map((a) => (
          <button key={a.id} onClick={() => setAba(a.id)}
            className={`relative flex-none rounded-xl px-4 py-2 text-sm font-medium transition whitespace-nowrap ${
              aba === a.id ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}>
            {a.label}
            {a.id === 'despesas' && despesasVencidasCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                {despesasVencidasCount > 9 ? '9+' : despesasVencidasCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {aba === 'visao_geral' && (
        <AbaVisaoGeral visaoGeral={visaoGeral} receitas={receitas} despesas={despesas} fluxoCaixa={fluxoCaixa} />
      )}
      {aba === 'receitas' && (
        <AbaReceitas receitas={receitas} clientes={clientes} onRefresh={refresh} />
      )}
      {aba === 'despesas' && (
        <AbaDespesas despesas={despesas} onRefresh={refresh} />
      )}
      {aba === 'fluxo_caixa' && (
        <AbaFluxoCaixa fluxoCaixa={fluxoCaixa} />
      )}
      {aba === 'documentos' && (
        <AbaDocumentos documentos={documentos} clientes={clientes} onRefresh={refresh} />
      )}
    </div>
  )
}
