'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronRight, Phone, Mail, Link2, DollarSign,
  Plus, Sparkles, FileText, XCircle,
  Edit2, Loader2, UserPlus,
} from 'lucide-react'
import type { Prospect, Interacao, Proposta, StageProspect, TipoInteracao } from '../actions'
import {
  actionAtualizarStage, actionRegistrarInteracao,
  actionGerarProposta, actionConverterEmCliente,
} from '../actions'

// ---------------------------------------------------------------------------
// Stage config (rótulos apenas)
// ---------------------------------------------------------------------------

const STAGE_LABELS: Record<StageProspect, string> = {
  prospeccao:        'Prospecção',
  reuniao_agendada:  'Reunião Agendada',
  reuniao_realizada: 'Reunião Realizada',
  proposta_enviada:  'Proposta Enviada',
  negociacao:        'Negociação',
  contrato_assinado: 'Contrato Assinado',
  cliente_ativo:     'Cliente Ativo ✓',
  perdido:           'Perdido',
}

const STAGE_ORDER: StageProspect[] = [
  'prospeccao', 'reuniao_agendada', 'reuniao_realizada',
  'proposta_enviada', 'negociacao', 'contrato_assinado',
]

const TIPO_INTERACAO_LABELS: Record<TipoInteracao, string> = {
  contato:   'Contato',
  nota:      'Nota',
  reuniao:   'Reunião',
  objecao:   'Objeção',
  proposta:  'Proposta',
  contrato:  'Contrato',
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

interface Props {
  prospect: Prospect
  interacoes: Interacao[]
  propostas: Proposta[]
}

export function ProspectDetalhe({ prospect: initial, interacoes: initInteracoes, propostas: initPropostas }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [prospect] = useState(initial)
  const [interacoes] = useState(initInteracoes)
  const [propostas, setPropostas] = useState(initPropostas)

  // Formulário de interação
  const [novaInteracao, setNovaInteracao] = useState('')
  const [tipoInteracao, setTipoInteracao] = useState<TipoInteracao>('nota')
  const [salvandoInteracao, setSalvandoInteracao] = useState(false)

  // Proposta
  const [gerando, setGerando] = useState(false)
  const [propostaVis, setPropostaVis] = useState<Proposta | null>(
    initPropostas.length > 0 ? initPropostas[0] : null,
  )

  // Converter em cliente
  const [convertendo, setConvertendo] = useState(false)
  const [nomeClienteConversao, setNomeClienteConversao] = useState(
    `${prospect.nome}${prospect.empresa ? ` — ${prospect.empresa}` : ''}`,
  )

  const contato = prospect.contato ?? {}

  async function avancarStage() {
    const idx = STAGE_ORDER.indexOf(prospect.stage as StageProspect)
    if (idx < 0 || idx >= STAGE_ORDER.length - 1) return
    const proximo = STAGE_ORDER[idx + 1]
    startTransition(() => {
      actionAtualizarStage(prospect.id, proximo).then(() => router.refresh())
    })
  }

  async function marcarPerdido() {
    const motivo = window.prompt('Motivo da perda (opcional):')
    startTransition(() => {
      actionAtualizarStage(prospect.id, 'perdido', motivo ?? undefined).then(() => router.refresh())
    })
  }

  async function salvarInteracao() {
    if (!novaInteracao.trim()) return
    setSalvandoInteracao(true)
    try {
      await actionRegistrarInteracao(prospect.id, tipoInteracao, novaInteracao.trim())
      setNovaInteracao('')
      router.refresh()
    } finally {
      setSalvandoInteracao(false)
    }
  }

  async function gerarProposta() {
    setGerando(true)
    try {
      const result = await actionGerarProposta(prospect.id)
      const nova: Proposta = {
        id: result.propostaId,
        prospect_id: prospect.id,
        versao: (propostas[0]?.versao ?? 0) + 1,
        conteudo: result.conteudo,
        enviada: false,
        enviada_em: null,
        created_at: new Date().toISOString(),
      }
      setPropostas([nova, ...propostas])
      setPropostaVis(nova)
    } finally {
      setGerando(false)
    }
  }

  async function converterEmCliente() {
    setConvertendo(true)
    try {
      const { clienteId } = await actionConverterEmCliente(prospect.id, nomeClienteConversao)
      router.push(`/clientes/${clienteId}`)
    } finally {
      setConvertendo(false)
    }
  }

  const podeAvancar = STAGE_ORDER.includes(prospect.stage as StageProspect) &&
    prospect.stage !== 'contrato_assinado'
  const ehFinalizado = prospect.stage === 'cliente_ativo' || prospect.stage === 'perdido'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">

      {/* ── Coluna principal ────────────────────────────────────── */}
      <div className="space-y-5">

        {/* Header do prospect */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold text-zinc-900">{prospect.nome}</h2>
              {prospect.empresa && <p className="text-sm text-zinc-500 mt-0.5">{prospect.empresa}</p>}
              {prospect.segmento && (
                <span className="mt-2 inline-block rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500">
                  {prospect.segmento}
                </span>
              )}
            </div>

            {/* Stage atual */}
            <div className="flex-none">
              <span className={`inline-flex items-center rounded-xl px-3 py-1.5 text-xs font-semibold ${
                prospect.stage === 'cliente_ativo'
                  ? 'bg-emerald-100 text-emerald-700'
                  : prospect.stage === 'perdido'
                    ? 'bg-red-100 text-red-600'
                    : 'bg-violet-100 text-violet-700'
              }`}>
                {STAGE_LABELS[prospect.stage]}
              </span>
            </div>
          </div>

          {/* Contatos */}
          <div className="mt-4 flex flex-wrap gap-3">
            {contato.email && (
              <a href={`mailto:${contato.email}`} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-violet-600 transition">
                <Mail className="h-3.5 w-3.5" />{contato.email}
              </a>
            )}
            {contato.telefone && (
              <a href={`tel:${contato.telefone}`} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-violet-600 transition">
                <Phone className="h-3.5 w-3.5" />{contato.telefone}
              </a>
            )}
            {contato.linkedin && (
              <a href={contato.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-violet-600 transition">
                <Link2 className="h-3.5 w-3.5" />LinkedIn
              </a>
            )}
          </div>

          {/* Valor */}
          {prospect.valor_mensal_proposto && (
            <div className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
              <DollarSign className="h-4 w-4" />
              R$ {prospect.valor_mensal_proposto.toLocaleString('pt-BR')}/mês
              {prospect.desconto ? (
                <span className="text-xs font-normal text-zinc-400">
                  ({prospect.desconto}% de desconto = R$ {(prospect.valor_mensal_proposto * (1 - prospect.desconto / 100)).toLocaleString('pt-BR')})
                </span>
              ) : null}
            </div>
          )}

          {/* Ações de stage */}
          {!ehFinalizado && (
            <div className="mt-4 flex gap-2 pt-4 border-t border-zinc-100">
              {podeAvancar && (
                <button
                  onClick={avancarStage}
                  disabled={isPending}
                  className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 transition disabled:opacity-60"
                >
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  Avançar para "{STAGE_LABELS[STAGE_ORDER[STAGE_ORDER.indexOf(prospect.stage as StageProspect) + 1]]}"
                </button>
              )}
              {prospect.stage === 'contrato_assinado' && (
                <button
                  onClick={() => {
                    const nome = window.prompt('Nome do cliente na plataforma:', nomeClienteConversao)
                    if (nome) { setNomeClienteConversao(nome); converterEmCliente() }
                  }}
                  disabled={convertendo}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-60"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  {convertendo ? 'Convertendo...' : 'Converter em Cliente'}
                </button>
              )}
              <button
                onClick={marcarPerdido}
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 transition disabled:opacity-60"
              >
                <XCircle className="h-3.5 w-3.5" />
                Marcar como Perdido
              </button>
            </div>
          )}
        </div>

        {/* Proposta gerada por IA */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-violet-500" />
              <h3 className="font-display text-sm font-bold text-zinc-800">
                Proposta
                {propostas.length > 0 && <span className="ml-1.5 text-xs font-normal text-zinc-400">({propostas.length} versão{propostas.length > 1 ? 'ões' : ''})</span>}
              </h3>
            </div>
            <button
              onClick={gerarProposta}
              disabled={gerando}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-pink-500 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition disabled:opacity-60"
            >
              {gerando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {gerando ? 'Gerando...' : propostas.length > 0 ? 'Nova Versão' : 'Gerar com IA'}
            </button>
          </div>

          {/* Seletor de versões */}
          {propostas.length > 1 && (
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {propostas.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPropostaVis(p)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                    propostaVis?.id === p.id
                      ? 'bg-violet-100 text-violet-700'
                      : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                  }`}
                >
                  v{p.versao}
                </button>
              ))}
            </div>
          )}

          {propostaVis ? (
            <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-4 text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">
              {propostaVis.conteudo}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Sparkles className="h-8 w-8 text-zinc-200 mb-2" />
              <p className="text-sm text-zinc-400">Nenhuma proposta gerada ainda.</p>
              <p className="text-xs text-zinc-300">Clique em "Gerar com IA" para criar uma proposta personalizada.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Sidebar de interações ────────────────────────────────── */}
      <div className="space-y-4">

        {/* Nova interação */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h3 className="font-display text-sm font-bold text-zinc-800 mb-3 flex items-center gap-2">
            <Edit2 className="h-3.5 w-3.5 text-zinc-400" />
            Registrar Interação
          </h3>

          <select
            value={tipoInteracao}
            onChange={(e) => setTipoInteracao(e.target.value as TipoInteracao)}
            className="input-form mb-2 text-xs"
          >
            {Object.entries(TIPO_INTERACAO_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>

          <textarea
            value={novaInteracao}
            onChange={(e) => setNovaInteracao(e.target.value)}
            placeholder="Descreva a interação..."
            rows={3}
            className="input-form mb-2 text-xs resize-none"
          />

          <button
            onClick={salvarInteracao}
            disabled={!novaInteracao.trim() || salvandoInteracao}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-zinc-800 py-2 text-xs font-semibold text-white hover:bg-zinc-900 transition disabled:opacity-50"
          >
            {salvandoInteracao ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Registrar
          </button>
        </div>

        {/* Histórico de interações */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h3 className="font-display text-sm font-bold text-zinc-800 mb-3">Histórico</h3>

          {interacoes.length === 0 ? (
            <p className="text-xs text-zinc-400 text-center py-4">Nenhuma interação ainda.</p>
          ) : (
            <div className="space-y-3">
              {interacoes.map((int) => (
                <div key={int.id} className="flex gap-2.5">
                  <div className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-zinc-100 mt-0.5">
                    <span className="text-[8px] font-bold text-zinc-400">
                      {int.tipo[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-semibold text-zinc-700">
                        {TIPO_INTERACAO_LABELS[int.tipo]}
                      </span>
                      <span className="text-[9px] text-zinc-400">
                        {new Date(int.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">{int.descricao}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
