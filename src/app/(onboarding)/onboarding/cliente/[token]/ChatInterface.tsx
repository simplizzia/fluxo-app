'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import StarRating from './StarRating'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatInterfaceProps {
  token: string
  initialMessages: Message[]
}

function applyInline(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
}

function renderMarkdown(raw: string): string {
  const escaped = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const lines = escaped.split('\n')
  const processed = lines.map((line) => {
    if (line.startsWith('### ')) return '<h3 class="text-base font-semibold mt-4 mb-1">' + applyInline(line.slice(4)) + '</h3>'
    if (line.startsWith('## '))  return '<h2 class="text-lg font-semibold mt-6 mb-2">'  + applyInline(line.slice(3)) + '</h2>'
    if (line.startsWith('# '))   return '<h1 class="text-xl font-semibold mt-6 mb-2">'  + applyInline(line.slice(2)) + '</h1>'
    if (line.startsWith('- '))   return '<li class="ml-5 list-disc">'                   + applyInline(line.slice(2)) + '</li>'
    return applyInline(line)
  })

  return processed.join('<br />')
}

export default function ChatInterface({ token, initialMessages }: ChatInterfaceProps) {
  const [messages, setMessages]       = useState<Message[]>(initialMessages)
  const [input, setInput]             = useState('')
  const [isStreaming, setIsStreaming]  = useState(false)
  const [briefingDone, setBriefingDone] = useState(false)
  const [feedbackDone, setFeedbackDone] = useState(false)
  const [notStarted, setNotStarted]   = useState(initialMessages.length === 0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(
    async (text: string, init = false) => {
      setIsStreaming(true)
      if (init) setNotStarted(false)

      if (!init) {
        setMessages((prev) => [...prev, { role: 'user', content: text }])
        setInput('')
      }

      // Placeholder de streaming
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      try {
        const res = await fetch('/api/onboarding/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, message: text, init }),
        })

        if (!res.ok) throw new Error('Erro de rede')

        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const parts = buffer.split('\n\n')
          buffer = parts.pop() ?? ''

          for (const part of parts) {
            if (!part.startsWith('data: ')) continue
            try {
              const data = JSON.parse(part.slice(6))

              if (data.text) {
                setMessages((prev) => {
                  const updated = [...prev]
                  const last = updated[updated.length - 1]
                  if (last?.role === 'assistant') {
                    updated[updated.length - 1] = { ...last, content: last.content + data.text }
                  }
                  return updated
                })
              }

              if (data.error) {
                setMessages((prev) => {
                  const updated = [...prev]
                  const last = updated[updated.length - 1]
                  if (last?.role === 'assistant' && last.content === '') {
                    updated[updated.length - 1] = { ...last, content: 'Erro: ' + data.error }
                  }
                  return updated
                })
              }

              if (data.done) {
                if (data.briefing_done) {
                  setBriefingDone(true)
                  setMessages((prev) => {
                    const updated = [...prev]
                    const last = updated[updated.length - 1]
                    if (last?.role === 'assistant') {
                      updated[updated.length - 1] = {
                        ...last,
                        content: 'Tudo anotado. A avaliação rápida está logo abaixo.',
                      }
                    }
                    return updated
                  })
                } else {
                  setMessages((prev) => {
                    const updated = [...prev]
                    const last = updated[updated.length - 1]
                    if (last?.role === 'assistant' && last.content === '') {
                      updated[updated.length - 1] = { ...last, content: '...' }
                    }
                    return updated
                  })
                }
              }
            } catch {
              // ignora chunks SSE malformados
            }
          }
        }
      } catch {
        setMessages((prev) => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last?.role === 'assistant' && last.content === '') {
            updated[updated.length - 1] = { ...last, content: 'Erro ao processar. Tente novamente.' }
          }
          return updated
        })
      } finally {
        setIsStreaming(false)
      }
    },
    [token],
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isStreaming || briefingDone || notStarted) return
    sendMessage(trimmed)
  }

  function renderContent(msg: Message) {
    if (msg.role === 'user') {
      return <p className="whitespace-pre-wrap">{msg.content}</p>
    }
    if (!msg.content) {
      return (
        <span className="inline-flex gap-1">
          <span className="animate-bounce">•</span>
          <span className="animate-bounce [animation-delay:0.15s]">•</span>
          <span className="animate-bounce [animation-delay:0.3s]">•</span>
        </span>
      )
    }
    return (
      <div
        className="leading-relaxed"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
      />
    )
  }

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
        <span className="text-xs font-medium uppercase tracking-widest text-zinc-400">Briefing</span>
        <span className="text-sm font-semibold text-zinc-900">Simplizzia</span>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-4">

          {notStarted && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="mb-2 text-sm font-medium text-zinc-900">Pronto para começar?</p>
              <p className="mb-6 text-xs text-zinc-400">
                A Izzi já tem contexto sobre o seu negócio e vai conduzir a conversa.
              </p>
              <button
                onClick={() => sendMessage('', true)}
                disabled={isStreaming}
                className="rounded-xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40"
              >
                Iniciar conversa
              </button>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={'flex ' + (msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div
                className={
                  'max-w-[82%] rounded-2xl px-4 py-3 text-sm ' +
                  (msg.role === 'user'
                    ? 'rounded-br-sm bg-zinc-900 text-white'
                    : 'rounded-bl-sm bg-zinc-100 text-zinc-900')
                }
              >
                {renderContent(msg)}
              </div>
            </div>
          ))}

          {briefingDone && !feedbackDone && (
            <div className="py-4">
              <StarRating token={token} onSubmitted={() => setFeedbackDone(true)} />
            </div>
          )}

          {feedbackDone && (
            <div className="py-8 text-center">
              <p className="text-sm text-zinc-500">
                Obrigado! Suas respostas foram registradas. Verifique seu e-mail — o convite
                de acesso à plataforma será enviado em breve.
              </p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      {!briefingDone && !notStarted && (
        <div className="border-t border-zinc-100 px-4 py-4">
          <form onSubmit={handleSubmit} className="mx-auto flex max-w-2xl gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e as unknown as React.FormEvent)
                }
              }}
              placeholder="Escreva sua resposta..."
              disabled={isStreaming}
              rows={1}
              className="flex-1 resize-none rounded-xl border border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isStreaming || !input.trim()}
              className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Enviar
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
