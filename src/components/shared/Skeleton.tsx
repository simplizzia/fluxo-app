/** Placeholder de carregamento com shimmer. Use enquanto dados aninhados carregam. */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-zinc-100 ${className}`}
    />
  )
}

/** Bloco de linhas de skeleton para listas (comentários, arquivos). */
export function SkeletonLines({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div role="status" aria-label="Carregando" className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  )
}
