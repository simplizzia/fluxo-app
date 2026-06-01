'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sparkles, CheckCircle2, Circle, Kanban,
  Save, Loader2, ChevronDown, X, Lock, LockOpen, Trash2,
  Mic, Copy, Link2, AlertTriangle, ExternalLink,
} from 'lucide-react'
import type { Reuniao, ActionItem } from '../actions'
import {
  actionSalvarNotas, actionGerarResumo,
  actionConverterItemEmCard, actionConfirmarActionItem,
  actionToggleConfidencial, actionExcluirReuniao,
  actionUploadAudio, actionImportarMeetNotes, actionSalvarMeetSpaceId,
} from '../actions'
import type { PapelUsuario } from '@/types/database'

interface Props {
  reuniao: Reuniao
  actionItems: ActionItem[]
  clientes: { id: string; nome: string }[]
  tiposDemanda: { id: string; nome: string; categoria: string }[]
  papel: PapelUsuario
}

// ---------------------------------------------------------------------------
// Aba Notas
// ---------------------------------------------------------------------------
function AbaNotas({ reuniao }: { reuniao: Reuniao }) {
  const [notas, setNotas] = useState(reuniao.notas_brutas ?? '')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  async function salvar() {
    setSalvando(true)
    try {
      await actionSalvarNotas(reuniao.id, notas)
      setSalvo(true)
      setTimeout(() => setSalvo(false), 2000)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-3">
      <textarea
        value={notas}
        onChange={(e) => { setNotas(e.target.value); setSalvo(false) }}
        rows={14}
        placeholder="Cole ou escreva as notas brutas da reunião aqui. Pode ser qualquer formato — pauta, tópicos discutidos, decisões, dúvidas, etc."
        className="input-form resize-none text-sm w-full"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={salvar}
          disabled={salvando}
          className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 transition disabled:opacity-60"
        >
          {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {salvo ? 'Salvo!' : salvando ? 'Salvando...' : 'Salvar Notas'}
        </button>
        <p className="text-[10px] text-zinc-400">
          Após salvar, vá para a aba &quot;Resumo IA&quot; para gerar o resumo.
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Aba Resumo IA
// ---------------------------------------------------------------------------
function AbaResumo({ reuniao, onGerou }: { reuniao: Reuniao; onGerou: () => void }) {
  const [resumo, setResumo] = useState(reuniao.resumo_gerado ?? '')
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function gerar() {
    if (!reuniao.notas_brutas) {
      setErro('Adicione notas brutas antes de gerar o resumo.')
      return
    }
    setGerando(true)
    setErro(null)
    try {
      const result = await actionGerarResumo(reuniao.id)
      setResumo(result.resumo)
      onGerou()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao gerar resumo')
    } finally {
      setGerando(false)
    }
  }

  return (
    <div className="space-y-4">
      {resumo ? (
        <div className="rounded-2xl bg-violet-50 border border-violet-100 p-5">
          <p className="text-xs font-semibold text-violet-600 mb-3 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Resumo gerado pela Izzi
          </p>
          <div className="text-sm text-zinc-700 leading-relaxed space-y-1.5 whitespace-pre-line">
            {resumo}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-zinc-200 p-8 text-center">
          <Sparkles className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
          <p className="text-sm text-zinc-500 font-medium">Nenhum resumo gerado ainda.</p>
          <p className="text-xs text-zinc-400 mt-1">
            {reuniao.notas_brutas
              ? 'Clique em "Gerar Resumo" para analisar as notas.'
              : 'Adicione notas brutas na aba anterior primeiro.'}
          </p>
        </div>
      )}

      {erro && (
        <p className="text-xs text-red-500 bg-red-50 rounded-xl px-4 py-2.5 border border-red-200">
          {erro}
        </p>
      )}

      <button
        onClick={gerar}
        disabled={gerando || !reuniao.notas_brutas}
        className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #A046C6 0%, #F9267C 100%)' }}
      >
        {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {gerando ? 'Analisando notas...' : resumo ? 'Gerar novamente' : 'Gerar Resumo com IA'}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dialog converter action item em card
// ---------------------------------------------------------------------------
function ConverterCardDialog({
  item,
  clientes,
  tiposDemanda,
  onClose,
  onConvertido,
}: {
  item: ActionItem
  clientes: { id: string; nome: string }[]
  tiposDemanda: { id: string; nome: string; categoria: string }[]
  onClose: () => void
  onConvertido: (cardId: string) => void
}) {
  const [clienteId, setClienteId] = useState(clientes[0]?.id ?? '')
  const [tipoId, setTipoId] = useState(tiposDemanda[0]?.id ?? '')
  const [prioridade, setPrioridade] = useState('normal')
  const [convertendo, setConvertendo] = useState(false)

  async function converter() {
    if (!clienteId || !tipoId) return
    setConvertendo(true)
    try {
      const cardId = await actionConverterItemEmCard(item.id, clienteId, tipoId, prioridade)
      onConvertido(cardId)
    } finally {
      setConvertendo(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-sm font-bold text-zinc-900">Criar Card no Board</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-xl bg-zinc-50 border border-zinc-200 px-3 py-2 mb-4">
          <p className="text-xs text-zinc-600">{item.descricao}</p>
          {item.prazo_sugerido && (
            <p className="text-[10px] text-zinc-400 mt-1">
              Prazo: {new Date(item.prazo_sugerido).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label className="label-form">Cliente *</label>
            <div className="relative">
              <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="input-form pr-7 appearance-none">
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="label-form">Tipo de demanda *</label>
            <div className="relative">
              <select value={tipoId} onChange={(e) => setTipoId(e.target.value)} className="input-form pr-7 appearance-none">
                {tiposDemanda.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="label-form">Prioridade</label>
            <div className="relative">
              <select value={prioridade} onChange={(e) => setPrioridade(e.target.value)} className="input-form pr-7 appearance-none">
                <option value="urgente">Urgente</option>
                <option value="alta">Alta</option>
                <option value="normal">Normal</option>
                <option value="baixa">Baixa</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 rounded-xl border border-zinc-200 py-2 text-sm text-zinc-600 hover:bg-zinc-50 transition">
            Cancelar
          </button>
          <button
            onClick={converter}
            disabled={convertendo || !clienteId || !tipoId}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 py-2 text-sm font-semibold text-white hover:bg-zinc-800 transition disabled:opacity-60"
          >
            {convertendo && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Criar Card
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Aba Action Items
// ---------------------------------------------------------------------------
function AbaActionItems({
  items,
  clientes,
  tiposDemanda,
}: {
  items: ActionItem[]
  clientes: Props['clientes']
  tiposDemanda: Props['tiposDemanda']
}) {
  const [itemConvertendo, setItemConvertendo] = useState<ActionItem | null>(null)
  const [estados, setEstados] = useState<Record<string, boolean>>(
    Object.fromEntries(items.map((i) => [i.id, i.confirmado])),
  )
  const [, startTransition] = useTransition()
  const router = useRouter()

  function toggleConfirmado(item: ActionItem) {
    const novo = !estados[item.id]
    setEstados((prev) => ({ ...prev, [item.id]: novo }))
    startTransition(() => {
      actionConfirmarActionItem(item.id, novo)
    })
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <CheckCircle2 className="h-8 w-8 text-zinc-200 mb-2" />
        <p className="text-sm text-zinc-400">
          Nenhum action item ainda. Gere o resumo com IA para extraí-los automaticamente.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const confirmado = estados[item.id]
        return (
          <div
            key={item.id}
            className={`flex items-start gap-3 rounded-2xl border p-4 transition-colors ${
              confirmado ? 'border-emerald-200 bg-emerald-50' : 'border-zinc-200 bg-white'
            }`}
          >
            <button onClick={() => toggleConfirmado(item)} className="mt-0.5 flex-none">
              {confirmado
                ? <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                : <Circle className="h-4.5 w-4.5 text-zinc-300 hover:text-zinc-400 transition" />}
            </button>

            <div className="flex-1 min-w-0">
              <p className={`text-sm ${confirmado ? 'line-through text-zinc-400' : 'text-zinc-800'}`}>
                {item.descricao}
              </p>
              <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-zinc-400">
                {item.prazo_sugerido && (
                  <span>📅 {new Date(item.prazo_sugerido).toLocaleDateString('pt-BR')}</span>
                )}
                {item.responsavel_nome && <span>👤 {item.responsavel_nome}</span>}
                {item.card_id && (
                  <a
                    href={`/board?card=${item.card_id}`}
                    className="text-violet-500 font-medium hover:underline"
                  >
                    → Ver card no Board
                  </a>
                )}
              </div>
            </div>

            {!item.card_id && !confirmado && (
              <button
                onClick={() => setItemConvertendo(item)}
                className="flex-none flex items-center gap-1 rounded-lg border border-zinc-200 px-2 py-1 text-[10px] font-medium text-zinc-500 hover:border-violet-300 hover:text-violet-600 transition"
              >
                <Kanban className="h-3 w-3" />
                Card
              </button>
            )}
          </div>
        )
      })}

      {itemConvertendo && (
        <ConverterCardDialog
          item={itemConvertendo}
          clientes={clientes}
          tiposDemanda={tiposDemanda}
          onClose={() => setItemConvertendo(null)}
          onConvertido={(cardId) => {
            setItemConvertendo(null)
            router.push(`/board?card=${cardId}`)
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// AbaTranscricao — Sprint 5.3
// ---------------------------------------------------------------------------
function AbaTranscricao({
  reuniao,
}: {
  reuniao: Reuniao
  onRefresh?: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  const [uploadPending, startUpload] = useTransition()
  const [meetPending, startMeet] = useTransition()
  const [erroUpload, setErroUpload] = useState<string | null>(null)
  const [erroMeet, setErroMeet] = useState<string | null>(null)
  const [meetLink, setMeetLink] = useState('')
  const [salvandoMeet, setSalvandoMeet] = useState(false)
  const [meetSalvo, setMeetSalvo] = useState(false)
  const [transcreverPending, setTranscreverPending] = useState(false)
  const [erroTranscrever, setErroTranscrever] = useState<string | null>(null)
  const [transcricaoOk, setTranscricaoOk] = useState(false)

  const status = reuniao.transcricao_status ?? 'nenhuma'
  const temAudio = Boolean(reuniao.audio_storage_path)
  const temMeet  = Boolean(reuniao.meet_space_id)

  const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
    nenhuma:     { label: 'Sem transcrição',  cls: 'bg-zinc-100 text-zinc-500'     },
    processando: { label: 'Processando...',   cls: 'bg-amber-100 text-amber-700'   },
    concluida:   { label: 'Concluída',        cls: 'bg-emerald-100 text-emerald-700' },
    erro:        { label: 'Erro',             cls: 'bg-red-100 text-red-600'       },
  }
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.nenhuma

  function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErroUpload(null)
    const fd = new FormData()
    const file = fileRef.current?.files?.[0]
    if (!file) return
    fd.append('audio', file)
    startUpload(async () => {
      const res = await actionUploadAudio(reuniao.id, fd)
      if (res.error) { setErroUpload(res.error); return }
      formRef.current?.reset()
      router.refresh()
    })
  }

  async function handleTranscrever() {
    setTranscreverPending(true)
    setErroTranscrever(null)
    setTranscricaoOk(false)
    try {
      const res = await fetch('/api/reunioes/transcrever', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reuniaoId: reuniao.id, copiarParaNotas: true }),
      })
      const json = await res.json()
      if (!res.ok) {
        setErroTranscrever(json.error ?? 'Erro na transcrição.')
      } else {
        setTranscricaoOk(true)
        router.refresh()
      }
    } catch {
      setErroTranscrever('Erro de conexão.')
    } finally {
      setTranscreverPending(false)
    }
  }

  async function handleSalvarMeet() {
    if (!meetLink.trim()) return
    setSalvandoMeet(true)
    setMeetSalvo(false)
    const res = await actionSalvarMeetSpaceId(reuniao.id, meetLink.trim())
    setSalvandoMeet(false)
    if (res.error) { setErroMeet(res.error); return }
    setMeetSalvo(true)
    setMeetLink('')
    router.refresh()
  }

  function handleImportarMeet() {
    setErroMeet(null)
    startMeet(async () => {
      const res = await actionImportarMeetNotes(reuniao.id)
      if (res.error) { setErroMeet(res.error); return }
      router.refresh()
    })
  }

  function copiarParaAreaTransferencia() {
    const texto = reuniao.transcricao_bruta ?? ''
    if (texto) navigator.clipboard.writeText(texto)
  }

  return (
    <div className="space-y-6">
      {/* Status geral */}
      <div className="flex items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.cls}`}>
          {badge.label}
        </span>
        {status === 'processando' && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
        )}
      </div>

      {/* Seção 1 — Upload de áudio */}
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Mic className="h-4 w-4 text-zinc-500" />
          <p className="text-sm font-semibold text-zinc-700">Upload de gravação</p>
        </div>
        <p className="text-xs text-zinc-500">
          Envie o arquivo de áudio ou vídeo da reunião. O Whisper (OpenAI) irá transcrever automaticamente.
        </p>
        <form ref={formRef} onSubmit={handleUpload} className="flex items-end gap-3">
          <div className="flex-1">
            <input
              ref={fileRef}
              type="file"
              accept="audio/*,video/mp4,video/webm,video/quicktime"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 file:mr-2 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-white cursor-pointer"
            />
            <p className="mt-1 text-[10px] text-zinc-400">MP3, MP4, WAV, OGG, WebM · máx 200 MB</p>
          </div>
          <button
            type="submit"
            disabled={uploadPending}
            className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-medium text-white disabled:opacity-60 transition hover:bg-zinc-800"
          >
            {uploadPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Enviar
          </button>
        </form>
        {erroUpload && (
          <p className="flex items-center gap-1 text-xs text-red-600">
            <AlertTriangle className="h-3.5 w-3.5 flex-none" />{erroUpload}
          </p>
        )}
        {temAudio && (
          <div className="flex items-center justify-between rounded-xl bg-white border border-zinc-200 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Mic className="h-3.5 w-3.5 text-zinc-400" />
              <p className="text-xs text-zinc-600">Áudio enviado</p>
            </div>
            <button
              onClick={handleTranscrever}
              disabled={transcreverPending || status === 'processando'}
              className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-60 transition"
            >
              {transcreverPending && <Loader2 className="h-3 w-3 animate-spin" />}
              {transcreverPending ? 'Transcrevendo...' : 'Transcrever agora'}
            </button>
          </div>
        )}
        {erroTranscrever && (
          <p className="flex items-center gap-1 text-xs text-red-600">
            <AlertTriangle className="h-3.5 w-3.5 flex-none" />{erroTranscrever}
          </p>
        )}
        {transcricaoOk && (
          <p className="flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5 flex-none" />
            Transcrição concluída! Notas brutas atualizadas.
          </p>
        )}
      </div>

      {/* Seção 2 — Google Meet / Gemini Notes */}
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <ExternalLink className="h-4 w-4 text-zinc-500" />
          <p className="text-sm font-semibold text-zinc-700">Google Meet — Gemini Notes</p>
        </div>
        <p className="text-xs text-zinc-500">
          Se a reunião foi no Google Meet com transcrição automática do Gemini ativa,
          cole o link abaixo para importar as notas diretamente.
        </p>

        {temMeet ? (
          <div className="flex items-center justify-between rounded-xl bg-white border border-zinc-200 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Link2 className="h-3.5 w-3.5 text-zinc-400" />
              <p className="text-xs text-zinc-600 font-mono">{reuniao.meet_space_id}</p>
            </div>
            <button
              onClick={handleImportarMeet}
              disabled={meetPending || status === 'processando'}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition"
            >
              {meetPending && <Loader2 className="h-3 w-3 animate-spin" />}
              {meetPending ? 'Importando...' : 'Importar notas'}
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="url"
              value={meetLink}
              onChange={(e) => { setMeetLink(e.target.value); setMeetSalvo(false) }}
              placeholder="https://meet.google.com/abc-defg-hij"
              className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 placeholder:text-zinc-400 focus:border-brand focus:outline-none"
            />
            <button
              onClick={handleSalvarMeet}
              disabled={!meetLink.trim() || salvandoMeet}
              className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-60 transition hover:bg-zinc-800"
            >
              {salvandoMeet && <Loader2 className="h-3 w-3 animate-spin" />}
              {meetSalvo ? 'Salvo!' : 'Salvar'}
            </button>
          </div>
        )}
        {erroMeet && (
          <p className="flex items-center gap-1 text-xs text-red-600">
            <AlertTriangle className="h-3.5 w-3.5 flex-none" />{erroMeet}
          </p>
        )}
      </div>

      {/* Seção 3 — Texto transcrito */}
      {reuniao.transcricao_bruta && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-zinc-600">Texto transcrito</p>
            <button
              onClick={copiarParaAreaTransferencia}
              className="flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1 text-xs text-zinc-500 hover:bg-zinc-50 transition"
            >
              <Copy className="h-3 w-3" />
              Copiar
            </button>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 max-h-64 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-700 font-sans">
              {reuniao.transcricao_bruta}
            </pre>
          </div>
          <p className="text-[10px] text-zinc-400">
            O texto acima foi copiado para &quot;Notas brutas&quot; automaticamente. Use a aba &quot;Resumo IA&quot; para gerar o resumo.
          </p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ReuniaoDetalhe — componente principal
// ---------------------------------------------------------------------------

export function ReuniaoDetalhe({ reuniao, actionItems, clientes, tiposDemanda, papel }: Props) {
  const router = useRouter()
  const [aba, setAba] = useState<'notas' | 'resumo' | 'items' | 'transcricao'>('notas')
  const [items] = useState(actionItems)
  const [confidencial, setConfidencial] = useState(reuniao.confidencial)
  const [togglingConf, setTogglingConf] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)

  async function handleExcluir() {
    setExcluindo(true)
    const result = await actionExcluirReuniao(reuniao.id)
    if (result.error) {
      alert(result.error)
      setExcluindo(false)
      setConfirmandoExclusao(false)
    } else {
      router.push('/reunioes')
    }
  }

  async function toggleConfidencial() {
    setTogglingConf(true)
    const novoValor = !confidencial
    setConfidencial(novoValor)
    const result = await actionToggleConfidencial(reuniao.id, novoValor)
    if (result.error) setConfidencial(!novoValor) // reverte em caso de erro
    setTogglingConf(false)
  }

  function handleGerou() {
    setAba('items')
  }

  const abas = [
    { key: 'notas',       label: 'Notas brutas' },
    { key: 'resumo',      label: 'Resumo IA' },
    { key: 'items',       label: `Action Items ${items.length > 0 ? `(${items.length})` : ''}` },
    { key: 'transcricao', label: reuniao.transcricao_status === 'concluida' ? '✓ Transcrição' : 'Transcrição' },
  ] as const

  return (
    <div>
      {/* Ações de gestão (sócia/gestao/atendimento) */}
      {(papel === 'socia' || papel === 'gestao' || papel === 'atendimento') && (
        <div className="mb-4 flex items-center justify-between gap-2">
          {/* Toggle confidencial — só sócias */}
          {papel === 'socia' ? (
            <button
              onClick={toggleConfidencial}
              disabled={togglingConf}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition disabled:opacity-50 ${
                confidencial
                  ? 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100'
                  : 'border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50'
              }`}
            >
              {confidencial ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
              {confidencial ? 'Confidencial (só sócias)' : 'Tornar confidencial'}
            </button>
          ) : (
            <span />
          )}

          {/* Excluir reunião */}
          {confirmandoExclusao ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Confirmar exclusão?</span>
              <button
                onClick={handleExcluir}
                disabled={excluindo}
                className="flex items-center gap-1 rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {excluindo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                {excluindo ? 'Excluindo...' : 'Sim, excluir'}
              </button>
              <button
                onClick={() => setConfirmandoExclusao(false)}
                disabled={excluindo}
                className="rounded-xl border border-zinc-200 px-3 py-2 text-xs text-zinc-600 transition hover:bg-zinc-50"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmandoExclusao(true)}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-2 text-xs text-zinc-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Excluir reunião
            </button>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-200 mb-5">
        {abas.map((a) => (
          <button
            key={a.key}
            onClick={() => setAba(a.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              aba === a.key
                ? 'border-violet-600 text-violet-700'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {aba === 'notas'       && <AbaNotas reuniao={reuniao} />}
      {aba === 'resumo'      && <AbaResumo reuniao={reuniao} onGerou={handleGerou} />}
      {aba === 'items'       && (
        <AbaActionItems items={items} clientes={clientes} tiposDemanda={tiposDemanda} />
      )}
      {aba === 'transcricao' && (
        <AbaTranscricao reuniao={reuniao} />
      )}
    </div>
  )
}
