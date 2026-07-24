import type { Metadata } from 'next'
import { requireSocia } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { InviteForm } from '@/components/admin/InviteForm'

export const metadata: Metadata = {
  title: 'Convidar usuário — Simplizzia',
}

// Somente sócias acessam esta página.
// requireSocia() redireciona automaticamente se outro papel tentar acessar.
export default async function ConvidarPage() {
  await requireSocia()

  // Necessário para convites de papel `cliente`: a pessoa precisa ser vinculada
  // a um cliente, senão entra num app vazio. RLS já limita à própria org.
  const supabase = await createClient()
  const { data: clientes } = await supabase
    .from('clientes')
    .select('id, nome')
    .order('nome')

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
        <InviteForm clientes={clientes ?? []} />
      </div>
    </div>
  )
}
