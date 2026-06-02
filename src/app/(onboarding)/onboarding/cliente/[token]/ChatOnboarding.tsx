'use client'

/**
 * ChatOnboarding — Chat de onboarding com a Izzi.
 *
 * Fase 1: boas-vindas (Izzi apresenta a Simplizzia, máx 3 trocas)
 *         Marcador: [BOAS_VINDAS_CONCLUIDA] → inicia briefing da 1ª marca
 *
 * Fase 2: briefing por marca (uma de cada vez, progresso visível no topo)
 *         Marcador: [MARCA_CONCLUIDA] → salva output + avança para próxima marca
 *         Marcador: [ONBOARDING_COMPLETO] → encerra, redireciona para /concluido
 *
 * Estado persistido em localStorage para retomada.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MarcaInfo {
  id: string
  nome: string
  publico: string | null
  instagram: string | null
  linkedin: string | null
  posicionamentoAtual: string | null
  concorrentes: string | null
  contextoEstrategico: string | null
  cenarioAtual: string | null
  status: string
  briefingOutput: string | null
}

export interface ClienteInfo {
  nome: string
  nomeContato: string | null
  cargoContato: string | null
  setor: string | null
  servicosContratados: string[]
  objetivoDeclarado: string | null
  doresIdentificadas: string | null
  cenarioAtual: string | null
  marcas: MarcaInfo[]
}

interface Mensagem {
  role: 'user' | 'assistant'
  content: string
}

interface MensagemUI {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type Fase = 'boas-vindas' | 'briefing'

interface EstadoSalvo {
  fase: Fase
  marcaIndex: number
  displayMessages: MensagemUI[]
  apiHistory: Mensagem[]
}

// ─── Marcadores ───────────────────────────────────────────────────────────────

const MARKER_BOAS_VINDAS = '[BOAS_VINDAS_CONCLUIDA]'
const MARKER_MARCA       = '[MARCA_CONCLUIDA]'
const MARKER_FIM         = '[ONBOARDING_COMPLETO]'

function stripMarkers(text: string): string {
  return text
    .replace(MARKER_BOAS_VINDAS, '')
    .replace(MARKER_MARCA, '')
    .replace(MARKER_FIM, '')
    .trim()
}

// ─── Persistência ─────────────────────────────────────────────────────────────

function chaveStorage(token: string) { return `izzi_onboarding_${token}` }

function carregarEstado(token: string): EstadoSalvo | null {
  try {
    const raw = localStorage.getItem(chaveStorage(token))
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function salvarEstado(token: string, estado: EstadoSalvo) {
  localStorage.setItem(chaveStorage(token), JSON.stringify(estado))
}

function limparEstado(token: string) {
  localStorage.removeItem(chaveStorage(token))
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Header() {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-[#A046C6] via-[#C040A0] to-[#F9267C] px-5 py-3.5">
      <div className="flex items-center gap-2">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-white">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span className="text-sm font-bold tracking-wide text-white">Simplizzia</span>
      </div>
      <span className="text-xs font-medium text-white/90">onboarding com a Izzi</span>
    </div>
  )
}

function AvatarIzzi() {
  return (
    <div className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#F9267C] text-white self-start">
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M11 18V6l-8.5 6 8.5 6zm.5-6 8.5 6V6l-8.5 6z" />
      </svg>
    </div>
  )
}

function MensagemIzzi({ content }: { content: string }) {
  return (
    <div className="flex items-start gap-3">
      <AvatarIzzi />
      <div className="prose prose-sm prose-zinc max-w-[82%] flex-1 rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm leading-relaxed shadow-sm">
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            ul: ({ children }) => <ul className="mb-2 list-disc pl-4">{children}</ul>,
            ol: ({ children }) => <ol className="mb-2 list-decimal pl-4">{children}</ol>,
            li: ({ children }) => <li className="mb-0.5">{children}</li>,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  )
}

function MensagemUsuario({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[82%] rounded-2xl rounded-br-sm bg-[#7C3AED] px-4 py-3 text-sm leading-relaxed text-white whitespace-pre-wrap">
        {content}
      </div>
    </div>
  )
}

function Digitando() {
  return (
    <div className="flex items-start gap-3">
      <AvatarIzzi />
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-2 w-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
        ))}
      </div>
    </div>
  )
}

function ProgressoMarcas({ marcas, marcaIndex, fase }: { marcas: MarcaInfo[]; marcaIndex: number; fase: Fase }) {
  if (fase === 'boas-vindas' || marcas.length === 0) return null
  return (
    <div className="flex-shrink-0 border-b border-gray-100 bg-white px-5 py-2">
      <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-1.5">
        {marcas.map((m, i) => (
          <div key={m.id} className="flex items-center gap-1.5">
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
              i < marcaIndex  ? 'border border-emerald-100 bg-emerald-50 text-emerald-600'
              : i === marcaIndex ? 'border border-purple-200 bg-purple-50 text-[#7C3AED]'
              : 'border border-gray-100 bg-gray-50 text-gray-400'
            }`}>
              {m.nome}
            </span>
            {i < marcas.length - 1 && <span className="text-xs text-gray-300">›</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface Props {
  token: string
  cliente: ClienteInfo
  initialMessages: Mensagem[]
}

export default function ChatOnboarding({ token, cliente, initialMessages }: Props) {
  const marcas = cliente.marcas

  // Carrega estado do localStorage (para retomada) ou inicializa
  const estadoSalvo = typeof window !== 'undefined' ? carregarEstado(token) : null

  // Índice da primeira marca ainda pendente — usa briefingOutput como fonte de verdade
  // (status pode estar desatualizado se o update falhou anteriormente)
  const primeiraIndexPendente = marcas.findIndex((m) => m.status !== 'done' && !m.briefingOutput)
  const indexInicial = estadoSalvo?.marcaIndex ?? (primeiraIndexPendente > 0 ? primeiraIndexPendente : 0)
  const faseInicial: Fase = estadoSalvo?.fase ?? (primeiraIndexPendente > 0 ? 'briefing' : 'boas-vindas')

  const [fase, setFase]               = useState<Fase>(faseInicial)
  const [marcaIndex, setMarcaIndex]   = useState(indexInicial)
  const [displayMessages, setDisplay] = useState<MensagemUI[]>(
    estadoSalvo?.displayMessages ?? initialMessages.map((m) => ({ id: crypto.randomUUID(), ...m }))
  )
  const [apiHistory, setApiHistory]   = useState<Mensagem[]>(
    estadoSalvo?.apiHistory ?? initialMessages
  )
  const [input, setInput]             = useState('')
  const [carregando, setCarregando]   = useState(false)
  const [concluido, setConcluido]     = useState(false)
  const [erro, setErro]               = useState('')

  const faseRef        = useRef(fase)
  const marcaIndexRef  = useRef(marcaIndex)
  const apiHistoryRef  = useRef(apiHistory)
  const bottomRef      = useRef<HTMLDivElement>(null)
  // Ref para chamadas recursivas dentro do useCallback (evita lint de acesso before declare)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const executarStreamRef = useRef<any>(null)

  useEffect(() => { faseRef.current = fase }, [fase])
  useEffect(() => { marcaIndexRef.current = marcaIndex }, [marcaIndex])
  useEffect(() => { apiHistoryRef.current = apiHistory }, [apiHistory])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [displayMessages, carregando])

  // Persiste no localStorage sempre que o histórico muda
  useEffect(() => {
    if (!token || displayMessages.length === 0) return
    salvarEstado(token, { fase, marcaIndex, displayMessages, apiHistory })
  }, [apiHistory]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Streaming ───────────────────────────────────────────────────────────────

  const executarStream = useCallback(async (
    history: Mensagem[],
    fasePedido: Fase,
    marcaId: string | undefined,
    isTrigger: boolean,
  ) => {
    setCarregando(true)
    const msgId = crypto.randomUUID()
    let acumulado = ''
    let iniciou = false

    try {
      const res = await fetch('/api/onboarding/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, messages: history, fase: fasePedido, marcaId, init: isTrigger }),
      })

      if (!res.ok) throw new Error(await res.text())
      if (!res.body) throw new Error('Sem resposta')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            if (parsed.error) throw new Error(parsed.error)
            if (!parsed.text) continue
            acumulado += parsed.text

            if (!iniciou) {
              iniciou = true
              setCarregando(false)
              setDisplay((prev) => [...prev, { id: msgId, role: 'assistant', content: stripMarkers(acumulado) }])
            } else {
              setDisplay((prev) => prev.map((m) => m.id === msgId ? { ...m, content: stripMarkers(acumulado) } : m))
            }
          } catch (e) {
            if (e instanceof Error) throw e
          }
        }
      }
    } catch (e) {
      setCarregando(false)
      setErro(e instanceof Error ? e.message : 'Erro inesperado.')
      return
    }

    // Atualiza histórico da API
    const triggerMsg: Mensagem = { role: 'user', content: isTrigger ? '__INIT__' : history[history.length - 1]?.content ?? '' }
    const assistantMsg: Mensagem = { role: 'assistant', content: acumulado }
    const newHistory = isTrigger ? [triggerMsg, assistantMsg] : [...history, assistantMsg]
    setApiHistory(newHistory)
    apiHistoryRef.current = newHistory

    // ─── Detecta marcadores ───────────────────────────────────────────────────

    if (acumulado.includes(MARKER_FIM)) {
      // Salva briefing da marca atual antes de encerrar (caso Izzi emita
      // [ONBOARDING_COMPLETO] diretamente sem passar por [MARCA_CONCLUIDA])
      if (marcaId && faseRef.current === 'briefing') {
        const outputFinal = acumulado.replace(MARKER_FIM, '').replace(MARKER_MARCA, '').trim()
        if (outputFinal) {
          await fetch('/api/onboarding/save-briefing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, marcaId, output: outputFinal }),
          }).catch(() => {})
        }
      }
      await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      }).catch(() => {})
      limparEstado(token)
      setConcluido(true)
      return
    }

    if (acumulado.includes(MARKER_MARCA) && marcaId) {
      // Salva briefing desta marca
      await fetch('/api/onboarding/save-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, marcaId, output: acumulado.replace(MARKER_MARCA, '').trim() }),
      }).catch(() => {})

      const proxIndex = marcaIndexRef.current + 1
      const proxMarca = marcas[proxIndex]

      if (proxMarca) {
        setMarcaIndex(proxIndex)
        marcaIndexRef.current = proxIndex
        executarStreamRef.current([], 'briefing', proxMarca.id, true)
      } else {
        executarStreamRef.current(newHistory, 'briefing', marcaId, false)
      }
      return
    }

    if (acumulado.includes(MARKER_BOAS_VINDAS)) {
      const primeiraMarca = marcas[0]
      if (!primeiraMarca) {
        await fetch('/api/onboarding/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        }).catch(() => {})
        limparEstado(token)
        setConcluido(true)
        return
      }
      // Remove a última mensagem da Izzi (que contém o marcador) para evitar
      // repetição de contexto quando o trigger da marca for exibido
      setDisplay((prev) => prev.filter((m) => m.id !== msgId))
      setFase('briefing')
      faseRef.current = 'briefing'
      setMarcaIndex(0)
      marcaIndexRef.current = 0
      executarStreamRef.current([], 'briefing', primeiraMarca.id, true)
    }
  }, [token, marcas]) // eslint-disable-line react-hooks/exhaustive-deps

  // Mantém o ref sincronizado com a versão mais recente do callback
  useEffect(() => { executarStreamRef.current = executarStream }, [executarStream])

  // Inicia automaticamente na primeira visita (sem mensagens)
  useEffect(() => {
    if (displayMessages.length === 0 && !carregando) {
      if (primeiraIndexPendente > 0) {
        // Algumas marcas já foram concluídas — pula direto para a pendente
        const marcaPendente = marcas[primeiraIndexPendente]
        executarStreamRef.current?.([], 'briefing', marcaPendente.id, true)
      } else {
        executarStreamRef.current?.([], 'boas-vindas', undefined, true)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || carregando || concluido) return

    const userMsg: Mensagem = { role: 'user', content: trimmed }
    const newHistory = [...apiHistoryRef.current, userMsg]

    setDisplay((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: trimmed }])
    setInput('')
    setApiHistory(newHistory)

    const marcaAtual = faseRef.current === 'briefing' ? marcas[marcaIndexRef.current] : undefined
    executarStream(newHistory, faseRef.current, marcaAtual?.id, false)
  }

  if (concluido) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-white">
        <div className="w-full max-w-md text-center">
          <p className="mb-6 text-xs font-medium uppercase tracking-widest text-zinc-400">Simplizzia</p>
          <h1 className="mb-3 text-2xl font-semibold text-zinc-900">Tudo certo!</h1>
          <p className="text-sm leading-relaxed text-zinc-500">
            O onboarding foi concluído. Nossa equipe irá analisar os briefings
            e entrar em contato para os próximos passos.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <Header />
      <ProgressoMarcas marcas={marcas} marcaIndex={marcaIndex} fase={fase} />

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {displayMessages.map((msg) =>
            msg.role === 'user'
              ? <MensagemUsuario key={msg.id} content={msg.content} />
              : <MensagemIzzi key={msg.id} content={msg.content} />
          )}
          {carregando && <Digitando />}
          {erro && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {erro} — <button onClick={() => setErro('')} className="underline">Tentar novamente</button>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-gray-100 bg-white px-4 py-4">
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-2xl gap-3">
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e as unknown as React.FormEvent) }
            }}
            placeholder="Escreva sua resposta… (Enter para enviar, Shift+Enter para nova linha)"
            disabled={carregando || concluido}
            rows={1}
            style={{ minHeight: '48px' }}
            className="flex-1 resize-none rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-200 disabled:opacity-50 overflow-y-auto"
          />
          <button
            type="submit"
            disabled={carregando || !input.trim() || concluido}
            className="rounded-xl bg-[#7C3AED] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#6D28D9] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  )
}
