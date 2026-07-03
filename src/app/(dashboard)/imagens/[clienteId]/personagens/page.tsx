import type { Metadata } from 'next'
import { requireAcessoCliente } from '@/lib/imagens/acesso'
import { gerarUrlsAssinadas } from '@/lib/imagens/storage'
import { createClient } from '@/lib/supabase/server'
import { PersonagensClient } from './PersonagensClient'

export const metadata: Metadata = {
  title: 'Personagens — Simplizzia',
}

export default async function PersonagensPage({
  params,
}: {
  params: Promise<{ clienteId: string }>
}) {
  const { clienteId } = await params
  const { isAdmin } = await requireAcessoCliente(clienteId)
  const supabase = await createClient()

  const { data: personagens } = await supabase
    .from('imagens_personagens')
    .select('id, nome, descricao_fixa, alerta_contaminacao, imagem_referencia_path')
    .eq('cliente_id', clienteId)
    .order('nome')

  const urls = await gerarUrlsAssinadas((personagens ?? []).map((p) => p.imagem_referencia_path))

  return (
    <PersonagensClient
      clienteId={clienteId}
      personagens={personagens ?? []}
      urlsAssinadas={urls}
      isAdmin={isAdmin}
    />
  )
}
