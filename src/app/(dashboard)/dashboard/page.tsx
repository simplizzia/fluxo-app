import type { Metadata } from 'next'
import { getCurrentProfile } from '@/lib/dal'

export const metadata: Metadata = {
  title: 'Dashboard — Simplizzia',
}

export default async function DashboardPage() {
  const profile = await getCurrentProfile()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          Olá, {profile.nome.split(' ')[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Sprint 0.2 concluído — Auth + RBAC funcionando.
          O Kanban e o restante dos módulos chegam nos próximos sprints.
        </p>
      </div>

      {/* Cards de status do sprint */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatusCard label="Autenticação" status="ok" />
        <StatusCard label="RBAC + RLS" status="ok" />
        <StatusCard label="Kanban" status="next" />
      </div>

      {/* Info do perfil atual */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-zinc-700">Seu perfil</h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-zinc-500">Nome</dt>
            <dd className="font-medium text-zinc-900">{profile.nome}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Papel</dt>
            <dd className="font-medium text-zinc-900">{profile.papel}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Organização</dt>
            <dd className="font-mono text-xs text-zinc-600">
              {profile.organization_id}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

function StatusCard({
  label,
  status,
}: {
  label: string
  status: 'ok' | 'next' | 'pending'
}) {
  const styles = {
    ok: 'border-green-200 bg-green-50 text-green-700',
    next: 'border-blue-200 bg-blue-50 text-blue-700',
    pending: 'border-zinc-200 bg-zinc-50 text-zinc-500',
  }
  const icons = { ok: '✓', next: '→', pending: '○' }

  return (
    <div className={`rounded-xl border p-4 ${styles[status]}`}>
      <div className="flex items-center gap-2">
        <span className="font-mono text-lg">{icons[status]}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
    </div>
  )
}
