import type { Metadata } from 'next'
import { requireAcessoCliente } from '@/lib/imagens/acesso'
import { gerarUrlsAssinadas } from '@/lib/imagens/storage'
import { createClient } from '@/lib/supabase/server'
import { HistoricoClient } from './HistoricoClient'

export const metadata: Metadata = {
  title: 'Histórico de Prompts — Simplizzia',
}

export default async function HistoricoPage({
  params,
}: {
  params: Promise<{ clienteId: string }>
}) {
  const { clienteId } = await params
  await requireAcessoCliente(clienteId)
  const supabase = await createClient()

  const [{ data: cenas }, { data: produtos }, { data: casosCandidatos }] = await Promise.all([
    supabase
      .from('imagens_cenas')
      .select(`
        id, personagem_texto, acao_pose, produto_id, variacao_atributo_id, formato,
        nota_especial, prompt_final, negativos_final, ferramenta_recomendada, status,
        nota_regua, imagem_resultado_path, created_at,
        produto:imagens_produtos(nome),
        variacao:imagens_variacao_atributos(valor)
      `)
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('imagens_produtos')
      .select('id, nome')
      .eq('cliente_id', clienteId)
      .order('nome'),
    supabase
      .from('imagens_casos_calibracao')
      .select('id, dimensao_regua, descricao_erro, vezes_visto')
      .eq('cliente_id', clienteId)
      .eq('status', 'candidato')
      .order('created_at', { ascending: false }),
  ])

  const urls = await gerarUrlsAssinadas((cenas ?? []).map((c) => c.imagem_resultado_path))

  return (
    <HistoricoClient
      clienteId={clienteId}
      cenas={(cenas ?? []).map((c) => ({
        ...c,
        produto_nome: c.produto?.nome ?? null,
        variacao_valor: c.variacao?.valor ?? null,
      }))}
      produtos={produtos ?? []}
      casosCandidatos={casosCandidatos ?? []}
      urlsAssinadas={urls}
    />
  )
}
