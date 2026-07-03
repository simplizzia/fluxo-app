import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Users } from 'lucide-react'
import { requireImagensAdmin } from '@/lib/imagens/acesso'
import { createClient } from '@/lib/supabase/server'
import { AcessosClient } from './AcessosClient'

export const metadata: Metadata = {
  title: 'Acessos — Imagens IA — Simplizzia',
}

export default async function AcessosPage() {
  await requireImagensAdmin()
  const supabase = await createClient()

  const [{ data: usuarios }, { data: clientes }, { data: acessos }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, nome, papel')
      .in('papel', ['atendimento', 'executor'])
      .order('nome'),
    supabase
      .from('clientes')
      .select('id, nome')
      .neq('status', 'inativo')
      .order('nome'),
    supabase.from('imagens_acesso').select('profile_id, cliente_id'),
  ])

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/imagens"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
            <Users className="h-5 w-5 text-brand" />
            Acessos — Produção de Imagem
          </h1>
          <p className="text-xs text-zinc-500">
            Quais usuários de produção (atendimento/executor) acessam quais clientes.
            Sócias e gestão sempre veem tudo.
          </p>
        </div>
      </div>

      <AcessosClient
        usuarios={usuarios ?? []}
        clientes={clientes ?? []}
        acessos={acessos ?? []}
      />
    </div>
  )
}
