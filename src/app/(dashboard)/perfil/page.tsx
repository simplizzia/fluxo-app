import type { Metadata } from 'next'
import { getCurrentProfile } from '@/lib/dal'
import {
  UpdateProfileForm,
  ChangePasswordForm,
} from '@/components/perfil/ProfileForm'

export const metadata: Metadata = {
  title: 'Meu perfil — Simplizzia',
}

export default async function PerfilPage() {
  const profile = await getCurrentProfile()

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Meu perfil</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Gerencie suas informações de acesso.
        </p>
      </div>

      {/* Dados pessoais */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-700">
          Dados pessoais
        </h2>
        <UpdateProfileForm profile={profile} />
      </section>

      {/* Alterar senha */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-700">
          Alterar senha
        </h2>
        <ChangePasswordForm />
      </section>

      {/* Info somente leitura */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-700">
          Informações da conta
        </h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-500">Papel</dt>
            <dd className="font-medium capitalize text-zinc-900">{profile.papel}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">ID do perfil</dt>
            <dd className="font-mono text-xs text-zinc-500">{profile.id}</dd>
          </div>
        </dl>
      </section>
    </div>
  )
}
