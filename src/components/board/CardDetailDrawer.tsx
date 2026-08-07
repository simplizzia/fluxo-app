'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { abrirCronogramaDoCard } from '@/app/(dashboard)/cronogramas/actions'
import { SLUG_DEMANDA_CRONOGRAMA } from '@/app/(dashboard)/cronogramas/shared'
import {
  X, Calendar, User, Tag, Clock, Lock, Send, Timer,
  Paperclip, Download, FileImage, Film, FileText, Archive, File,
  RotateCcw, CheckCircle2, Sparkles, Loader2, Copy, Check,
  Share2, Plus, ExternalLink, CopyPlus,
} from 'lucide-react'
import {
  actionMoverCard,
  actionBuscarCardDetalhes,
  actionBuscarComentarios,
  actionCriarComentario,
  actionBuscarArquivos,
  actionUploadArquivo,
  actionEnviarParaAprovacao,
  actionAprovarInternamente,
  actionAprovarCard,
  actionReprovarCard,
  actionCancelarCard,
  actionAgendarEntrega,
  actionDuplicarCard,
} from '@/app/(dashboard)/board/actions'
import {
  buscarPublicacoes,
  buscarIntegracoesSociais,
  actionCriarPublicacao,
  type PublicacaoAgendada,
  type IntegracaoSocial,
} from '@/app/(dashboard)/socias/social/actions'
import { actionTriggerAgenteCard } from '@/app/(dashboard)/agentes/actions'
import FeedbackButtons from '@/components/agents/FeedbackButtons'
import type { BoardCard, ArquivoComUrl } from '@/app/(dashboard)/board/actions'
import type { StatusCard, PapelUsuario, CampoFormulario, Comentario, TipoArquivo } from '@/types/database'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { STATUS_CONFIG, ORDEM_STATUS, motivoBloqueio } from '@/lib/cards/status'
import { InlineError } from '@/components/shared/InlineError'
import { FluxoTrack } from './FluxoTrack'
import { slaParaCard, slaLabel, slaChipClass, slaDescricao } from '@/lib/sla'
import { SkeletonLines } from '@/components/shared/Skeleton'

interface CardDetailDrawerProps {
  card: BoardCard
  papelAtual: PapelUsuario
  onClose: () => void
  onCardUpdated: (card: BoardCard) => void
}

/** Formata timestamp para texto relativo em pt-BR */
function tempoRelativo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  return `há ${d}d`
}

