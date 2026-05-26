import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'Entrar — Simplizzia',
}

export default function LoginPage() {
  return (
    <div className="space-y-8">
      {/* Logotipo / cabeçalho */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900">
          <span className="text-lg font-bold text-white">S</span>
        </div>
        <h1 className="text-xl font-semibold text-zinc-900">Simplizzia</h1>
        <p className="mt-1 text-sm text-zinc-500">Entre na sua conta</p>
      </div>

      {/* Card do formulário */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <LoginForm />
      </div>
    </div>
  )
}
