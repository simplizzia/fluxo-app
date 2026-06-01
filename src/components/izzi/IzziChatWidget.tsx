'use client'

/**
 * IzziChatWidget — floating chat button + panel para clientes.
 *
 * Posição: fixed bottom-right.
 * Abre um painel de chat 340×480 acima do botão.
 * Conversa persistida via /api/izzi/chat.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send, Sparkles, RefreshCw } from 'lucide-react'

interface Mensagem {
  id: string
  role: 'user' | 'assistant'
  conteudo: string
}

const BOAS_VINDAS: Mensagem = {
  id: 'welcome',
  role: 'assistant',
  conteudo:
    'Olá! Eu sou a Izzi ✨ Estou aqui para te ajudar a acompanhar seus projetos, entender suas demandas e tirar dúvidas sobre a plataforma. Como posso te ajudar hoje?',
}

export function IzziChatWidget() {
  const [aberto, setAberto] = useState(false)
  const [mensagens, setMensagens] = useState<Mensagem[]>([BOAS_VINDAS])
  const [input, setInput] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [conversaId, setConversaId] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll para o final ao receber mensagens
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [mensagens, carregando])

  // Foca o input quando o painel abre
  useEffect(() => {
    if (aberto) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [aberto])

  const enviar = useCallback(async () => {
    const texto = input.trim()
    if (!texto || carregando) return

    setInput('')
    setErro(null)
    setMensagens((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: 'user', conteudo: texto },
    ])
    setCarregando(true)

    try {
      const res = await fetch('/api/izzi/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem: texto, conversaId }),
      })

      const data = (await res.json()) as { resposta?: string; conversaId?: string; error?: string }

      if (!res.ok || data.error) {
        setErro('Ops, tive um problema. Pode tentar novamente?')
        return
      }

      if (data.conversaId) setConversaId(data.conversaId)

      setMensagens((prev) => [
        ...prev,
        {
          id: `izzi-${Date.now()}`,
          role: 'assistant',
          conteudo: data.resposta ?? 'Não consegui processar. Tente novamente.',
        },
      ])
    } catch {
      setErro('Não consegui me conectar agora. Tente em instantes!')
    } finally {
      setCarregando(false)
    }
  }, [input, carregando, conversaId])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviar()
    }
  }

  function reiniciar() {
    setMensagens([BOAS_VINDAS])
    setConversaId(null)
    setErro(null)
    setInput('')
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* ── Painel de chat ───────────────────────────────────────── */}
      {aberto && (
        <div
          className="flex flex-col w-[340px] h-[480px] rounded-2xl shadow-2xl border border-zinc-200 bg-white overflow-hidden"
          style={{ animation: 'izziSlideUp 0.2s ease-out' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 flex-none"
            style={{ background: 'linear-gradient(135deg, #A046C6 0%, #F9267C 100%)' }}
          >
            <div
              className="flex h-8 w-8 flex-none items-center justify-center rounded-xl bg-white/25 font-display font-bold text-white text-sm"
            >
              I
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm font-bold text-white leading-none">Izzi</p>
              <p className="text-[10px] text-white/70 mt-0.5">Assistente da Simplizzia</p>
            </div>
            <button
              onClick={reiniciar}
              title="Nova conversa"
              className="text-white/60 hover:text-white transition mr-1"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setAberto(false)}
              className="text-white/60 hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth"
          >
            {mensagens.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div
                    className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-white text-[10px] font-display font-bold"
                    style={{ background: 'linear-gradient(135deg, #A046C6 0%, #F9267C 100%)' }}
                  >
                    I
                  </div>
                )}
                <div
                  className={`max-w-[220px] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-violet-600 text-white rounded-br-sm'
                      : 'bg-zinc-100 text-zinc-800 rounded-bl-sm'
                  }`}
                >
                  {msg.conteudo}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {carregando && (
              <div className="flex items-end gap-2 justify-start">
                <div
                  className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-white text-[10px] font-display font-bold"
                  style={{ background: 'linear-gradient(135deg, #A046C6 0%, #F9267C 100%)' }}
                >
                  I
                </div>
                <div className="bg-zinc-100 rounded-2xl rounded-bl-sm px-3 py-2.5">
                  <div className="flex gap-1 items-center">
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        className="block w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Erro inline */}
            {erro && !carregando && (
              <div className="flex justify-center">
                <p className="text-[10px] text-red-400 bg-red-50 rounded-xl px-3 py-1.5 border border-red-100">
                  {erro}
                </p>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-zinc-100 p-3 flex gap-2 flex-none">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem..."
              disabled={carregando}
              className="flex-1 text-xs px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 transition disabled:opacity-50"
            />
            <button
              onClick={enviar}
              disabled={!input.trim() || carregando}
              className="flex h-8 w-8 flex-none items-center justify-center rounded-xl text-white transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #A046C6 0%, #F9267C 100%)' }}
              aria-label="Enviar"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Botão flutuante ──────────────────────────────────────── */}
      <button
        onClick={() => setAberto((prev) => !prev)}
        className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl text-white shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
        style={{ background: 'linear-gradient(135deg, #A046C6 0%, #F9267C 100%)' }}
        aria-label={aberto ? 'Fechar Izzi' : 'Falar com a Izzi'}
      >
        {aberto ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
      </button>

      {/* Animação CSS inline */}
      <style>{`
        @keyframes izziSlideUp {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
      `}</style>
    </div>
  )
}
