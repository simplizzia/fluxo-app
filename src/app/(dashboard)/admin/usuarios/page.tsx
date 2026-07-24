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

  const [{ data: profiles }, { data: authData }, { data: clientes }, { data: contatos }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id, user_id, nome, papel, ativo, created_at')
        .eq('organization_id', socia.organization_id)
        .order('created_at', { ascending: false }),
      supabase.auth.admin.listUsers({ perPage: 1000 }),
      supabase
        .from('clientes')
        .select('id, nome')
        .eq('organization_id', socia.organization_id)
        .order('nome'),
      // Vínculo usuário ↔ cliente. É o que auth_cliente_ids() lê para decidir
      // o que um usuário de papel `cliente` enxerga; sem linha aqui, ele entra
      // num app vazio. Exibido na tabela para que a falta seja visível.
      supabase
        .from('contatos_cliente')
        .select('user_id, ativo, cliente:clientes!cliente_id(nome)')
        .eq('organization_id', socia.organization_id),
    ])

  const emailPorUserId = Object.fromEntries(
    (authData?.users ?? []).map((u) => [u.id, u.email ?? '']),
  )

  const clientesPorUserId = new Map<string, string[]>()
  for (const c of contatos ?? []) {
    if (!c.ativo) continue
    const nome = (c.cliente as { nome: string } | null)?.nome
    if (!nome) continue
    clientesPorUserId.set(c.user_id, [...(clientesPorUserId.get(c.user_id) ?? []), nome])
  }

  const usuarios = (profiles ?? []).map((p) => ({
    profileId: p.id,
    userId: p.user_id,
    nome: p.nome,
    email: emailPorUserId[p.user_id] ?? '',
    papel: p.papel,
    ativo: p.ativo,
    createdAt: p.created_at,
    clientesVinculados: clientesPorUserId.get(p.user_id) ?? [],
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Usuários</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Gerencie os acessos da equipe e dos clientes na plataforma.
        </p>
      </div>
      <UsuariosTabela usuarios={usuarios} clientes={clientes ?? []} />
    </div>
  )
}
