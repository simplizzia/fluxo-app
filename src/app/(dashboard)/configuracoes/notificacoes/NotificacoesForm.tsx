'use client'

import { useState, useTransition } from 'react'
import { Mail, Bell, CheckCircle2, Loader2, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { PreferenciaEvento, NotifPreference } from './page'

interface Props {
  profileId: string
  organizationId: string
  eventos: PreferenciaEvento[]
  prefsIniciais: Record<string, NotifPreference>
  ehDigestElegivel: boolean
}

export function NotificacoesForm({ profileId, organizationId, eventos, prefsIniciais, ehDigestElegivel }: Props) {
  const [prefs, setPrefs] = useState<Record<string, NotifPreference>>(prefsIniciais)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [isPending, startTransition] = useTransition()

  function getPref(evento: string): NotifPreference {
    return prefs[evento] ?? {
      evento,
      canal_email: true,
      canal_inapp: true,
      digest_diario: false,
    }
  }

  function toggleCanal(evento: string, canal: 'canal_email' | 'canal_inapp' | 'digest_diario') {
    setPrefs((prev) => ({
      ...prev,
      [evento]: {
        ...getPref(evento),
        [canal]: !getPref(evento)[canal],
      },
    }))
    setSalvo(false)
  }

  async function salvar() {
    setSalvando(true)
    const supabase = createClient()

    // Upsert todas as preferências
    const rows = eventos.map((e) => ({
      organization_id: organizationId,
      usuario_id: profileId,
      ...getPref(e.evento),
    }))

    await supabase
      .from('notification_preferences')
      .upsert(rows, { onConflict: 'usuario_id,evento' })

    setSalvo(true)
    setSalvando(false)
    setTimeout(() => setSalvo(false), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Legenda de canais */}
      <div className="flex items-center gap-6 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5 text-blue-500" />
          E-mail
        </span>
        <span className="flex items-center gap-1.5">
          <Bell className="h-3.5 w-3.5 text-violet-500" />
          In-app (sino)
        </span>
        {ehDigestElegivel && (
          <span className="flex items-center gap-1.5">
            <RefreshCw className="h-3.5 w-3.5 text-emerald-500" />
            Digest diário
          </span>
        )}
      </div>

      {/* Linhas de eventos */}
      <div className="rounded-2xl border border-zinc-200 bg-white divide-y divide-zinc-100">
        {eventos.map((ev) => {
          const p = getPref(ev.evento)
          return (
            <div key={ev.evento} className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-800">{ev.label}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">{ev.descricao}</p>
              </div>

              <div className="flex items-center gap-5 flex-none">
                {/* E-mail */}
                <label className="flex flex-col items-center gap-1 cursor-pointer">
                  <Mail className="h-3.5 w-3.5 text-zinc-300" />
                  <input
                    type="checkbox"
                    checked={p.canal_email}
                    onChange={() => toggleCanal(ev.evento, 'canal_email')}
                    className="h-4 w-4 rounded accent-blue-500 cursor-pointer"
                  />
                </label>

                {/* In-app */}
                <label className="flex flex-col items-center gap-1 cursor-pointer">
                  <Bell className="h-3.5 w-3.5 text-zinc-300" />
                  <input
                    type="checkbox"
                    checked={p.canal_inapp}
                    onChange={() => toggleCanal(ev.evento, 'canal_inapp')}
                    className="h-4 w-4 rounded accent-violet-500 cursor-pointer"
                  />
                </label>

                {/* Digest diário (socia/gestao) */}
                {ehDigestElegivel && (
                  <label className="flex flex-col items-center gap-1 cursor-pointer">
                    <RefreshCw className="h-3.5 w-3.5 text-zinc-300" />
                    <input
                      type="checkbox"
                      checked={p.digest_diario}
                      onChange={() => toggleCanal(ev.evento, 'digest_diario')}
                      className="h-4 w-4 rounded accent-emerald-500 cursor-pointer"
                    />
                  </label>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Salvar */}
      <div className="flex items-center gap-3">
        <button
          onClick={salvar}
          disabled={salvando || isPending}
          className="flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 transition disabled:opacity-60"
        >
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {salvo ? 'Salvo!' : salvando ? 'Salvando...' : 'Salvar Preferências'}
        </button>
        <p className="text-xs text-zinc-400">
          As alterações entram em vigor imediatamente.
        </p>
      </div>
    </div>
  )
}
