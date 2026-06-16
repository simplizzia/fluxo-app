import { AlertCircle } from 'lucide-react'

/** Mensagem de erro inline padronizada — use sob campos ou seções. */
export function InlineError({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  if (!children) return null
  return (
    <p role="alert" className={`flex items-center gap-1.5 text-xs text-red-600 ${className}`}>
      <AlertCircle className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}
