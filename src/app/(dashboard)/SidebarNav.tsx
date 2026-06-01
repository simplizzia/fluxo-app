'use client'

import { useState, useEffect } from 'react'
import {
  ChevronRight,
  LayoutDashboard, Kanban, Calendar, Users, GitBranch,
  Settings, BarChart2, Heart, Star, FileText, Palette, Zap, Bot, Shield,
  DollarSign, Share2, Trophy,
} from 'lucide-react'
import SidebarLinkClient from './SidebarLinkClient'

// Mapa de ícones disponíveis — só strings cruzam a boundary Server→Client
const ICON_MAP = {
  LayoutDashboard, Kanban, Calendar, Users, GitBranch,
  Settings, BarChart2, Heart, Star, FileText, Palette, Zap, Bot, Shield,
  DollarSign, Share2, Trophy,
} as const

export type IconKey = keyof typeof ICON_MAP

export interface NavItem {
  href: string
  label: string
  iconKey: IconKey
}

export interface NavGroup {
  label?: string
  items: NavItem[]
}

interface Props {
  grupos: NavGroup[]
}

const STORAGE_KEY = 'simplizzia:sidebar-collapsed'

export function SidebarNav({ grupos }: Props) {
  // Inicializa com todos os grupos expandidos
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [mounted, setMounted] = useState(false)

  // Carrega estado salvo do localStorage após montar (evita hydration mismatch)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setCollapsed(JSON.parse(saved))
    } catch { /* ignore */ }
    setMounted(true)
  }, [])

  function toggle(label: string) {
    setCollapsed((prev) => {
      const next = { ...prev, [label]: !prev[label] }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }

  return (
    <nav className="flex-1 overflow-y-auto p-3 space-y-1">
      {grupos.map((grupo, gi) => {
        const isCollapsible = !!grupo.label
        const isCollapsed = mounted && isCollapsible && !!collapsed[grupo.label!]

        return (
          <div key={gi} className={gi > 0 && !grupo.label ? 'pt-2' : ''}>
            {/* Rótulo do grupo — clicável se tiver label */}
            {grupo.label && (
              <button
                onClick={() => toggle(grupo.label!)}
                className="group flex w-full items-center justify-between px-3 py-1.5 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 group-hover:text-zinc-500 transition-colors">
                  {grupo.label}
                </span>
                <ChevronRight
                  className={`h-3 w-3 text-zinc-300 transition-transform duration-200 group-hover:text-zinc-400 ${
                    isCollapsed ? '' : 'rotate-90'
                  }`}
                />
              </button>
            )}

            {/* Itens do grupo */}
            <div
              className={`overflow-hidden transition-all duration-200 ease-in-out ${
                isCollapsed ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'
              } ${grupo.label ? 'mt-0.5' : ''}`}
            >
              <div className="space-y-0.5">
                {grupo.items.map((item) => {
                  const Icon = ICON_MAP[item.iconKey]
                  return (
                    <SidebarLinkClient key={item.href} href={item.href} label={item.label}>
                      <Icon className="h-4 w-4 flex-none" />
                    </SidebarLinkClient>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}
    </nav>
  )
}
