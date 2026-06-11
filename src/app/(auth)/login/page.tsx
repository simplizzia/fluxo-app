import type { Metadata } from 'next'
import Image from 'next/image'
import { LoginForm } from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'Entrar — Simplizzia',
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      {/* Painel esquerdo — visível apenas em telas lg+ */}
      <div className="hidden lg:flex flex-col items-center justify-center w-1/2 shrink-0 bg-gradient-to-br from-[#A046C6] to-[#F9267C] p-12 relative overflow-hidden">
        {/* Círculos decorativos de fundo */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full bg-white/5" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          <Image
            src="/izzi-login.png"
            alt="Izzi"
            width={220}
            height={220}
            className="mb-10 drop-shadow-2xl"
            priority
          />
          <p className="text-white text-xl font-semibold leading-snug mb-3">
            "Oi! Sou a Izzi.
          </p>
          <p className="text-white/85 text-base leading-relaxed">
            Aqui a sua equipe trabalha junta, os clientes aprovam com facilidade e nenhuma demanda se perde no caminho."
          </p>
          <p className="mt-6 text-white/50 text-sm">— Izzi, assistente da Simplizzia</p>
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm space-y-8">
          {/* Cabeçalho */}
          <div>
            <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#A046C6] to-[#F9267C]">
              <span className="text-lg font-bold text-white">S</span>
            </div>
            <h1 className="text-2xl font-semibold text-zinc-900">Simplizzia</h1>
            <p className="mt-1 text-sm text-zinc-500">Entre na sua conta para continuar</p>
          </div>

          {/* Formulário */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
            <LoginForm />
          </div>

          {/* Primeiro acesso */}
          <p className="text-center text-xs text-zinc-400">
            Recebeu um convite?{' '}
            <a
              href="/esqueci-senha"
              className="font-medium text-[#A046C6] hover:text-[#8b35b0] underline underline-offset-2"
            >
              Clique aqui para definir sua senha
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
