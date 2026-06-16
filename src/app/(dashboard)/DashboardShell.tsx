'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { ToastProvider } from '@/components/shared/Toast'

interface DashboardShellProps {
  /** Conteúdo da sidebar (logo, navegação, Izzi, rodapé do usuário). */
  sidebar: React.ReactNode
  /** Conteúdo do header (busca + notificações). */
  headerContent: React.ReactNode
  children: React.ReactNode
}

/**
 * Shell responsivo do dashboard.
 * - lg+: sidebar fixa de 240px sempre visível.
 * - < lg: sidebar vira off-canvas controlado por um botão hambúrguer no header.
 */
export function DashboardShell({ sidebar, headerContent, children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  // Fecha o menu ao navegar entre páginas
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Fecha com Escape e trava o scroll do body enquanto aberto
  useEffect(() => {
    if (!mobileOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  return (
    <ToastProvider>
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      {/* ── Sidebar desktop (lg+) ─────────────────────────────────── */}
      <aside className="hidden w-60 flex-none flex-col border-r border-zinc-200 bg-white lg:flex">
        {sidebar}
      </aside>

      {/* ── Sidebar off-canvas (mobile) ───────────────────────────── */}
      {mobileOpen && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="fixed left-0 top-0 z-50 flex h-full w-72 max-w-[85vw] flex-col border-r border-zinc-200 bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navegação"
          >
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Fechar menu"
              className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
            >
              <X className="h-4 w-4" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      {/* ── Conteúdo principal ────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header com hambúrguer (mobile) + busca + notificações */}
        <header className="flex h-14 flex-none items-center gap-3 border-b border-zinc-200 bg-white px-4 sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
            className="-ml-1 rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex flex-1 items-center justify-between gap-3">
            {headerContent}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6">{children}</div>
        </main>
      </div>
    </div>
    </ToastProvider>
  )
}
