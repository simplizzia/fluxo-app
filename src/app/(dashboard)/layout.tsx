import { getCurrentProfile } from '@/lib/dal'
import { actionLogout } from '@/app/(auth)/login/actions'

/**
 * Layout do dashboard — todas as rotas autenticadas passam por aqui.
 * getCurrentProfile() verifica a sessão e redireciona para /login se necessário.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getCurrentProfile()

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header temporário — substituído pela sidebar no Sprint 1.1 */}
      <header className="border-b border-zinc-200 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900">
              <span className="text-xs font-bold text-white">S</span>
            </div>
            <span className="text-sm font-semibold text-zinc-900">Simplizzia</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-600">{profile.nome}</span>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
              {profile.papel}
            </span>
            <form>
              <button
                formAction={actionLogout}
                className="text-sm text-zinc-500 transition hover:text-zinc-800"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</main>
    </div>
  )
}
