import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SetPasswordForm } from '@/components/auth/SetPasswordForm'

export const metadata: Metadata = {
  title: 'Definir senha — Simplizzia',
}

export default async function DefinirSenhaPage() {
  // Verificar se há sessão ativa (usuário chegou via link de convite)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const nomeInicial = user.user_metadata?.nome as string | undefined

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900">
          <span className="text-lg font-bold text-white">S</span>
        </div>
        <h1 className="text-xl font-semibold text-zinc-900">Bem-vindo à Simplizzia</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Configure seu acesso para continuar
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <SetPasswordForm nomeInicial={nomeInicial} />
      </div>
    </div>
  )
}
