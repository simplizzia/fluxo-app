// ---------------------------------------------------------------------------
// NpsScore — visualização do score NPS (-100 a +100)
// ---------------------------------------------------------------------------

interface NpsScoreProps {
  score: number | null
  total: number
  size?: 'sm' | 'md' | 'lg'
}

export function NpsScore({ score, total, size = 'md' }: NpsScoreProps) {
  const label =
    score === null ? 'Sem dados'
    : score >= 75 ? 'Excelente'
    : score >= 50 ? 'Muito bom'
    : score >= 0 ? 'Bom'
    : score >= -30 ? 'Precisa melhorar'
    : 'Crítico'

  const colorText =
    score === null ? 'text-zinc-400'
    : score >= 50 ? 'text-green-600'
    : score >= 0 ? 'text-amber-600'
    : 'text-red-600'

  const colorRing =
    score === null ? 'border-zinc-200'
    : score >= 50 ? 'border-green-400'
    : score >= 0 ? 'border-amber-400'
    : 'border-red-400'

  const sz = {
    sm: { circle: 'h-16 w-16 border-[3px]', score: 'text-xl', label: 'text-[10px]', total: 'text-[10px]' },
    md: { circle: 'h-24 w-24 border-4', score: 'text-3xl', label: 'text-xs', total: 'text-xs' },
    lg: { circle: 'h-32 w-32 border-4', score: 'text-5xl', label: 'text-sm', total: 'text-sm' },
  }[size]

  const displayScore =
    score === null ? '—'
    : score > 0 ? `+${score}`
    : `${score}`

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`${sz.circle} flex flex-col items-center justify-center rounded-full bg-white ${colorRing}`}
      >
        <span className={`font-display font-bold leading-none ${sz.score} ${colorText}`}>
          {displayScore}
        </span>
      </div>
      <p className={`font-semibold ${sz.label} ${colorText}`}>{label}</p>
      {total > 0 && (
        <p className={`${sz.total} text-zinc-400`}>
          {total} resposta{total !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// NpsDistribuicao — histograma de distribuição das notas 0-10
// ---------------------------------------------------------------------------

interface NpsDistribuicaoProps {
  distribuicao: Record<number, number>
  total: number
}

export function NpsDistribuicao({ distribuicao, total }: NpsDistribuicaoProps) {
  if (total === 0) {
    return (
      <p className="py-6 text-center text-sm text-zinc-400">
        Nenhuma resposta recebida ainda.
      </p>
    )
  }

  return (
    <div className="space-y-1.5">
      {Array.from({ length: 11 }, (_, i) => i).map((n) => {
        const count = distribuicao[n] ?? 0
        const pct = Math.round((count / total) * 100)
        const bg =
          n <= 6 ? 'bg-red-400' : n <= 8 ? 'bg-amber-400' : 'bg-green-500'

        return (
          <div key={n} className="flex items-center gap-2">
            <span className="w-4 shrink-0 text-right text-[11px] font-medium text-zinc-500">{n}</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-zinc-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${bg}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-6 shrink-0 text-right text-[11px] text-zinc-400">{count}</span>
          </div>
        )
      })}

      {/* Legenda */}
      <div className="mt-3 flex flex-wrap justify-end gap-4 text-[10px] text-zinc-400">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
          Detratores (0–6)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
          Neutros (7–8)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
          Promotores (9–10)
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// NpsStars — exibe nota em estrelas (1-5)
// ---------------------------------------------------------------------------

export function NpsStars({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-zinc-300">—</span>
  return (
    <span className="text-sm leading-none">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= value ? 'text-amber-400' : 'text-zinc-200'}>
          ★
        </span>
      ))}
    </span>
  )
}

// ---------------------------------------------------------------------------
// NpsBadge — chip colorido para uma nota NPS (0-10)
// ---------------------------------------------------------------------------

export function NpsBadge({ nps }: { nps: number }) {
  const [bg, text] =
    nps >= 9
      ? ['bg-green-100', 'text-green-700']
      : nps >= 7
      ? ['bg-amber-100', 'text-amber-700']
      : ['bg-red-100', 'text-red-700']

  return (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold ${bg} ${text}`}
    >
      {nps}
    </span>
  )
}
