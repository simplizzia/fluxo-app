'use client'

import {
  createContext, useContext, useState, useCallback, useRef, useEffect,
} from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

type ToastVariant = 'izzi' | 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  title?: string
  variant: ToastVariant
}

interface ToastOptions {
  variant?: ToastVariant
  title?: string
  duration?: number
}

interface ToastContextValue {
  toast: (message: string, opts?: ToastOptions) => void
  izzi: (message: string) => void
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast deve ser usado dentro de <ToastProvider>')
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idRef = useRef(0)
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const toast = useCallback((message: string, opts?: ToastOptions) => {
    const id = ++idRef.current
    const variant = opts?.variant ?? 'info'
    setToasts((t) => [...t, { id, message, title: opts?.title, variant }])
    const duration = opts?.duration ?? 4000
    timers.current.set(id, setTimeout(() => remove(id), duration))
  }, [remove])

  const izzi = useCallback((m: string) => toast(m, { variant: 'izzi' }), [toast])
  const success = useCallback((m: string) => toast(m, { variant: 'success' }), [toast])
  const error = useCallback((m: string) => toast(m, { variant: 'error', duration: 6000 }), [toast])

  // Limpa timers pendentes ao desmontar
  useEffect(() => {
    const map = timers.current
    return () => { map.forEach(clearTimeout) }
  }, [])

  return (
    <ToastContext.Provider value={{ toast, izzi, success, error }}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[80] flex max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((item) => (
          <ToastCard key={item.id} item={item} onClose={() => remove(item.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastCard({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-lg"
      style={{ animation: 'toastIn 0.2s ease-out' }}
    >
      <ToastIcon variant={item.variant} />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-brand">{item.title ?? toastTitle(item.variant)}</p>
        <p className="text-xs text-zinc-700">{item.message}</p>
      </div>
      <button
        onClick={onClose}
        aria-label="Fechar aviso"
        className="-mr-1 -mt-0.5 shrink-0 rounded-md p-0.5 text-zinc-300 transition hover:bg-zinc-100 hover:text-zinc-500"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function ToastIcon({ variant }: { variant: ToastVariant }) {
  if (variant === 'izzi') {
    return (
      <div
        className="flex h-7 w-7 flex-none items-center justify-center rounded-xl font-display text-xs font-bold text-white"
        style={{ background: 'linear-gradient(135deg, #A046C6 0%, #F9267C 100%)' }}
        aria-hidden="true"
      >
        I
      </div>
    )
  }
  if (variant === 'success') return <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-emerald-500" aria-hidden="true" />
  if (variant === 'error') return <AlertCircle className="mt-0.5 h-5 w-5 flex-none text-red-500" aria-hidden="true" />
  return <Info className="mt-0.5 h-5 w-5 flex-none text-zinc-400" aria-hidden="true" />
}

function toastTitle(variant: ToastVariant): string {
  if (variant === 'izzi') return 'Izzi'
  if (variant === 'success') return 'Tudo certo'
  if (variant === 'error') return 'Ops'
  return 'Aviso'
}
