'use client'

/**
 * IzziEquipeTrigger — bloco da Izzi no sidebar para a equipe.
 *
 * Renderiza:
 *   1. Um botão "Izzi" na posição normal do sidebar (in-flow)
 *   2. Um painel lateral direito (fixed) com chat quando aberto
 *
 * O painel tem seletor de cliente para contexto focado.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send, ChevronDown, Sparkles, RefreshCw } from 'lucide-react'

interface Mensagem {
  id: string
  role: 'user' | 'assistant'
  conteudo: string
}

interface ClienteOpcao {
  id: string
  nome: string
}

interface IzziEquipeTriggerProps {
  clientes: ClienteOpcao[]
}

const BOAS_VINDAS: Mensagem = {
  id: 'welcome',
  role: 'assistant',
  conteudo:
    'Olá! Sou a Izzi 🚀 Estou aqui para te ajudar com contexto de clientes, sínteses operacionais, rascunhos e consultas rápidas. Selecione um cliente acima para foco específico, ou me pergunte sobre a operação geral.',
}

export function IzziEquipeTrigger({ clientes }: IzziEquipeTriggerProps) {
  const [aberto, setAberto] = useState(false)
  const [mensagens, setMensagens] = useState<Mensagem[]>([BOAS_VINDAS])
  const [input, setInput] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [conversaId, setConversaId] = useState<string | null>(null)
  const [clienteSelecionado, setClienteSelecionado] = useState<string>('')
  const [erro, setErro] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [mensagens, carregando])

  useEffect(() => {
    if (aberto) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [aberto])

  // Reinicia a conversa quando o cliente selecionado muda
  function mudarCliente(clienteId: string) {
    setClienteSelecionado(clienteId)
    setMensagens([
      {
        id: `ctx-${Date.now()}`,
        role: 'assistant',
        conteudo: clienteId
          ? `Contexto atualizado para ${clientes.find((c) => c.id === clienteId)?.nome ?? 'cliente selecionado'}. O que você quer saber?`
          : 'Voltando para visão geral da operação. Em que posso ajudar?',
      },
    ])
    setConversaId(null)
    setErro(null)
  }

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
        body: JSON.stringify({
          mensagem: texto,
          conversaId,
          clienteId: clienteSelecionado || null,
        }),
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
  }, [input, carregando, conversaId, clienteSelecionado])

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
    setClienteSelecionado('')
  }

  return (
    <>
      {/* ── Bloco da Izzi no sidebar (in-flow) ──────────────────── */}
      <div className="border-t border-zinc-100 px-3 py-2">
        <button
          onClick={() => setAberto((prev) => !prev)}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition ${
            aberto
              ? 'bg-violet-50 text-violet-700'
              : 'hover:bg-zinc-50 text-zinc-700'
          }`}
        >
          {/* Avatar da Izzi */}
          <div
            className="flex h-8 w-8 flex-none items-center justify-center rounded-xl font-display font-bold text-white text-sm"
            style={{ background: 'linear-gradient(135deg, #A046C6 0%, #F9267C 100%)' }}
          >
            I
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="font-display text-xs font-semibold">Izzi</p>
            <p className="text-[10px] text-zinc-400">
              {aberto ? 'Chat aberto →' : 'Assistente da Simplizzia'}
            </p>
          </div>
          <Sparkles className={`h-3.5 w-3.5 flex-none ${aberto ? 'text-violet-500' : 'text-zinc-300'}`} />
        </button>
      </div>

      {/* ── Painel lateral direito (fixed) ───────────────────────── */}
      {aberto && (
        <>
          {/* Overlay clicável para fechar */}
          <div
            className="fixed inset-0 z-40 bg-black/10"
            onClick={() => setAberto(false)}
          />

          <div
            className="fixed right-0 top-0 h-screen w-[380px] z-50 flex flex-col bg-white border-l border-zinc-200 shadow-2xl"
            style={{ animation: 'izziSlideLeft 0.22s ease-out' }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-3 px-4 py-3 flex-none"
              style={{ background: 'linear-gradient(135deg, #A046C6 0%, #F9267C 100%)' }}
            >
              <div
                className="flex h-8 w-8 flex-none items-center justify-center rounded-xl bg-white/25 font-display font-bold text-white text-sm"
              >
                I
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display text-sm font-bold text-white leading-none">Izzi</p>
                <p className="text-[10px] text-white/70 mt-0.5">Assistente operacional</p>
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

            {/* Seletor de cliente */}
            <div className="px-4 py-3 border-b border-zinc-100 flex-none bg-zinc-50">
              <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide block mb-1.5">
                Contexto
              </label>
              <div className="relative">
                <select
                  value={clienteSelecionado}
                  onChange={(e) => mudarCliente(e.target.value)}
                  className="w-full appearance-none text-xs rounded-xl border border-zinc-200 bg-white px-3 py-2 pr-7 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 transition"
                >
                  <option value="">🏢 Visão geral da operação</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
              </div>
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
                    className={`max-w-[270px] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
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
                <div className="flex items-end gap-2">
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
                placeholder="Pergunte sobre clientes, operação..."
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
        </>
      )}

      {/* Animação CSS */}
      <style>{`
        @keyframes izziSlideLeft {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0);    }
        }
      `}</style>
    </>
  )
}
