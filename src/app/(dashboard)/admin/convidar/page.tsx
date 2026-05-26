import type { Metadata } from 'next'
import { requireSocia } from '@/lib/dal'
import { InviteForm } from '@/components/admin/InviteForm'

export const metadata: Metadata = {
  title: 'Convidar usuário — Simplizzia',
}

// Somente sócias acessam esta página.
// requireSocia() redireciona automaticamente se outro papel tentar acessar.
export default async function ConvidarPage() {
  await requireSocia()

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Convidar usuário</h1>
        <p className="mt-1 text-sm text-zinc-500">
          O usuário receberá um e-mail com o link para definir sua senha e
          acessar a plataforma.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <InviteForm />
      </div>
    </div>
  )
}
