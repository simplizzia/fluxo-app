'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Componente invisível que escuta Realtime e chama router.refresh()
 * quando cards mudam de/para `para_aprovacao`.
 *
 * Usado no dashboard do cliente para manter a lista de aprovações
 * sincronizada sem necessidade de polling ou recarga manual.
 */
export function RealtimeRefresher({ organizationId }: { organizationId: string }) {
  const router = useRouter()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`dash-cliente-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cards',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          const novoStatus = (payload.new as { status?: string } | null)?.status
          const statusAnterior = (payload.old as { status?: string } | null)?.status

          // Só faz refresh se a mudança for relevante para aprovação
          if (novoStatus === 'para_aprovacao' || statusAnterior === 'para_aprovacao') {
            // Debounce: evita múltiplos refreshes em rápida sucessão
            if (timerRef.current) clearTimeout(timerRef.current)
            timerRef.current = setTimeout(() => router.refresh(), 500)
          }
        },
      )
      .subscribe()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      supabase.removeChannel(channel)
    }
  }, [organizationId, router])

  return null
}