/** Iniciais de um nome completo */
function iniciais(nome: string) {
  return nome
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export function CardDetailDrawer({
  card: cardInicial,
  papelAtual,
  onClose,
  onCardUpdated,
}: CardDetailDrawerProps) {
  const [card, setCard] = useState(cardInicial)
  const [isPending, startTransition] = useTransition()

  // Campos dinâmicos
  const [camposPublicos, setCamposPublicos] = useState<Record<string, unknown> | null>(null)
  const [camposInternos, setCamposInternos] = useState<Record<string, unknown> | null>(null)
  const [camposFormulario, setCamposFormulario] = useState<CampoFormulario[]>([])
  const [loadingDetalhes, setLoadingDetalhes] = useState(true)

  // Comentários
  const [comentarios, setComentarios] = useState<Comentario[]>([])
  const [loadingComentarios, setLoadingComentarios] = useState(true)
  const [novoComentario, setNovoComentario] = useState('')
  const [comentarioVisivel, setComentarioVisivel] = useState(false) // false = interno
  const [pendingComentario, setPendingComentario] = useState(false)
  const [erroComentario, setErroComentario] = useState<string | null>(null)

  // Arquivos
  const [arquivos, setArquivos] = useState<ArquivoComUrl[]>([])
  const [loadingArquivos, setLoadingArquivos] = useState(true)
  const [arquivoPendente, setArquivoPendente] = useState<File | null>(null)
  const [tipoUpload, setTipoUpload] = useState<TipoArquivo>('referencia')
  const [uploadingArquivo, setUploadingArquivo] = useState(false)
  const [erroArquivo, setErroArquivo] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Metadados extras carregados via actionBuscarCardDetalhes
  const [rodadasRevisao, setRodadasRevisao] = useState(0)
  const [motivoCancelamento, setMotivoCancelamento] = useState<string | null>(null)
  const [marca, setMarca] = useState<{ id: string; nome: string } | null>(null)
  // Conferência técnica interna (tipos com fluxo_aprovacao_duplo, ex. Embalagens)
  const [fluxoDuplo, setFluxoDuplo] = useState(false)
  const [aprovadoInternamente, setAprovadoInternamente] = useState(false)
  const [pendingAprovacaoInterna, setPendingAprovacaoInterna] = useState(false)
  const [erroAprovacaoInterna, setErroAprovacaoInterna] = useState<string | null>(null)

  // IA — Pattern A
  const router = useRouter()
  const [agenteChave, setAgenteChave] = useState<string | null>(null)
  const [tipoSlug, setTipoSlug] = useState<string | null>(null)
  const [abrindoCronograma, setAbrindoCronograma] = useState(false)
  const [erroCronograma, setErroCronograma] = useState<string | null>(null)
  const [iaOutput, setIaOutput] = useState<string | null>(null)
  const [iaRunId, setIaRunId] = useState<string | null>(null)
  const [iaExecutando, setIaExecutando] = useState(false)
  const [iaErro, setIaErro] = useState<string | null>(null)
  const [iaCopiado, setIaCopiado] = useState(false)

  // Fecha o drawer com a tecla Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Duplicar card
  const [pendingDuplicar, setPendingDuplicar] = useState(false)

  async function handleDuplicar() {
    setPendingDuplicar(true)
    const result = await actionDuplicarCard(card.id)
    setPendingDuplicar(false)
    if (!result.error) {
      // O realtime do KanbanBoard detecta o INSERT e adiciona o card automaticamente
      onClose()
    }
  }

  // Cancelamento inline — motivo obrigatório
  const [cancelando, setCancelando] = useState(false)
  const [motivoCancelamentoInput, setMotivoCancelamentoInput] = useState('')
  const [erroCancelamento, setErroCancelamento] = useState<string | null>(null)
  const [erroStatus, setErroStatus] = useState<string | null>(null)
  const [pendingCancelamento, setPendingCancelamento] = useState(false)

  // Publicação em redes sociais
  const [temPublicacao, setTemPublicacao] = useState(false)
  const [publicacoes, setPublicacoes] = useState<PublicacaoAgendada[]>([])
  const [integracoes, setIntegracoes] = useState<IntegracaoSocial[]>([])
  const [loadingPublicacoes, setLoadingPublicacoes] = useState(false)
  const [mostrandoFormPublicacao, setMostrandoFormPublicacao] = useState(false)
  const [erroPublicacao, setErroPublicacao] = useState<string | null>(null)
  const [pendingPublicacao, setPendingPublicacao] = useState(false)
  const filePublicacaoRef = useRef<HTMLInputElement>(null)

  // Entrega programada — edição inline
  const [editandoEntrega, setEditandoEntrega] = useState(false)
  const [entregaInput, setEntregaInput] = useState(
    card.data_entrega_programada
      ? new Date(card.data_entrega_programada).toISOString().slice(0, 16)
      : '',
  )
  const [pendingEntrega, setPendingEntrega] = useState(false)
  const [erroEntrega, setErroEntrega] = useState<string | null>(null)

  // Enviar para aprovação
  const [pendingEnviarAprovacao, setPendingEnviarAprovacao] = useState(false)
  const [erroEnviarAprovacao, setErroEnviarAprovacao] = useState<string | null>(null)

  // Aprovação / reprovação (cliente ou equipe)
  const [mostrandoReprova, setMostrandoReprova] = useState(false)
  const [motivoReprova, setMotivoReprova] = useState('')
  const [pendingAprovacao, setPendingAprovacao] = useState(false)
  const [erroAprovacao, setErroAprovacao] = useState<string | null>(null)

  const ehEquipe = papelAtual !== 'cliente'

  // Busca campos dinâmicos
  useEffect(() => {
    let cancelled = false
    actionBuscarCardDetalhes(card.id).then((result) => {
      if (cancelled) return
      setLoadingDetalhes(false)
      if (!result.error) {
        setCamposPublicos(result.campos_publicos ?? {})
        setCamposInternos(result.campos_internos ?? null)
        setCamposFormulario(result.campos_formulario ?? [])
        setRodadasRevisao(result.rodadas_revisao ?? 0)
        setMotivoCancelamento(result.motivo_cancelamento ?? null)
        setAgenteChave(result.agente_chave ?? null)
        setTipoSlug(result.tipo_slug ?? null)
        setTemPublicacao(result.tem_publicacao ?? false)
        setMarca(result.marca ?? null)
        setFluxoDuplo(result.fluxo_aprovacao_duplo ?? false)
        setAprovadoInternamente(result.aprovado_internamente ?? false)
        // Se já tem output IA salvo em campos_internos, exibe
        const ia = (result.campos_internos as Record<string, unknown> | null)?.ia_output
        if (ia && typeof ia === 'string') setIaOutput(ia)
      }
    })
    return () => { cancelled = true }
  }, [card.id])

  // Busca comentários
  useEffect(() => {
    let cancelled = false
    actionBuscarComentarios(card.id).then((result) => {
      if (cancelled) return
      setLoadingComentarios(false)
      if (!result.error) setComentarios(result.comentarios ?? [])
    })
    return () => { cancelled = true }
  }, [card.id])

  // Busca arquivos
  useEffect(() => {
    let cancelled = false
    actionBuscarArquivos(card.id).then((result) => {
      if (cancelled) return
      setLoadingArquivos(false)
      if (!result.error) setArquivos(result.arquivos ?? [])
    })
    return () => { cancelled = true }
  }, [card.id])

  // Busca publicações (lazy — só quando temPublicacao for detectado)
  useEffect(() => {
    if (!temPublicacao || !ehEquipe) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingPublicacoes(true)
    Promise.all([
      buscarPublicacoes({ cardId: card.id }),
      buscarIntegracoesSociais(),
    ]).then(([pubs, integs]) => {
      if (cancelled) return
      setPublicacoes(pubs)
      setIntegracoes(integs.filter((i) => i.ativo))
      setLoadingPublicacoes(false)
    }).catch(() => setLoadingPublicacoes(false))
    return () => { cancelled = true }
  }, [card.id, temPublicacao, ehEquipe])

  function handleMoverStatus(novoStatus: StatusCard) {
    if (novoStatus === card.status) return
    // Cancelamento requer motivo — abre form inline em vez de mover direto
    if (novoStatus === 'cancelado') {
      setCancelando(true)
      return
    }
    // Os botões proibidos já vêm desabilitados; esta guarda cobre o caso de o
    // status do card mudar por Realtime entre o render e o clique.
    const bloqueio = motivoBloqueio(card.status, novoStatus)
    if (bloqueio) {
      setErroStatus(bloqueio)
      return
    }
    setErroStatus(null)

    const statusAnterior = card.status
    const cardAtualizado = { ...card, status: novoStatus }
    setCard(cardAtualizado)
    onCardUpdated(cardAtualizado)

    startTransition(async () => {
      const result = await actionMoverCard(card.id, novoStatus)
      if (result.error) {
        setCard((prev) => ({ ...prev, status: statusAnterior }))
        onCardUpdated({ ...card, status: statusAnterior })
        setErroStatus(result.error)
      }
    })
  }

  async function handleCancelarCard(e: React.FormEvent) {
    e.preventDefault()
    const motivo = motivoCancelamentoInput.trim()
    if (!motivo) return
    setErroCancelamento(null)
    setPendingCancelamento(true)

    const result = await actionCancelarCard(card.id, motivo)
    setPendingCancelamento(false)

    if (result.error) {
      setErroCancelamento(result.error)
    } else {
      const cardAtualizado = { ...card, status: 'cancelado' as StatusCard }
      setCard(cardAtualizado)
      onCardUpdated(cardAtualizado)
      setMotivoCancelamento(motivo)
      setCancelando(false)
      setMotivoCancelamentoInput('')
    }
  }

  async function handleAprovarInternamente() {
    setErroAprovacaoInterna(null)
    setPendingAprovacaoInterna(true)
    const result = await actionAprovarInternamente(card.id)
    setPendingAprovacaoInterna(false)
    if (result.error) setErroAprovacaoInterna(result.error)
    else setAprovadoInternamente(true)
  }

  async function handleEnviarParaAprovacao() {
    setErroEnviarAprovacao(null)
    setPendingEnviarAprovacao(true)

    const result = await actionEnviarParaAprovacao(card.id)
    setPendingEnviarAprovacao(false)

    if (result.error) {
      setErroEnviarAprovacao(result.error)
    } else {
      const cardAtualizado = { ...card, status: 'para_aprovacao' as StatusCard }
      setCard(cardAtualizado)
      onCardUpdated(cardAtualizado)
    }
  }

  async function handleAprovarCard() {
    setErroAprovacao(null)
    setPendingAprovacao(true)

    const result = await actionAprovarCard(card.id)
    setPendingAprovacao(false)

    if (result.error) {
      setErroAprovacao(result.error)
    } else {
      const cardAtualizado = { ...card, status: 'concluido' as StatusCard }
      setCard(cardAtualizado)
      onCardUpdated(cardAtualizado)
    }
  }

  async function handleReprovarCard(e: React.FormEvent) {
    e.preventDefault()
    const comentario = motivoReprova.trim()
    if (!comentario) return
    setErroAprovacao(null)
    setPendingAprovacao(true)

    const result = await actionReprovarCard(card.id, comentario)
    setPendingAprovacao(false)

    if (result.error) {
      setErroAprovacao(result.error)
    } else {
      const cardAtualizado = { ...card, status: 'necessita_ajustes' as StatusCard }
      setCard(cardAtualizado)
      onCardUpdated(cardAtualizado)
      setRodadasRevisao((prev) => prev + 1)
      // A conferência técnica vale por rodada: com a peça voltando para ajuste,
      // a próxima versão precisa ser conferida de novo antes de ir ao cliente.
      setAprovadoInternamente(false)
      setMostrandoReprova(false)
      setMotivoReprova('')
      // Recarrega comentários para exibir o feedback automático criado pelo servidor
      actionBuscarComentarios(card.id).then((r) => {
        if (!r.error) setComentarios(r.comentarios ?? [])
      })
    }
  }

  async function handleCriarComentario(e: React.FormEvent) {
    e.preventDefault()
    const texto = novoComentario.trim()
    if (!texto) return
    setErroComentario(null)
    setPendingComentario(true)

    const result = await actionCriarComentario(card.id, texto, comentarioVisivel)
    setPendingComentario(false)

    if (result.error) {
      setErroComentario(result.error)
    } else if (result.comentario) {
      setComentarios((prev) => [...prev, result.comentario!])
      setNovoComentario('')
    }
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setArquivoPendente(file)
    setErroArquivo(null)
    // Sugere tipo com base no status do card
    if (card.status === 'em_andamento') setTipoUpload('entrega')
    else if (card.status === 'necessita_ajustes') setTipoUpload('revisao')
    else setTipoUpload('referencia')
    // Reset para permitir selecionar o mesmo arquivo novamente
    e.target.value = ''
  }

  async function handleUploadArquivo() {
    if (!arquivoPendente) return
    setErroArquivo(null)
    setUploadingArquivo(true)

    const formData = new FormData()
    formData.append('arquivo', arquivoPendente)

    const result = await actionUploadArquivo(card.id, tipoUpload, formData)
    setUploadingArquivo(false)

    if (result.error) {
      setErroArquivo(result.error)
    } else if (result.arquivo) {
      setArquivos((prev) => [result.arquivo!, ...prev])
      setArquivoPendente(null)
    }
  }

  // Derived
  const prazoLabel = card.prazo_cliente
    ? new Date(card.prazo_cliente + 'T00:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null

  const isAtrasado =
    card.prazo_cliente &&
    new Date(card.prazo_cliente + 'T23:59:59') < new Date() &&
    card.status !== 'concluido' &&
    card.status !== 'cancelado'

  const criadoEm = new Date(card.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const entregaProgramadaLabel = card.data_entrega_programada
    ? new Date(card.data_entrega_programada).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null

  const podeAgendarEntrega = ['socia', 'gestao', 'atendimento'].includes(papelAtual)

  // SLA do card conforme status atual (mesmo cálculo do KanbanCard)
  const slaInfo = slaParaCard({
    status: card.status,
    created_at: card.created_at,
    sla_iniciado_em: card.sla_iniciado_em,
    tipo: card.tipo,
  })

  async function salvarEntregaProgramada() {
    setPendingEntrega(true)
    setErroEntrega(null)
    const result = await actionAgendarEntrega(card.id, entregaInput || null)
    if (result.error) {
      setErroEntrega(result.error)
    } else {
      const cardAtualizado = { ...card, data_entrega_programada: entregaInput || null }
      setCard(cardAtualizado)
      onCardUpdated(cardAtualizado)
      setEditandoEntrega(false)
    }
    setPendingEntrega(false)
  }

  const camposClienteForm = camposFormulario.filter((c) => c.visivel_para_cliente)
  const camposEquipeForm = camposFormulario.filter((c) => !c.visivel_para_cliente)
  const temCamposPublicos = camposClienteForm.length > 0 && camposPublicos
  const temCamposInternos = ehEquipe && camposEquipeForm.length > 0 && camposInternos

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal centralizado */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Detalhes da demanda: ${card.titulo}`}
        className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* Tira de identidade de marca no topo */}
        <div
          className="h-[3px] w-full flex-none"
          style={{ background: 'linear-gradient(90deg, #A046C6 0%, #F9267C 100%)' }}
        />

        {/* Header */}
        <div className="flex items-start gap-4 border-b border-zinc-100 px-6 py-5">
          <div className="min-w-0 flex-1">
            <div className="mb-2.5 flex flex-wrap items-center gap-2">
              <PriorityBadge prioridade={card.prioridade} size="sm" />
              {card.confidencial && (
                <span className="flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                  <Lock className="h-3 w-3" />
                  Confidencial
                </span>
              )}
            </div>
            <h2 className="text-base font-semibold leading-snug text-zinc-900">{card.titulo}</h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="inline-block rounded-full bg-brand-light px-2.5 py-0.5 text-xs font-medium text-brand">
                {card.cliente.nome}
              </span>
              {marca && (
                <span className="inline-block rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
                  {marca.nome}
                </span>
              )}
            </div>
          </div>
          {/* Duplicar card — equipe exceto executor */}
          {['socia', 'gestao', 'atendimento'].includes(papelAtual) && (
            <button
              onClick={handleDuplicar}
              disabled={pendingDuplicar}
              title="Duplicar card"
              className="mt-0.5 shrink-0 rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-50"
            >
              {pendingDuplicar
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <CopyPlus className="h-4 w-4" />
              }
            </button>
          )}
          <button
            onClick={onClose}
            className="mt-0.5 shrink-0 rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body com scroll */}
        <div className="flex-1 overflow-y-auto">

          {/* Fluxo: trilha de etapas + próximo passo */}
          <FluxoTrack cardId={card.id} />

          {/* Metadados */}
          <div className="divide-y divide-zinc-50 border-b border-zinc-100 px-6 py-2">
            <MetaRow icon={<Tag className="h-3.5 w-3.5" />} label="Tipo">
              {card.tipo.nome}
            </MetaRow>
            <MetaRow icon={<User className="h-3.5 w-3.5" />} label="Responsável">
              {card.responsavel ? (
                <span className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-light text-[9px] font-bold text-brand">
                    {iniciais(card.responsavel.nome)}
                  </span>
                  {card.responsavel.nome}
                </span>
              ) : (
                <span className="text-zinc-400">— não atribuído</span>
              )}
            </MetaRow>
            {prazoLabel && (
              <MetaRow icon={<Calendar className="h-3.5 w-3.5" />} label="Prazo">
                <span className={isAtrasado ? 'font-semibold text-red-600' : ''}>
                  {prazoLabel}
                  {isAtrasado && (
                    <span className="ml-1.5 rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-600">
                      Atrasado
                    </span>
                  )}
                </span>
              </MetaRow>
            )}

            {/* Entrega programada — visível a todos, editável pela equipe */}
            {(entregaProgramadaLabel || podeAgendarEntrega) && (
              <MetaRow icon={<Send className="h-3.5 w-3.5 text-emerald-500" />} label="Previsão de entrega">
                {editandoEntrega ? (
                  <div className="flex flex-col gap-1.5">
                    <input
                      type="datetime-local"
                      value={entregaInput}
                      onChange={(e) => setEntregaInput(e.target.value)}
                      disabled={pendingEntrega}
                      className="rounded-lg border border-zinc-300 px-2 py-1.5 text-xs outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 disabled:opacity-50"
                    />
                    {erroEntrega && (
                      <p className="text-[11px] text-red-500">{erroEntrega}</p>
                    )}
                    <div className="flex gap-1.5">
                      <button
                        onClick={salvarEntregaProgramada}
                        disabled={pendingEntrega}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {pendingEntrega ? 'Salvando…' : 'Salvar'}
                      </button>
                      <button
                        onClick={() => { setEditandoEntrega(false); setErroEntrega(null) }}
                        disabled={pendingEntrega}
                        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 transition hover:bg-zinc-50"
                      >
                        Cancelar
                      </button>
                      {entregaInput && (
                        <button
                          onClick={() => { setEntregaInput(''); salvarEntregaProgramada() }}
                          disabled={pendingEntrega}
                          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-red-500 transition hover:bg-red-50"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <span className="flex items-center gap-2">
                    {entregaProgramadaLabel ? (
                      <span className="font-medium text-emerald-700">{entregaProgramadaLabel}</span>
                    ) : (
                      <span className="text-zinc-400">— não agendada</span>
                    )}
                    {podeAgendarEntrega && (
                      <button
                        onClick={() => setEditandoEntrega(true)}
                        className="rounded px-1.5 py-0.5 text-[10px] text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition"
                      >
                        {entregaProgramadaLabel ? 'editar' : 'agendar'}
                      </button>
                    )}
                  </span>
                )}
              </MetaRow>
            )}

            <MetaRow icon={<Clock className="h-3.5 w-3.5" />} label="Criado em">
              {criadoEm}
            </MetaRow>
            {slaInfo && (
              <MetaRow icon={<Timer className="h-3.5 w-3.5" />} label="SLA">
                <span className="flex flex-col gap-1.5">
                  <span className={`flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${slaChipClass(slaInfo.status)}`}>
                    <Timer className="h-3 w-3" />
                    {slaLabel(slaInfo)}
                  </span>
                  <span className="text-[11px] text-zinc-400">{slaDescricao(slaInfo)}</span>
                  <span className="h-1.5 w-40 overflow-hidden rounded-full bg-zinc-100">
                    <span
                      className={`block h-full rounded-full ${
                        slaInfo.status === 'violado'
                          ? 'bg-red-500'
                          : slaInfo.status === 'atencao'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.round(slaInfo.percentual * 100)}%` }}
                    />
                  </span>
                </span>
              </MetaRow>
            )}
            {rodadasRevisao > 0 && (
              <MetaRow icon={<RotateCcw className="h-3.5 w-3.5" />} label="Revisões">
                <span className="font-medium text-amber-600">
                  {rodadasRevisao} rodada{rodadasRevisao !== 1 ? 's' : ''}
                </span>
              </MetaRow>
            )}
          </div>

          {/* Status */}
          <div className="border-b border-zinc-100 px-6 py-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Status
            </p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {ORDEM_STATUS.map((s) => {
                const config = STATUS_CONFIG[s]
                const isAtivo = card.status === s
                // `cancelado` continua clicável: o botão abre o formulário de
                // motivo, que é justamente a ação dedicada exigida pela regra.
                const bloqueio =
                  s === 'cancelado' ? null : motivoBloqueio(card.status, s)
                const desabilitado = isPending || !ehEquipe || (!isAtivo && bloqueio !== null)
                return (
                  <button
                    key={s}
                    onClick={() => ehEquipe && handleMoverStatus(s)}
                    disabled={desabilitado}
                    aria-current={isAtivo ? 'true' : undefined}
                    title={!isAtivo && bloqueio ? bloqueio : undefined}
                    className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                      isAtivo
                        ? `${config.className} ring-2 ring-offset-1 ring-brand/25`
                        : `${config.className} opacity-50 hover:opacity-100`
                    } disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:opacity-25`}
                  >
                    {config.label}
                  </button>
                )
              })}
            </div>
            {isPending && (
              <p className="mt-2 text-xs text-zinc-400">Atualizando…</p>
            )}

            {erroStatus && <InlineError className="mt-2">{erroStatus}</InlineError>}

            {/* Cancelamento inline — motivo obrigatório */}
            {cancelando && (
              <form onSubmit={handleCancelarCard} className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3">
                <p className="mb-2 text-xs font-medium text-red-700">Motivo do cancelamento</p>
                <textarea
                  value={motivoCancelamentoInput}
                  onChange={(e) => setMotivoCancelamentoInput(e.target.value)}
                  placeholder="Descreva o motivo…"
                  rows={2}
                  disabled={pendingCancelamento}
                  className="w-full resize-none rounded-lg border border-red-200 bg-white px-3 py-2 text-xs outline-none focus:border-red-400 focus:ring-1 focus:ring-red-100 disabled:opacity-50"
                />
                {erroCancelamento && (
                  <p className="mt-1 text-[11px] text-red-600">{erroCancelamento}</p>
                )}
                <div className="mt-2 flex gap-2">
                  <button
                    type="submit"
                    disabled={!motivoCancelamentoInput.trim() || pendingCancelamento}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {pendingCancelamento ? 'Cancelando…' : 'Confirmar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCancelando(false); setMotivoCancelamentoInput(''); setErroCancelamento(null) }}
                    disabled={pendingCancelamento}
                    className="rounded-lg px-3 py-1.5 text-xs text-zinc-500 transition hover:bg-red-100 disabled:opacity-50"
                  >
                    Desistir
                  </button>
                </div>
              </form>
            )}

            {/* Motivo do cancelamento */}
            {card.status === 'cancelado' && motivoCancelamento && (
              <div className="mt-3 rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                  Motivo
                </p>
                <p className="text-xs text-zinc-600">{motivoCancelamento}</p>
              </div>
            )}

            {/* Conferência técnica interna — tipos com fluxo_aprovacao_duplo.
                A peça passa pela equipe antes de chegar ao cliente; se o
                cliente pedir ajustes, a rodada seguinte confere de novo. */}
            {(card.status === 'em_andamento' || card.status === 'necessita_ajustes') &&
              fluxoDuplo && ehEquipe && (
              <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs font-medium text-zinc-700">
                  Aprovação técnica interna
                </p>
                {aprovadoInternamente ? (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-green-700">
                    <CheckCircle2 className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
                    Conferida nesta rodada — pode seguir para o cliente.
                  </p>
                ) : (
                  <>
                    <p className="mt-1 text-xs text-zinc-500">
                      Este tipo de demanda precisa de conferência da equipe antes de ir ao
                      cliente.
                    </p>
                    {(papelAtual === 'socia' || papelAtual === 'gestao') ? (
                      <button
                        onClick={handleAprovarInternamente}
                        disabled={pendingAprovacaoInterna}
                        className="mt-2 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50"
                      >
                        {pendingAprovacaoInterna ? 'Registrando…' : 'Aprovar tecnicamente'}
                      </button>
                    ) : (
                      <p className="mt-2 text-xs text-zinc-400">
                        Peça a revisão de uma sócia ou da gestão.
                      </p>
                    )}
                    {erroAprovacaoInterna && (
                      <InlineError className="mt-1.5">{erroAprovacaoInterna}</InlineError>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Botão "Enviar para aprovação" — equipe (não executor) com entrega anexada */}
            {(card.status === 'em_andamento' || card.status === 'necessita_ajustes') &&
              ehEquipe && papelAtual !== 'executor' &&
              arquivos.some((a) => a.tipo === 'entrega' || a.tipo === 'revisao') && (
              <div className="mt-3">
                <button
                  onClick={handleEnviarParaAprovacao}
                  disabled={pendingEnviarAprovacao || (fluxoDuplo && !aprovadoInternamente)}
                  title={
                    fluxoDuplo && !aprovadoInternamente
                      ? 'Falta a aprovação técnica interna desta rodada.'
                      : undefined
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {pendingEnviarAprovacao ? 'Enviando…' : 'Enviar para aprovação'}
                </button>
                {erroEnviarAprovacao && (
                  <p className="mt-1.5 text-xs text-red-600">{erroEnviarAprovacao}</p>
                )}
              </div>
            )}
          </div>

          {/* Aprovação — visível quando card está em para_aprovacao */}
          {card.status === 'para_aprovacao' && (
            <div className="border-b border-zinc-100 px-6 py-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Aprovação
              </p>

              {ehEquipe ? (
                /* Equipe: aguardando resposta */
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
                  <p className="text-sm font-semibold text-amber-800">
                    Aguardando resposta do cliente
                  </p>
                  <p className="mt-1 text-xs text-amber-600">
                    O arquivo foi enviado. O status atualiza automaticamente após a aprovação.
                  </p>
                </div>
              ) : loadingArquivos ? (
                <p className="text-center text-xs text-zinc-400">Carregando…</p>
              ) : (
                /* Cliente: preview do arquivo + botões de aprovação/reprovação */
                <>
                  {/* Preview da entrega mais recente */}
                  {(() => {
                    const ultimaEntrega = arquivos.find(
                      (a) => a.tipo === 'entrega' || a.tipo === 'revisao',
                    )
                    if (!ultimaEntrega?.url_assinada) return null
                    return (
                      <div className="mb-4 overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50">
                        {ultimaEntrega.mime_type.startsWith('image/') ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={ultimaEntrega.url_assinada}
                            alt={ultimaEntrega.nome_arquivo}
                            className="max-h-56 w-full object-contain"
                          />
                        ) : ultimaEntrega.mime_type.startsWith('video/') ? (
                          <video
                            src={ultimaEntrega.url_assinada}
                            controls
                            className="h-48 w-full bg-black"
                          />
                        ) : ultimaEntrega.mime_type === 'application/pdf' ? (
                          <iframe
                            src={ultimaEntrega.url_assinada}
                            title={ultimaEntrega.nome_arquivo}
                            className="h-64 w-full border-0"
                          />
                        ) : (
                          <div className="flex items-center gap-3 p-3">
                            <FileIconComp mimeType={ultimaEntrega.mime_type} className="h-8 w-8" />
                            <div>
                              <p className="text-sm font-medium text-zinc-800">
                                {ultimaEntrega.nome_arquivo}
                              </p>
                              <a
                                href={ultimaEntrega.url_assinada}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-brand hover:underline"
                              >
                                Abrir arquivo
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {!mostrandoReprova ? (
                    <>
                      {erroAprovacao && (
                        <p className="mb-2 text-xs text-red-600">{erroAprovacao}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={handleAprovarCard}
                          disabled={pendingAprovacao}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {pendingAprovacao ? 'Processando…' : 'Aprovar'}
                        </button>
                        <button
                          onClick={() => setMostrandoReprova(true)}
                          disabled={pendingAprovacao}
                          className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                        >
                          Solicitar ajustes
                        </button>
                      </div>
                    </>
                  ) : (
                    <form onSubmit={handleReprovarCard} className="space-y-2">
                      <p className="text-xs font-medium text-zinc-700">
                        O que precisa ser ajustado?
                      </p>
                      <textarea
                        value={motivoReprova}
                        onChange={(e) => setMotivoReprova(e.target.value)}
                        placeholder="Descreva os ajustes necessários…"
                        rows={3}
                        disabled={pendingAprovacao}
                        className="w-full resize-none rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/10 disabled:opacity-50"
                      />
                      {erroAprovacao && (
                        <p className="text-xs text-red-600">{erroAprovacao}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={!motivoReprova.trim() || pendingAprovacao}
                          className="flex-1 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {pendingAprovacao ? 'Enviando…' : 'Enviar feedback'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMostrandoReprova(false)
                            setMotivoReprova('')
                            setErroAprovacao(null)
                          }}
                          disabled={pendingAprovacao}
                          className="rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-500 transition hover:bg-zinc-50"
                        >
                          Voltar
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          )}

          {/* Arquivos */}
          <div className="border-b border-zinc-100 px-6 py-5">
            {/* Cabeçalho da seção */}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Arquivos
              </p>
              {ehEquipe && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,video/*,application/pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip"
                    onChange={handleFileSelected}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingArquivo}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-500 transition hover:border-brand/40 hover:text-brand disabled:opacity-50"
                  >
                    <Paperclip className="h-3 w-3" />
                    Anexar
                  </button>
                </>
              )}
            </div>

            {/* Preview do arquivo selecionado (antes de enviar) */}
            {arquivoPendente && (
              <div className="mb-3 rounded-xl border border-brand/20 bg-brand-light/30 p-3">
                <div className="flex items-start gap-2">
                  <FileIconComp mimeType={arquivoPendente.type} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-zinc-800">
                      {arquivoPendente.name}
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      {formatBytes(arquivoPendente.size)}
                    </p>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center gap-2">
                  <select
                    value={tipoUpload}
                    onChange={(e) => setTipoUpload(e.target.value as TipoArquivo)}
                    className="flex-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-700 outline-none focus:border-brand/40 focus:ring-1 focus:ring-brand/10"
                  >
                    <option value="referencia">Referência</option>
                    <option value="entrega">Entrega</option>
                    <option value="revisao">Revisão</option>
                  </select>
                  <button
                    onClick={handleUploadArquivo}
                    disabled={uploadingArquivo}
                    className="rounded-lg bg-gradient-brand px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                  >
                    {uploadingArquivo ? 'Enviando…' : 'Enviar'}
                  </button>
                  <button
                    onClick={() => { setArquivoPendente(null); setErroArquivo(null) }}
                    disabled={uploadingArquivo}
                    className="text-xs text-zinc-400 transition hover:text-zinc-600 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
                {erroArquivo && (
                  <p className="mt-1.5 text-xs text-red-600">{erroArquivo}</p>
                )}
              </div>
            )}

            {/* Lista de arquivos */}
            {loadingArquivos ? (
              <SkeletonLines lines={2} />
            ) : arquivos.length === 0 && !arquivoPendente ? (
              <p className="text-center text-sm text-zinc-400">
                <span className="font-medium text-brand">Izzi</span>
                {' · '}
                Nenhum arquivo anexado ainda.
              </p>
            ) : (
              <div className="space-y-2">
                {arquivos.map((arq) => (
                  <ArquivoItem key={arq.id} arquivo={arq} />
                ))}
              </div>
            )}
          </div>

          {/* Calendário Editorial é o gatilho do cronograma: em vez de gerar um
              texto no card (agente antigo), abre o fluxo de cronograma da marca. */}
          {ehEquipe && tipoSlug === SLUG_DEMANDA_CRONOGRAMA && (
            <div className="border-b border-zinc-100 px-6 py-5">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Cronograma
              </p>
              <p className="mb-3 text-xs text-zinc-500">
                Esta demanda abre o fluxo de cronograma da marca — briefing, calendário,
                revisão e desmembramento em cards.
              </p>
              <button
                onClick={async () => {
                  setErroCronograma(null)
                  setAbrindoCronograma(true)
                  const res = await abrirCronogramaDoCard(card.id)
                  setAbrindoCronograma(false)
                  if (res.error) setErroCronograma(res.error)
                  else if (res.id) router.push(`/cronogramas/${res.id}`)
                }}
                disabled={abrindoCronograma}
                className="flex items-center gap-1.5 rounded-lg bg-gradient-brand px-3.5 py-2 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {abrindoCronograma ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" />Abrindo…</>
                ) : (
                  <><Calendar className="h-3.5 w-3.5" />Abrir cronograma</>
                )}
              </button>
              {erroCronograma && <InlineError className="mt-2">{erroCronograma}</InlineError>}
            </div>
          )}

          {/* IA — Pattern A: exibe se o tipo tem agente e NÃO é o Calendário
              Editorial (esse roteia para o cronograma, acima). */}
          {ehEquipe && agenteChave && tipoSlug !== SLUG_DEMANDA_CRONOGRAMA && (
            <div className="border-b border-zinc-100 px-6 py-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Inteligência IA
                </p>
                <button
                  onClick={async () => {
                    setIaErro(null)
                    setIaRunId(null)
                    setIaExecutando(true)
                    // Os campos do formulário do card (tema, mês de referência,
                    // temas prioritários…) vão como input do agente. Antes a
                    // chamada omitia este argumento e o executor recebia {} —
                    // o agente trabalhava só com o contexto de marca, ignorando
                    // tudo que a equipe tinha preenchido no card.
                    const res = await actionTriggerAgenteCard(card.id, agenteChave, camposPublicos ?? {})
                    setIaExecutando(false)
                    if (res.error) setIaErro(res.error)
                    else {
                      setIaOutput(res.output ?? '')
                      setIaRunId(res.runId ?? null)
                    }
                  }}
                  disabled={iaExecutando}
                  className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-xs font-medium text-violet-700 transition hover:bg-violet-100 disabled:opacity-60"
                >
                  {iaExecutando ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" />Executando…</>
                  ) : (
                    <><Sparkles className="h-3.5 w-3.5" />{iaOutput ? 'Regerar' : 'Gerar com IA'}</>
                  )}
                </button>
              </div>

              {iaErro && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{iaErro}</p>
              )}

              {iaOutput && (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-violet-100 bg-violet-50/50">
                    <div className="flex items-center justify-between border-b border-violet-100 px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3 text-violet-500" />
                        <span className="text-[11px] font-medium text-violet-700">Output gerado pela IA</span>
                      </div>
                      <button
                        onClick={async () => {
                          await navigator.clipboard.writeText(iaOutput)
                          setIaCopiado(true)
                          setTimeout(() => setIaCopiado(false), 2000)
                        }}
                        className="flex items-center gap-1 text-[11px] text-violet-500 hover:text-violet-700"
                      >
                        {iaCopiado ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {iaCopiado ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                    <div className="max-h-56 overflow-y-auto p-3">
                      <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-zinc-700">
                        {iaOutput}
                      </pre>
                    </div>
                  </div>
                  {/* Feedback — Sprint 3.3 */}
                  {iaRunId && <FeedbackButtons runId={iaRunId} />}
                </div>
              )}

              {!iaOutput && !iaErro && !iaExecutando && (
                <p className="text-center text-xs text-zinc-400">
                  Clique em &quot;Gerar com IA&quot; para criar o conteúdo automaticamente.
                </p>
              )}
            </div>
          )}

          {/* Publicação em Redes Sociais — só para equipe, quando tipo_demanda.tem_publicacao */}
          {ehEquipe && temPublicacao && (
            <div className="border-b border-zinc-100 px-6 py-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Publicação Social
                </p>
                {integracoes.length > 0 && (
                  <button
                    onClick={() => setMostrandoFormPublicacao((v) => !v)}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-500 transition hover:border-brand/40 hover:text-brand"
                  >
                    <Plus className="h-3 w-3" />
                    Agendar
                  </button>
                )}
              </div>

              {loadingPublicacoes ? (
                <p className="text-center text-xs text-zinc-400">Carregando…</p>
              ) : integracoes.length === 0 ? (
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 text-center">
                  <Share2 className="mx-auto mb-2 h-6 w-6 text-zinc-300" />
                  <p className="text-xs text-zinc-500">
                    Nenhuma rede social conectada.{' '}
                    <a href="/perfil" className="text-brand hover:underline">
                      Conectar agora
                    </a>
                  </p>
                </div>
              ) : (
                <>
                  {/* Formulário de nova publicação */}
                  {mostrandoFormPublicacao && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault()
                        setErroPublicacao(null)
                        setPendingPublicacao(true)
                        const fd = new FormData(e.currentTarget)
                        fd.set('card_id', card.id)
                        try {
                          await actionCriarPublicacao(fd)
                          const updated = await buscarPublicacoes({ cardId: card.id })
                          setPublicacoes(updated)
                          setMostrandoFormPublicacao(false)
                        } catch (err) {
                          setErroPublicacao(err instanceof Error ? err.message : 'Erro ao agendar')
                        } finally {
                          setPendingPublicacao(false)
                        }
                      }}
                      className="mb-4 space-y-2.5 rounded-xl border border-zinc-200 bg-zinc-50 p-3"
                    >
                      <div>
                        <label className="mb-1 block text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
                          Plataforma
                        </label>
                        <select
                          name="integracao_social_id"
                          required
                          onChange={(e) => {
                            const integ = integracoes.find((i) => i.id === e.target.value)
                            const platInput = e.target.form?.querySelector<HTMLInputElement>('[name=plataforma]')
                            if (platInput && integ) platInput.value = integ.plataforma
                          }}
                          className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-brand/40 focus:ring-1 focus:ring-brand/10"
                        >
                          <option value="">Selecionar…</option>
                          {integracoes.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.plataforma === 'linkedin' ? 'LinkedIn' : i.plataforma === 'facebook' ? 'Facebook' : 'Instagram'}{i.page_nome ? ` — ${i.page_nome}` : ''}
                            </option>
                          ))}
                        </select>
                        <input type="hidden" name="plataforma" defaultValue="" />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
                          Tipo de conteúdo
                        </label>
                        <select
                          name="tipo_conteudo"
                          required
                          className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-brand/40 focus:ring-1 focus:ring-brand/10"
                        >
                          <option value="feed">Feed</option>
                          <option value="carrossel">Carrossel</option>
                          <option value="reel">Reel</option>
                          <option value="story">Story</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
                          Legenda
                        </label>
                        <textarea
                          name="legenda"
                          required
                          rows={3}
                          placeholder="Escreva a legenda…"
                          disabled={pendingPublicacao}
                          className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-brand/40 focus:ring-1 focus:ring-brand/10 disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
                          Hashtags (opcional)
                        </label>
                        <input
                          name="hashtags"
                          type="text"
                          placeholder="#exemplo #conteudo"
                          disabled={pendingPublicacao}
                          className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-brand/40 focus:ring-1 focus:ring-brand/10 disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
                          Data de publicação
                        </label>
                        <input
                          name="data_agendada"
                          type="datetime-local"
                          required
                          disabled={pendingPublicacao}
                          className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-brand/40 focus:ring-1 focus:ring-brand/10 disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
                          Arquivo de mídia (opcional)
                        </label>
                        <input
                          ref={filePublicacaoRef}
                          name="arquivo"
                          type="file"
                          accept="image/*,video/*"
                          disabled={pendingPublicacao}
                          className="w-full text-xs text-zinc-500 file:mr-2 file:rounded file:border-0 file:bg-zinc-100 file:px-2 file:py-1 file:text-xs file:font-medium file:text-zinc-600"
                        />
                      </div>
                      {erroPublicacao && (
                        <p className="text-xs text-red-600">{erroPublicacao}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={pendingPublicacao}
                          className="flex-1 rounded-lg bg-gradient-brand px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                        >
                          {pendingPublicacao ? 'Agendando…' : 'Agendar publicação'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setMostrandoFormPublicacao(false); setErroPublicacao(null) }}
                          disabled={pendingPublicacao}
                          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-100 disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Lista de publicações existentes */}
                  {publicacoes.length === 0 && !mostrandoFormPublicacao ? (
                    <p className="text-center text-xs text-zinc-400">
                      Nenhuma publicação agendada para este card.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {publicacoes.map((pub) => (
                        <PublicacaoItem key={pub.id} pub={pub} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Comentários */}
          <div className="border-b border-zinc-100 px-6 py-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Comentários
            </p>

            {/* Lista */}
            {loadingComentarios ? (
              <SkeletonLines lines={3} className="mb-4" />
            ) : comentarios.length === 0 ? (
              <p className="mb-4 text-center text-sm text-zinc-400">
                <span className="font-medium text-brand">Izzi</span>
                {' · '}
                Nenhum comentário ainda.
              </p>
            ) : (
              <div className="mb-4 space-y-4">
                {comentarios.map((c) => (
                  <ComentarioItem
                    key={c.id}
                    comentario={c}
                    ehEquipe={ehEquipe}
                  />
                ))}
              </div>
            )}

            {/* Formulário de novo comentário */}
            <form onSubmit={handleCriarComentario} className="space-y-2">
              <textarea
                value={novoComentario}
                onChange={(e) => setNovoComentario(e.target.value)}
                placeholder="Adicionar comentário…"
                rows={2}
                disabled={pendingComentario}
                onKeyDown={(e) => {
                  // Ctrl/Cmd + Enter submete
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault()
                    if (novoComentario.trim()) handleCriarComentario(e as unknown as React.FormEvent)
                  }
                }}
                className="w-full resize-none rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/10 disabled:opacity-50"
              />
              {erroComentario && (
                <p className="text-xs text-red-600">{erroComentario}</p>
              )}
              <div className="flex items-center justify-between gap-2">
                {/* Toggle interno (equipe não-executor) */}
                {ehEquipe && papelAtual !== 'executor' ? (
                  <label className="flex cursor-pointer items-center gap-2">
                    <div
                      onClick={() => setComentarioVisivel(!comentarioVisivel)}
                      className={`relative h-4 w-7 flex-none cursor-pointer rounded-full transition-colors ${
                        comentarioVisivel ? 'bg-brand' : 'bg-zinc-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${
                          comentarioVisivel ? 'translate-x-3' : 'translate-x-0.5'
                        }`}
                      />
                    </div>
                    <span className="text-xs text-zinc-500">
                      {comentarioVisivel ? 'Visível ao cliente' : 'Apenas interno'}
                    </span>
                  </label>
                ) : (
                  <span className="text-xs text-zinc-400">
                    {papelAtual === 'executor' ? 'Sempre interno' : ''}
                  </span>
                )}

                <button
                  type="submit"
                  disabled={!novoComentario.trim() || pendingComentario}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-brand px-3.5 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="h-3 w-3" />
                  {pendingComentario ? 'Enviando…' : 'Comentar'}
                </button>
              </div>
              <p className="text-[10px] text-zinc-400">
                Ctrl+Enter para enviar rapidamente
              </p>
            </form>
          </div>

          {/* Campos dinâmicos */}
          {loadingDetalhes ? (
            <div className="px-6 py-6">
              <SkeletonLines lines={4} />
            </div>
          ) : (
            <>
              {temCamposPublicos && (
                <div className="border-b border-zinc-100 px-6 py-5">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Informações da demanda
                  </p>
                  <div className="space-y-3">
                    {camposClienteForm.map((campo) => (
                      <CampoValor
                        key={campo.nome}
                        rotulo={campo.rotulo ?? campo.nome}
                        valor={String(camposPublicos![campo.nome] ?? '')}
                      />
                    ))}
                  </div>
                </div>
              )}

              {temCamposInternos && (
                <div className="px-6 py-5">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Informações internas
                  </p>
                  <div className="space-y-3">
                    {camposEquipeForm.map((campo) => (
                      <CampoValor
                        key={campo.nome}
                        rotulo={campo.rotulo ?? campo.nome}
                        valor={String(camposInternos![campo.nome] ?? '')}
                      />
                    ))}
                  </div>
                </div>
              )}

              {!temCamposPublicos && !temCamposInternos && (
                <div className="px-6 py-8 text-center">
                  <p className="text-sm text-zinc-400">
                    <span className="font-medium text-brand">Izzi</span>
                    {' · '}
                    Nenhum campo adicional para este tipo de demanda.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-100 px-6 py-3">
          <p className="text-center text-xs text-zinc-400">
            <span className="font-mono">{card.id.slice(0, 8)}…</span>
          </p>
        </div>
      </aside>
    </>
  )
}

// ---------------------------------------------------------------------------
// Subcomponentes
// ---------------------------------------------------------------------------

function ComentarioItem({
  comentario,
  ehEquipe,
}: {
  comentario: Comentario
  ehEquipe: boolean
}) {
  return (
    <div className="flex gap-3">
      {/* Avatar do autor */}
      <div
        className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-[10px] font-bold"
        style={
          comentario.autor?.papel === 'cliente'
            ? { background: '#E5E7EB', color: '#6B7280' }
            : { background: 'linear-gradient(135deg, #F3E8FF 0%, #FFF0F7 100%)', color: '#A046C6' }
        }
      >
        {iniciais(comentario.autor?.nome ?? '?')}
      </div>

      <div className="flex-1 min-w-0">
        {/* Cabeçalho do comentário */}
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-xs font-semibold text-zinc-900">
            {(comentario.autor?.nome ?? 'Usuário').split(' ')[0]}
          </span>
          <span className="text-[10px] text-zinc-400">
            {tempoRelativo(comentario.created_at)}
          </span>
          {/* Badge de visibilidade — só para equipe */}
          {ehEquipe && !comentario.visivel_para_cliente && (
            <span className="rounded-full bg-zinc-100 px-1.5 py-px text-[9px] font-medium text-zinc-500">
              Interno
            </span>
          )}
          {ehEquipe && comentario.visivel_para_cliente && (
            <span className="rounded-full bg-brand-light px-1.5 py-px text-[9px] font-medium text-brand">
              Visível ao cliente
            </span>
          )}
        </div>
        {/* Texto */}
        <p className="mt-0.5 text-sm leading-relaxed text-zinc-700 whitespace-pre-wrap break-words">
          {comentario.texto}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Utilitários de arquivo
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileIconComp({ mimeType, className = 'h-4 w-4' }: { mimeType: string; className?: string }) {
  if (mimeType.startsWith('image/'))
    return <FileImage className={`${className} text-violet-500`} />
  if (mimeType.startsWith('video/'))
    return <Film className={`${className} text-blue-500`} />
  if (mimeType === 'application/pdf')
    return <FileText className={`${className} text-red-500`} />
  if (mimeType.includes('zip') || mimeType.includes('rar'))
    return <Archive className={`${className} text-amber-500`} />
  if (mimeType.includes('word') || mimeType.includes('powerpoint') || mimeType.includes('excel'))
    return <FileText className={`${className} text-blue-600`} />
  return <File className={`${className} text-zinc-400`} />
}

function ArquivoItem({ arquivo }: { arquivo: ArquivoComUrl }) {
  const versaoLabel = arquivo.tipo !== 'referencia' && arquivo.versao != null
    ? `v${arquivo.versao}`
    : null

  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2.5">
      {/* Ícone */}
      <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-white shadow-sm">
        <FileIconComp mimeType={arquivo.mime_type} />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-zinc-800">{arquivo.nome_arquivo}</p>
        <p className="mt-0.5 text-[10px] text-zinc-400">
          {arquivo.uploader?.nome.split(' ')[0]}
          {' · '}
          {formatBytes(arquivo.tamanho_bytes)}
          {' · '}
          {tempoRelativo(arquivo.created_at)}
        </p>
      </div>

      {/* Badges + download */}
      <div className="flex flex-none items-center gap-1.5">
        {versaoLabel && (
          <span className="rounded-full bg-zinc-100 px-2 py-px text-[10px] font-medium text-zinc-500">
            {versaoLabel}
          </span>
        )}
        {arquivo.tipo === 'referencia' && (
          <span className="rounded-full bg-brand-light px-2 py-px text-[10px] font-medium text-brand">
            Ref
          </span>
        )}
        {arquivo.url_assinada && (
          <a
            href={arquivo.url_assinada}
            target="_blank"
            rel="noopener noreferrer"
            title="Baixar arquivo"
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-200 hover:text-zinc-700"
          >
            <Download className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  )
}

function PublicacaoItem({ pub }: { pub: PublicacaoAgendada }) {
  const STATUS_CORES: Record<string, string> = {
    rascunho:  'bg-zinc-100 text-zinc-500',
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

  return (
    <div className="flex items-start gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2.5">
      <Share2 className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-700">
            {PLAT_LABEL[pub.plataforma] ?? pub.plataforma}
          </span>
          <span className="text-[10px] text-zinc-400">{pub.tipo_conteudo}</span>
          <span className={`rounded-full px-2 py-px text-[10px] font-medium ${STATUS_CORES[pub.status] ?? 'bg-zinc-100 text-zinc-500'}`}>
            {pub.status}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-zinc-500">{pub.legenda}</p>
        <p className="mt-0.5 text-[10px] text-zinc-400">
          {new Date(pub.data_agendada).toLocaleString('pt-BR', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
          })}
          {pub.plataforma_post_id && (
            <>
              {' · '}
              <a
                href={`https://www.facebook.com/${pub.plataforma_post_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-brand hover:underline"
              >
                Ver post <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </>
          )}
        </p>
      </div>
    </div>
  )
}

function MetaRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="flex w-28 shrink-0 items-center gap-1.5 text-xs text-zinc-400">
        {icon}
        {label}
      </span>
      <span className="text-sm text-zinc-800">{children}</span>
    </div>
  )
}

function CampoValor({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-400">{rotulo}</p>
      <p className="mt-0.5 text-sm text-zinc-800">
        {valor.trim() ? valor : <span className="text-zinc-400">—</span>}
      </p>
    </div>
  )
}
