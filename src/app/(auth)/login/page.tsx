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

        {/* Logo + subtítulo */}
        <div className="flex flex-col items-center gap-3">
          <Image
            src="/logo-simplizzia.png"
            alt="Simplizzia"
            width={160}
            height={54}
            style={{ height: 'auto' }}
            priority
          />
          <p className="text-sm text-zinc-500">Entre na sua conta para continuar</p>
        </div>

        {/* Formulário — gerencia seu próprio card e a seção da Izzi */}
        <LoginForm />

      </div>
    </div>
  )
}
