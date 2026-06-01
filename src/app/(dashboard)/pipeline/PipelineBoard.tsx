'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, TrendingUp, Phone, Mail, Link2, DollarSign } from 'lucide-react'
import type { Prospect, StageProspect } from './actions'
import { actionAtualizarStage } from './actions'

// ---------------------------------------------------------------------------
// Stage config
// ---------------------------------------------------------------------------

interface StageCfg {
  label: string
  cor: string
  corBg: string
  corBorda: string
}

const STAGES: { key: StageProspect; cfg: StageCfg }[] = [
  { key: 'prospeccao',        cfg: { label: 'Prospecção',         cor: 'text-zinc-600',    corBg: 'bg-zinc-50',     corBorda: 'border-zinc-200'  } },
  { key: 'reuniao_agendada',  cfg: { label: 'Reunião Agendada',   cor: 'text-blue-600',    corBg: 'bg-blue-50',     corBorda: 'border-blue-200'  } },
  { key: 'reuniao_realizada', cfg: { label: 'Reunião Realizada',  cor: 'text-indigo-600',  corBg: 'bg-indigo-50',   corBorda: 'border-indigo-200'} },
  { key: 'proposta_enviada',  cfg: { label: 'Proposta Enviada',   cor: 'text-violet-600',  corBg: 'bg-violet-50',   corBorda: 'border-violet-200'} },
  { key: 'negociacao',        cfg: { label: 'Negociação',         cor: 'text-amber-600',   corBg: 'bg-amber-50',    corBorda: 'border-amber-200' } },
  { key: 'contrato_assinado', cfg: { label: 'Contrato Assinado',  cor: 'text-emerald-600', corBg: 'bg-emerald-50',  corBorda: 'border-emerald-200'} },
]

const STAGES_PERDIDOS = ['cliente_ativo', 'perdido'] as StageProspect[]

// ---------------------------------------------------------------------------
// ProspectCard
// ---------------------------------------------------------------------------

