import type { Metadata } from 'next'
import { requireSocia } from '@/lib/dal'
import { createServiceClient } from '@/lib/supabase/server'
import { UsuariosTabela } from '@/components/admin/UsuariosTabela'

export const metadata: Metadata = {
  title: 'Usuários — Simplizzia',
}

export default async function UsuariosPage() {
  const socia = await requireSocia()
  const supabase = createServiceClient()

  const [{ data: profiles }, { data: authData }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, user_id, nome, papel, ativo, created_at')
      .eq('organization_id', socia.organization_id)
      .order('created_at', { ascending: false }),
    supabase.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const emailPorUserId = Object.fromEntries(
    (authData?.users ?? []).map((u) => [u.id, u.email ?? '']),
  )

  const usuarios = (profiles ?? []).map((p) => ({
    profileId: p.id,
    userId: p.user_id,
    nome: p.nome,
    email: emailPorUserId[p.user_id] ?? '',
    papel: p.papel,
    ativo: p.ativo,
    createdAt: p.created_at,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Usuários</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Gerencie os acessos da equipe e dos clientes na plataforma.
        </p>
      </div>
      <UsuariosTabela usuarios={usuarios} />
    </div>
  )
}
