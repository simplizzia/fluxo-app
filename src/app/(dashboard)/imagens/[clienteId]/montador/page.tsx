import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { requireAcessoCliente } from '@/lib/imagens/acesso'
import { createClient } from '@/lib/supabase/server'
import { MontadorClient } from './MontadorClient'

export const metadata: Metadata = {
  title: 'Montador de Prompt — Simplizzia',
}

export default async function MontadorPage({
  params,
}: {
  params: Promise<{ clienteId: string }>
}) {
  const { clienteId } = await params
  const { isAdmin } = await requireAcessoCliente(clienteId)
  const supabase = await createClient()

  const [{ data: bloco }, { data: produtos }, { data: categorias }, { data: atributos }, { data: personagens }, { data: patches }] =
    await Promise.all([
      supabase
        .from('imagens_bloco_mestre')
        .select('regra_paleta, estilo_luz, sentimento_marca, negativos_padrao, formato_padrao, estilo_geral')
        .eq('cliente_id', clienteId)
        .maybeSingle(),
      supabase
        .from('imagens_produtos')
        .select('id, nome, formato, escala_relativa, tampa, regra_geracao, restricao_conteudo, alerta_contraste')
        .eq('cliente_id', clienteId)
        .order('nome'),
      supabase
        .from('imagens_categorias_variacao')
        .select('id, tipo')
        .eq('cliente_id', clienteId)
        .order('tipo'),
      supabase
        .from('imagens_variacao_atributos')
        .select('id, categoria_id, valor, vezes_usado, status')
        .eq('cliente_id', clienteId),
      supabase
        .from('imagens_personagens')
        .select('id, nome, descricao_fixa, alerta_contaminacao')
        .eq('cliente_id', clienteId)
        .order('nome'),
      supabase
        .from('imagens_patches_tecnicos')
        .select('id, nome, quando_usar, snippet_texto, palavras_chave')
        .order('nome'),
    ])

  if (!bloco) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
        <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-amber-500" />
        <p className="text-sm font-medium text-amber-800">
          Este cliente ainda não tem Bloco Mestre.
        </p>
        <p className="mt-1 text-xs text-amber-700">
          O Bloco Mestre define paleta, luz e negativos que entram em todo prompt.
        </p>
        {isAdmin ? (
          <Link
            href={`/imagens/${clienteId}/bloco-mestre`}
            className="mt-4 inline-block rounded-xl bg-zinc-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-zinc-700"
          >
            Criar Bloco Mestre
          </Link>
        ) : (
          <p className="mt-3 text-xs text-amber-600">
            Peça a uma sócia ou à gestão para preenchê-lo.
          </p>
        )}
      </div>
    )
  }

  return (
    <MontadorClient
      clienteId={clienteId}
      bloco={bloco}
      produtos={produtos ?? []}
      categorias={categorias ?? []}
      atributos={atributos ?? []}
      personagens={personagens ?? []}
      patches={patches ?? []}
    />
  )
}
