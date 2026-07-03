import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, SlidersHorizontal } from 'lucide-react'
import { requireImagensAdmin } from '@/lib/imagens/acesso'
import { createClient } from '@/lib/supabase/server'
import { CalibracaoClient } from './CalibracaoClient'

export const metadata: Metadata = {
  title: 'Calibração — Simplizzia',
}

export default async function CalibracaoPage() {
  await requireImagensAdmin()
  const supabase = await createClient()

  const [{ data: casos }, { data: produtos }] = await Promise.all([
    supabase
      .from('imagens_casos_calibracao')
      .select(`
        id, cliente_id, escopo_do_erro, dimensao_regua, descricao_erro,
        correcao_aplicada, vezes_visto, status, promovido_para, promovido_em,
        created_at,
        cliente:clientes(nome)
      `)
      .order('vezes_visto', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(300),
    supabase.from('imagens_produtos').select('id, cliente_id, nome').order('nome'),
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
            <SlidersHorizontal className="h-5 w-5 text-brand" />
            Calibração
          </h1>
          <p className="text-xs text-zinc-500">
            Erros recorrentes viram sugestão de regra permanente — a promoção é sempre sua decisão.
          </p>
        </div>
      </div>

      <CalibracaoClient
        casos={(casos ?? []).map((c) => ({ ...c, cliente_nome: c.cliente?.nome ?? '—' }))}
        produtos={produtos ?? []}
      />
    </div>
  )
}
