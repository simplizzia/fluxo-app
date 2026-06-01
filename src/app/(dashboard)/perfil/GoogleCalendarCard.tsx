'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { Calendar, CheckCircle2, AlertCircle, Loader2, Unlink } from 'lucide-react'

interface Props {
  conectado: boolean
  googleEmail: string | null
  onDesconectar: () => Promise<void>
}

export function GoogleCalendarCard({ conectado: conectadoInicial, googleEmail, onDesconectar }: Props) {
  const searchParams = useSearchParams()
  const router       = useRouter()

  const [conectado, setConectado] = useState(conectadoInicial)
  const [email, setEmail]         = useState(googleEmail)
  const [toast, setToast]         = useState<{ tipo: 'success' | 'error'; msg: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  // Lê parâmetro ?google= após retorno do OAuth
  useEffect(() => {
    const status = searchParams.get('google')
    if (!status) return

    if (status === 'conectado') {
      setToast({ tipo: 'success', msg: 'Google Calendar conectado com sucesso!' })
      setConectado(true)
      // Remove o parâmetro da URL sem recarregar a página
      const url = new URL(window.location.href)
      url.searchParams.delete('google')
      router.replace(url.pathname + url.search)
    } else if (status === 'erro' || status === 'negado') {
      setToast({ tipo: 'error', msg: status === 'negado'
        ? 'Autorização negada. Tente novamente.'
        : 'Erro ao conectar. Tente novamente.' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Oculta toast após 5s
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  function handleDesconectar() {
    startTransition(async () => {
      await onDesconectar()
      setConectado(false)
      setEmail(null)
      setToast({ tipo: 'success', msg: 'Google Calendar desconectado.' })
    })
  }

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
            toast.tipo === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {toast.tipo === 'success'
            ? <CheckCircle2 className="h-4 w-4 shrink-0" />
            : <AlertCircle className="h-4 w-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Estado da conexão */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Ícone do Google Calendar */}
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-blue-50">
            <Calendar className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            {conectado ? (
              <>
                <p className="text-sm font-medium text-zinc-900">Conectado</p>
                <p className="text-xs text-zinc-400">{email}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-zinc-700">Google Calendar</p>
                <p className="text-xs text-zinc-400">Não conectado</p>
              </>
            )}
          </div>
        </div>

        {conectado ? (
          <button
            onClick={handleDesconectar}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
          >
            {isPending
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Unlink className="h-3.5 w-3.5" />}
            Desconectar
          </button>
        ) : (
          <a
            href="/api/auth/google"
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Conectar com Google
          </a>
        )}
      </div>

      {/* Descrição */}
      <p className="text-xs text-zinc-400 leading-relaxed">
        {conectado
          ? 'Reuniões criadas no Simplizzia serão automaticamente adicionadas ao seu Google Calendar com lembretes.'
          : 'Conecte sua conta Google para sincronizar reuniões automaticamente com o Google Calendar.'}
      </p>
    </div>
  )
}
