import type { Metadata } from 'next'
import { requireAcessoCliente } from '@/lib/imagens/acesso'
import { gerarUrlsAssinadas } from '@/lib/imagens/storage'
import { createClient } from '@/lib/supabase/server'
import { ProdutosClient } from './ProdutosClient'

export const metadata: Metadata = {
  title: 'Fichas de Produto — Simplizzia',
}

export default async function ProdutosPage({
  params,
}: {
  params: Promise<{ clienteId: string }>
}) {
  const { clienteId } = await params
  const { isAdmin } = await requireAcessoCliente(clienteId)
  const supabase = await createClient()

  const { data: produtos } = await supabase
    .from('imagens_produtos')
    .select('id, nome, formato, escala_relativa, tampa, regra_geracao, restricao_conteudo, alerta_contraste, angulos_disponiveis, imagem_referencia_path')
    .eq('cliente_id', clienteId)
    .order('nome')

  const urls = await gerarUrlsAssinadas((produtos ?? []).map((p) => p.imagem_referencia_path))

  return (
    <ProdutosClient
      clienteId={clienteId}
      produtos={produtos ?? []}
      urlsAssinadas={urls}
      isAdmin={isAdmin}
    />
  )
}
