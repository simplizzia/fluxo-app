import type { Metadata } from 'next'
import { EsqueciSenhaForm } from '@/components/auth/EsqueciSenhaForm'

export const metadata: Metadata = {
  title: 'Esqueci a senha — Simplizzia',
}

export default function EsqueciSenhaPage() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900">
          <span className="text-lg font-bold text-white">S</span>
        </div>
        <h1 className="text-xl font-semibold text-zinc-900">Recuperar acesso</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Informe seu e-mail e enviaremos um link para redefinir a senha
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <EsqueciSenhaForm />
      </div>

      <p className="text-center text-sm text-zinc-500">
        Lembrou a senha?{' '}
        <a href="/login" className="font-medium text-zinc-900 underline underline-offset-2 hover:text-zinc-700">
          Voltar ao login
        </a>
      </p>
    </div>
  )
}
