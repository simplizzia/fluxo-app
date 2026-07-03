import type { Metadata } from 'next'
import Link from 'next/link'
import { Image as ImageIcon, ChevronRight, AlertTriangle, SlidersHorizontal, Users } from 'lucide-react'
import { buscarClientesImagens } from './actions'

export const metadata: Metadata = {
  title: 'Imagens IA — Simplizzia',
}

export default async function ImagensPage() {
  const { clientes, isAdmin, error } = await buscarClientesImagens()

  if (error) return <p className="text-sm text-red-600">{error}</p>
  const lista = clientes ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
            <ImageIcon className="h-6 w-6 text-brand" />
            Produção de Imagem IA
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Selecione o cliente para montar prompts com o padrão da marca.
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Link
              href="/imagens/calibracao"
              className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Calibração
            </Link>
            <Link
              href="/imagens/acessos"
              className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50"
            >
              <Users className="h-3.5 w-3.5" />
              Acessos
            </Link>
          </div>
        )}
      </div>

      {lista.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-10 text-center">
          <p className="text-sm text-zinc-400">
            {isAdmin
              ? 'Nenhum cliente ativo cadastrado ainda.'
              : 'Você ainda não tem acesso a nenhum cliente neste módulo. Peça liberação a uma sócia ou à gestão.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <div className="divide-y divide-zinc-100">
            {lista.map((cliente) => (
              <Link
                key={cliente.id}
                href={`/imagens/${cliente.id}/montador`}
                className="flex items-center gap-4 px-5 py-4 transition hover:bg-zinc-50/70"
              >
                <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-gradient-brand text-sm font-bold text-white">
                  {cliente.nome[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="truncate text-sm font-semibold text-zinc-900">
                    {cliente.nome}
                  </span>
                  {!cliente.temBlocoMestre && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                      <AlertTriangle className="h-3 w-3" />
                      sem Bloco Mestre
                    </span>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-300" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