function ProspectCard({ prospect }: { prospect: Prospect }) {
  const contato = prospect.contato ?? {}
  const valor = prospect.valor_mensal_proposto

  return (
    <Link
      href={`/pipeline/${prospect.id}`}
      className="block rounded-xl border border-zinc-200 bg-white p-3 shadow-sm hover:shadow-md hover:border-violet-300 transition-all group"
    >
      <p className="text-xs font-semibold text-zinc-900 group-hover:text-violet-700 transition-colors leading-snug">
        {prospect.nome}
      </p>
      {prospect.empresa && (
        <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{prospect.empresa}</p>
      )}
      {prospect.segmento && (
        <span className="mt-1.5 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-[9px] font-medium text-zinc-500">
          {prospect.segmento}
        </span>
      )}

      {/* Valor */}
      {valor && (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
          <DollarSign className="h-3 w-3" />
          R$ {valor.toLocaleString('pt-BR')}/mês
          {prospect.desconto ? ` (-${prospect.desconto}%)` : ''}
        </div>
      )}

      {/* Contatos rápidos */}
      <div className="mt-2 flex gap-2">
        {contato.email && (
          <span title={contato.email}>
            <Mail className="h-3 w-3 text-zinc-300" />
          </span>
        )}
        {contato.telefone && (
          <span title={contato.telefone}>
            <Phone className="h-3 w-3 text-zinc-300" />
          </span>
        )}
        {contato.linkedin && (
          <span title={contato.linkedin}>
            <Link2 className="h-3 w-3 text-zinc-300" />
          </span>
        )}
      </div>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Column
// ---------------------------------------------------------------------------

function PipelineColumn({
  stage,
  cfg,
  prospects,
}: {
  stage: StageProspect
  cfg: StageCfg
  prospects: Prospect[]
}) {
  const total = prospects.reduce((sum, p) => sum + (p.valor_mensal_proposto ?? 0), 0)

  return (
    <div className={`flex flex-none w-56 flex-col rounded-2xl border ${cfg.corBorda} ${cfg.corBg} p-3 gap-2`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold ${cfg.cor}`}>{cfg.label}</span>
        <span className="rounded-full bg-white border border-zinc-200 px-1.5 py-0.5 text-[10px] font-bold text-zinc-500">
          {prospects.length}
        </span>
      </div>

      {/* Valor total */}
      {total > 0 && (
        <p className="text-[9px] text-zinc-400 font-medium">
          R$ {total.toLocaleString('pt-BR')}/mês
        </p>
      )}

      {/* Cards */}
      <div className="flex flex-col gap-2 min-h-[40px]">
        {prospects.map((p) => (
          <ProspectCard key={p.id} prospect={p} />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Novo Prospect Dialog
// ---------------------------------------------------------------------------

function NovoProspectDialog({ onClose }: { onClose: () => void }) {
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCarregando(true)
    const formData = new FormData(e.currentTarget)
    try {
      const { actionCriarProspect } = await import('./actions')
      await actionCriarProspect(formData)
      onClose()
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
        <h2 className="font-display text-lg font-bold text-zinc-900 mb-4">Novo Prospect</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label-form">Nome / Pessoa de contato *</label>
            <input name="nome" required className="input-form" placeholder="Ex: João Silva" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-form">Empresa</label>
              <input name="empresa" className="input-form" placeholder="Ex: Loja ABC" />
            </div>
            <div>
              <label className="label-form">Segmento</label>
              <input name="segmento" className="input-form" placeholder="Ex: Moda" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-form">E-mail</label>
              <input name="email" type="email" className="input-form" placeholder="contato@empresa.com" />
            </div>
            <div>
              <label className="label-form">Telefone</label>
              <input name="telefone" className="input-form" placeholder="(11) 99999-9999" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-form">Origem</label>
              <select name="origem" className="input-form">
                <option value="inbound">Inbound</option>
                <option value="indicacao">Indicação</option>
                <option value="prospeccao_ativa">Prospecção Ativa</option>
                <option value="evento">Evento</option>
              </select>
            </div>
            <div>
              <label className="label-form">Valor estimado (R$/mês)</label>
              <input name="valor_mensal_proposto" type="number" step="0.01" className="input-form" placeholder="0,00" />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-zinc-200 py-2 text-sm text-zinc-600 hover:bg-zinc-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={carregando}
              className="flex-1 rounded-xl bg-violet-600 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition disabled:opacity-60"
            >
              {carregando ? 'Criando...' : 'Criar Prospect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PipelineBoard
// ---------------------------------------------------------------------------

export function PipelineBoard({ prospects: initial }: { prospects: Prospect[] }) {
  const [prospects] = useState(initial)
  const [novoAberto, setNovoAberto] = useState(false)

  // Separa por stage (excluindo perdidos e cliente_ativo no kanban principal)
  const porStage = STAGES.reduce(
    (acc, { key }) => {
      acc[key] = prospects.filter((p) => p.stage === key)
      return acc
    },
    {} as Record<StageProspect, Prospect[]>,
  )

  // Métricas de funil
  const totalAtivos = prospects.filter((p) => !STAGES_PERDIDOS.includes(p.stage)).length
  const totalValor = prospects
    .filter((p) => p.stage !== 'perdido')
    .reduce((sum, p) => sum + (p.valor_mensal_proposto ?? 0), 0)
  const totalPerdidos = prospects.filter((p) => p.stage === 'perdido').length
  const totalConvertidos = prospects.filter((p) => p.stage === 'cliente_ativo').length

  return (
    <div className="flex flex-col gap-6">
      {/* Header + KPIs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <div className="rounded-xl bg-white border border-zinc-200 px-4 py-2.5">
            <p className="text-[10px] text-zinc-400 font-medium">Em negociação</p>
            <p className="text-lg font-bold text-zinc-900">{totalAtivos}</p>
          </div>
          <div className="rounded-xl bg-white border border-zinc-200 px-4 py-2.5">
            <p className="text-[10px] text-zinc-400 font-medium">Valor no funil</p>
            <p className="text-lg font-bold text-emerald-600">R$ {totalValor.toLocaleString('pt-BR')}</p>
          </div>
          <div className="rounded-xl bg-white border border-zinc-200 px-4 py-2.5">
            <p className="text-[10px] text-zinc-400 font-medium">Convertidos</p>
            <p className="text-lg font-bold text-violet-600">{totalConvertidos}</p>
          </div>
          <div className="rounded-xl bg-white border border-zinc-200 px-4 py-2.5">
            <p className="text-[10px] text-zinc-400 font-medium">Perdidos</p>
            <p className="text-lg font-bold text-red-500">{totalPerdidos}</p>
          </div>
        </div>

        <button
          onClick={() => setNovoAberto(true)}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Novo Prospect
        </button>
      </div>

      {/* Kanban horizontal */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {STAGES.map(({ key, cfg }) => (
          <PipelineColumn
            key={key}
            stage={key}
            cfg={cfg}
            prospects={porStage[key] ?? []}
          />
        ))}
      </div>

      {/* Resumo de convertidos/perdidos */}
      {(totalConvertidos > 0 || totalPerdidos > 0) && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-zinc-500" />
            <h3 className="text-sm font-semibold text-zinc-700">Finalizados</h3>
          </div>
          <div className="flex gap-2 flex-wrap">
            {prospects
              .filter((p) => STAGES_PERDIDOS.includes(p.stage))
              .map((p) => (
                <Link
                  key={p.id}
                  href={`/pipeline/${p.id}`}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition hover:shadow-sm ${
                    p.stage === 'cliente_ativo'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-red-200 bg-red-50 text-red-600'
                  }`}
                >
                  {p.nome} {p.empresa ? `· ${p.empresa}` : ''}
                </Link>
              ))}
          </div>
        </div>
      )}

      {novoAberto && <NovoProspectDialog onClose={() => setNovoAberto(false)} />}
    </div>
  )
}
