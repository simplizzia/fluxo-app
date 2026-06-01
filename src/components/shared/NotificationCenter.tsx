'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, X, CheckCheck, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Notificacao {
  id: string
  tipo: string
  titulo: string
  mensagem: string | null
  link: string | null
  lida: boolean
  created_at: string
}

async function marcarLida(id: string) {
  const supabase = createClient()
  await supabase
    .from('in_app_notificacoes')
    .update({ lida: true })
    .eq('id', id)
}

async function marcarTodasLidas(orgId: string, profileId: string) {
  const supabase = createClient()
  await supabase
    .from('in_app_notificacoes')
    .update({ lida: true })
    .eq('usuario_id', profileId)
    .eq('lida', false)
}

interface Props {
  profileId: string
  organizationId: string
}

export function NotificationCenter({ profileId, organizationId }: Props) {
  const [aberto, setAberto] = useState(false)
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [, startTransition] = useTransition()
  const panelRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const naoLidas = notificacoes.filter((n) => !n.lida).length

  // Fechar ao clicar fora
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    if (aberto) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [aberto])

  // Carregar notificações
  async function carregar() {
    const supabase = createClient()
    const { data } = await supabase
      .from('in_app_notificacoes')
      .select('id, tipo, titulo, mensagem, link, lida, created_at')
      .eq('usuario_id', profileId)
      .order('created_at', { ascending: false })
      .limit(30)
    setNotificacoes((data ?? []) as Notificacao[])
  }

  useEffect(() => {
    carregar()
    // Realtime subscription para novas notificações
    const supabase = createClient()
    const channel = supabase
      .channel('notif-center')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'in_app_notificacoes',
          filter: `usuario_id=eq.${profileId}`,
        },
        () => carregar(),
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId])

  function handleAbrir() {
    setAberto(true)
    if (!aberto) carregar()
  }

  function handleMarcarLida(notif: Notificacao) {
    startTransition(async () => {
      await marcarLida(notif.id)
      setNotificacoes((prev) => prev.map((n) => n.id === notif.id ? { ...n, lida: true } : n))
      if (notif.link) {
        setAberto(false)
        router.push(notif.link)
      }
    })
  }

  function handleMarcarTodas() {
    startTransition(async () => {
      await marcarTodasLidas(organizationId, profileId)
      setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })))
    })
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Botão sino */}
      <button
        onClick={handleAbrir}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 transition"
      >
        <Bell className="h-4 w-4" />
        {naoLidas > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {/* Painel */}
      {aberto && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl border border-zinc-200 bg-white shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-zinc-900">Notificações</h3>
            <div className="flex items-center gap-2">
              {naoLidas > 0 && (
                <button
                  onClick={handleMarcarTodas}
                  className="flex items-center gap-1 text-[11px] text-violet-600 hover:text-violet-700"
                >
                  <CheckCheck className="h-3 w-3" />
                  Marcar todas como lidas
                </button>
              )}
              <button onClick={() => setAberto(false)} className="text-zinc-300 hover:text-zinc-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Lista */}
          <div className="max-h-96 overflow-y-auto">
            {notificacoes.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-zinc-400">
                <Bell className="h-8 w-8 text-zinc-200 mx-auto mb-2" />
                Nenhuma notificação ainda.
              </div>
            ) : (
              notificacoes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleMarcarLida(n)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-zinc-50 hover:bg-zinc-50 transition ${
                    !n.lida ? 'bg-violet-50/50' : ''
                  }`}
                >
                  {!n.lida && (
                    <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-violet-500" />
                  )}
                  {n.lida && <span className="mt-1.5 h-2 w-2 flex-none" />}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${n.lida ? 'text-zinc-500' : 'text-zinc-800'}`}>
                      {n.titulo}
                    </p>
                    {n.mensagem && (
                      <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-2">{n.mensagem}</p>
                    )}
                    <p className="text-[10px] text-zinc-300 mt-1">
                      {new Date(n.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  {n.link && <ExternalLink className="h-3.5 w-3.5 text-zinc-300 flex-none mt-0.5" />}
                </button>
              ))
            )}
          </div>

          {/* Footer — link para preferências */}
          <div className="border-t border-zinc-100 px-4 py-2.5">
            <button
              onClick={() => { setAberto(false); router.push('/configuracoes/notificacoes') }}
              className="text-[11px] text-zinc-400 hover:text-zinc-600 transition"
            >
              Preferências de notificação →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
