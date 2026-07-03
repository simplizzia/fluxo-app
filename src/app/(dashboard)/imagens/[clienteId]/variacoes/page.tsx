import type { Metadata } from 'next'
import { requireAcessoCliente } from '@/lib/imagens/acesso'
import { createClient } from '@/lib/supabase/server'
import { VariacoesClient } from './VariacoesClient'

export const metadata: Metadata = {
  title: 'Banco de Variações — Simplizzia',
}

export default async function VariacoesPage({
  params,
}: {
  params: Promise<{ clienteId: string }>
}) {
  const { clienteId } = await params
  const { isAdmin } = await requireAcessoCliente(clienteId)
  const supabase = await createClient()

  const [{ data: categorias }, { data: atributos }] = await Promise.all([
    supabase
      .from('imagens_categorias_variacao')
      .select('id, tipo')
      .eq('cliente_id', clienteId)
      .order('tipo'),
    supabase
      .from('imagens_variacao_atributos')
      .select('id, categoria_id, valor, vezes_usado, status')
      .eq('cliente_id', clienteId)
      .order('vezes_usado'),
  ])

  return (
    <VariacoesClient
      clienteId={clienteId}
      categorias={categorias ?? []}
      atributos={atributos ?? []}
      isAdmin={isAdmin}
    />
  )
}
