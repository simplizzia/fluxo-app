import type { Metadata } from 'next'
import Image from 'next/image'
import { LoginForm } from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'Entrar — Simplizzia',
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12">
      <div className="w-full max-w-sm space-y-8">

        {/* Logo */}
        <div className="flex justify-center">
          <Image
            src="/logo-simplizzia.png"
            alt="Simplizzia"
            width={180}
            height={60}
            style={{ height: 'auto' }}
            priority
          />
        </div>

        {/* Izzi + frase */}
        <div className="flex flex-col items-center text-center gap-3">
          <Image
            src="/izzi-login.png"
            alt="Izzi"
            width={96}
            height={96}
            style={{ width: 96, height: 'auto' }}
          />
          <p className="text-sm text-zinc-500 leading-relaxed">
            Você está prestes a acessar o App da Simplizzia —<br />
            onde cada demanda tem seu lugar, os clientes aprovam<br />
            com facilidade e a equipe entrega com leveza.<br />
            <span className="font-medium text-zinc-700">É aqui que a mágica acontece.</span>
          </p>
          <p className="text-xs text-zinc-400">— Izzi, assistente da Simplizzia</p>
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
  )
}
