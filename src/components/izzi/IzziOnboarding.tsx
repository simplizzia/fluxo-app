'use client'

/**
 * IzziOnboarding — overlay de boas-vindas para clientes no primeiro acesso.
 *
 * 4 passos:
 *   1. Boas-vindas da Izzi
 *   2. Suas demandas (Board)
 *   3. Aprovações
 *   4. Chat com a Izzi
 *
 * Ao concluir: chama actionConcluirOnboarding() e remove o overlay.
 */

import { useState, useTransition } from 'react'
import { Kanban, CheckCircle2, MessageCircle, ChevronRight, Sparkles } from 'lucide-react'
import { actionConcluirOnboarding } from '@/app/(dashboard)/izzi/actions'

interface Passo {
  icone: React.ReactNode
  titulo: string
  fala: string
  destaque?: string
}

const PASSOS: Passo[] = [
  {
    icone: <Sparkles className="h-7 w-7 text-white" />,
    titulo: 'Olá! Eu sou a Izzi 👋',
    fala:
      'Que bom ter você aqui na Simplizzia! Eu sou a Izzi, sua assistente pessoal dentro da plataforma. Fui feita para te ajudar a acompanhar seus projetos, tirar dúvidas e garantir que tudo flua bem. Vou te mostrar o que tem aqui — leva só um minutinho!',
  },
  {
    icone: <Kanban className="h-7 w-7 text-white" />,
    titulo: 'Suas demandas no Board',
    fala:
      'No **Board**, você acompanha todas as suas demandas em tempo real. Cada card mostra o status atual: se está em produção, aguardando sua aprovação, ou já concluído. Você também pode criar novas solicitações diretamente por aqui.',
    destaque: 'Board',
  },
  {
    icone: <CheckCircle2 className="h-7 w-7 text-white" />,
    titulo: 'Aprovações são simples',
    fala:
      'Quando uma entrega estiver pronta, você recebe um e-mail meu avisando! Basta clicar no link do e-mail ou acessar o card no Board e escolher **Aprovar** ou **Solicitar ajuste**. Você também pode deixar comentários diretamente no card.',
    destaque: 'Para aprovação',
  },
  {
    icone: <MessageCircle className="h-7 w-7 text-white" />,
    titulo: 'Pode me chamar quando quiser!',
    fala:
      'Me encontre pelo botão com brilho (✨) no canto inferior direito da tela. Pode me perguntar sobre o status das suas demandas, prazos, uso do plano — estou sempre aqui. Boa jornada com a Simplizzia! 💜',
    destaque: 'Izzi',
  },
]

export function IzziOnboarding() {
  const [passo, setPasso] = useState(0)
  const [saindo, setSaindo] = useState(false)
  const [isPending, startTransition] = useTransition()

  const passoAtual = PASSOS[passo]
  const isUltimo = passo === PASSOS.length - 1

  function avancar() {
    if (isUltimo) {
      concluir()
    } else {
      setPasso((p) => p + 1)
    }
  }

  function concluir() {
    setSaindo(true)
    startTransition(async () => {
      await actionConcluirOnboarding()
    })
  }

  if (saindo && !isPending) return null

  // Renderiza o fala com **negrito** simples
  function renderFala(texto: string) {
    const partes = texto.split(/\*\*(.*?)\*\*/g)
    return partes.map((parte, i) =>
      i % 2 === 1 ? (
        <strong key={i} className="font-semibold text-violet-700">
          {parte}
        </strong>
      ) : (
        <span key={i}>{parte}</span>
      ),
    )
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        animation: saindo ? 'izziFadeOut 0.3s ease-out forwards' : 'izziFadeIn 0.3s ease-out',
      }}
    >
      <div
        className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden"
        style={{ animation: 'izziScaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        {/* Header colorido com avatar */}
        <div
          className="flex flex-col items-center gap-4 px-8 pt-8 pb-6"
          style={{ background: 'linear-gradient(135deg, #A046C6 0%, #F9267C 100%)' }}
        >
          {/* Avatar Izzi */}
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/25 shadow-lg">
            {passoAtual.icone}
          </div>

          {/* Indicadores de passo */}
          <div className="flex gap-2">
            {PASSOS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === passo ? 'w-6 bg-white' : 'w-1.5 bg-white/40'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="px-8 py-7">
          <h2 className="font-display text-xl font-bold text-zinc-900 mb-3 text-center">
            {passoAtual.titulo}
          </h2>

          {/* Balão de fala da Izzi */}
          <div className="relative rounded-2xl bg-zinc-50 border border-zinc-100 px-5 py-4 mb-6">
            {/* Triângulo do balão */}
            <div className="absolute -top-2 left-8 h-3 w-3 bg-zinc-50 border-t border-l border-zinc-100 rotate-45" />
            <p className="text-sm text-zinc-700 leading-relaxed">
              {renderFala(passoAtual.fala)}
            </p>
          </div>

          {/* Ações */}
          <div className="flex items-center justify-between gap-3">
            {passo > 0 ? (
              <button
                onClick={() => setPasso((p) => p - 1)}
                className="text-xs text-zinc-400 hover:text-zinc-600 transition"
              >
                Voltar
              </button>
            ) : (
              <div />
            )}

            <button
              onClick={avancar}
              disabled={isPending}
              className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-90 active:scale-95 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #A046C6 0%, #F9267C 100%)' }}
            >
              {isUltimo ? 'Começar!' : 'Próximo'}
              {!isUltimo && <ChevronRight className="h-4 w-4" />}
            </button>
          </div>

          {/* Skip */}
          {!isUltimo && (
            <div className="mt-4 text-center">
              <button
                onClick={concluir}
                disabled={isPending}
                className="text-[11px] text-zinc-400 hover:text-zinc-500 transition underline-offset-2 hover:underline"
              >
                Pular apresentação
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes izziFadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes izziFadeOut { from { opacity: 1 } to { opacity: 0 } }
        @keyframes izziScaleIn {
          from { opacity: 0; transform: scale(0.92) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
      `}</style>
    </div>
  )
}
