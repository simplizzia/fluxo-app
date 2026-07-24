import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import { requirePapel } from '@/lib/dal'
import { buscarCronograma } from '../actions'
import { listarProdutos } from '@/app/(dashboard)/clientes/[id]/marcas/[marcaId]/produtos-actions'
import { RevisaoCronograma } from './RevisaoCronograma'

export const metadata: Metadata = { title: 'Cronograma — Simplizzia' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function CronogramaPage({ params }: Props) {
  const { id } = await params
  const profile = await requirePapel('socia', 'gestao', 'atendimento', 'executor')
  const dados = await buscarCronograma(id)

  if (dados.error || !dados.resumo) notFound()

  // Produtos ativos da marca, para o seletor de produto na tabela de revisão.
  const { produtos } = await listarProdutos(dados.resumo.marca_id)
  const podeEditar = profile.papel !== 'executor'

  return (
    <div className="space-y-5">
      <nav className="flex items-center gap-1 text-sm text-zinc-500">
        <Link href="/cronogramas" className="flex items-center gap-1 hover:text-zinc-700">
          <ChevronLeft className="h-3.5 w-3.5" />
          Cronogramas
        </Link>
      </nav>

      <RevisaoCronograma
        cronogramaId={id}
        resumo={dados.resumo}
        briefing={dados.briefing}
        temasPilares={dados.temasPilares}
        analiseCoerencia={dados.analiseCoerencia}
        itensIniciais={dados.itens}
        mensagensIniciais={dados.mensagens}
        produtos={produtos ?? []}
        podeEditar={podeEditar}
      />
    </div>
  )
}
