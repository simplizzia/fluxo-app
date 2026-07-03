import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { requireAcessoCliente } from '@/lib/imagens/acesso'
import { createClient } from '@/lib/supabase/server'
import { ImagensTabs } from './ImagensTabs'

export default async function ImagensClienteLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ clienteId: string }>
}) {
  const { clienteId } = await params
  const { isAdmin } = await requireAcessoCliente(clienteId)

  const supabase = await createClient()
  const { data: cliente } = await supabase
    .from('clientes')
    .select('id, nome')
    .eq('id', clienteId)
    .single()

  if (!cliente) notFound()

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/imagens"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-gradient-brand text-sm font-bold text-white">
          {cliente.nome[0].toUpperCase()}
        </div>
        <div>
          <h1 className="font-display text-lg font-bold text-ink">{cliente.nome}</h1>
          <p className="text-[11px] text-zinc-400">Produção de Imagem IA</p>
        </div>
      </div>

      <ImagensTabs clienteId={clienteId} isAdmin={isAdmin} />

      {children}
    </div>
  )
}
