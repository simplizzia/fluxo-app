'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { slug: 'montador', label: 'Montador' },
  { slug: 'produtos', label: 'Produtos' },
  { slug: 'variacoes', label: 'Variações' },
  { slug: 'personagens', label: 'Personagens' },
  { slug: 'historico', label: 'Histórico' },
  { slug: 'bloco-mestre', label: 'Bloco Mestre' },
]

export function ImagensTabs({
  clienteId,
}: {
  clienteId: string
  isAdmin: boolean
}) {
  const pathname = usePathname()

  return (
    <nav className="flex gap-1 overflow-x-auto rounded-xl border border-zinc-200 bg-white p-1">
      {TABS.map((tab) => {
        const href = `/imagens/${clienteId}/${tab.slug}`
        const ativo = pathname.startsWith(href)
        return (
          <Link
            key={tab.slug}
            href={href}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              ativo
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
