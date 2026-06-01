/**
 * ScoreBadge — exibe o Health Score com semáforo de cor.
 *
 * Faixas:
 *   saudável  (70–100) → verde
 *   atenção   (40–69)  → âmbar
 *   risco     (0–39)   → vermelho
 *   sem dados          → cinza
 */

type Faixa = 'saudavel' | 'atencao' | 'risco' | 'sem_dados'

function faixaScore(score: number | null): Faixa {
  if (score == null) return 'sem_dados'
  if (score >= 70) return 'saudavel'
  if (score >= 40) return 'atencao'
  return 'risco'
}

const FAIXA_CLASSES: Record<Faixa, { ring: string; bg: string; text: string; label: string }> = {
  saudavel: {
    ring: 'ring-green-400',
    bg: 'bg-green-50',
    text: 'text-green-700',
    label: 'Saudável',
  },
  atencao: {
    ring: 'ring-amber-400',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    label: 'Atenção',
  },
  risco: {
    ring: 'ring-red-400',
    bg: 'bg-red-50',
    text: 'text-red-700',
    label: 'Risco',
  },
  sem_dados: {
    ring: 'ring-zinc-200',
    bg: 'bg-zinc-50',
    text: 'text-zinc-400',
    label: 'Aguardando',
  },
}

interface Props {
  score: number | null
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export function ScoreBadge({ score, size = 'md', showLabel = false }: Props) {
  const faixa = faixaScore(score)
  const { ring, bg, text, label } = FAIXA_CLASSES[faixa]

  const sizeClasses = {
    sm: 'h-10 w-10 text-sm',
    md: 'h-14 w-14 text-lg',
    lg: 'h-20 w-20 text-2xl',
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`flex items-center justify-center rounded-full ring-2 ${ring} ${bg} ${sizeClasses[size]}`}
      >
        <span className={`font-display font-bold leading-none ${text}`}>
          {score ?? '—'}
        </span>
      </div>
      {showLabel && (
        <span className={`text-[10px] font-semibold ${text}`}>{label}</span>
      )}
    </div>
  )
}

/** Chip compacto inline — para listas/tabelas */
export function ScoreChip({ score }: { score: number | null }) {
  const faixa = faixaScore(score)
  const { bg, text } = FAIXA_CLASSES[faixa]

  return (
    <span
      className={`inline-flex min-w-[2.5rem] items-center justify-center rounded-full px-2 py-0.5 font-display text-xs font-bold ${bg} ${text}`}
    >
      {score ?? '—'}
    </span>
  )
}

/** Barra de semáforo inline — para sparklines/tendência */
export function ScoreTendencia({
  atual,
  anterior,
}: {
  atual: number | null
  anterior: number | null
}) {
  if (atual == null || anterior == null) {
    return <span className="text-xs text-zinc-400">—</span>
  }

  const delta = atual - anterior
  if (delta > 3) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-semibold text-green-600">
        ↑ +{delta}
      </span>
    )
  }
  if (delta < -3) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-semibold text-red-600">
        ↓ {delta}
      </span>
    )
  }
  return <span className="text-xs font-medium text-zinc-400">→ {delta > 0 ? `+${delta}` : delta}</span>
}

/** Sparkline SVG simples — histórico de scores */
export function ScoreSparkline({
  scores,
}: {
  scores: Array<{ score: number }>
}) {
  if (scores.length < 2) {
    return <div className="h-8 w-20 rounded bg-zinc-100" />
  }

  const values = scores.map((s) => s.score)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 10

  const W = 80
  const H = 32
  const PAD = 3

  const pts = values.map((v, i) => {
    const x = PAD + (i / (values.length - 1)) * (W - PAD * 2)
    const y = PAD + (1 - (v - min) / range) * (H - PAD * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const lastScore = values[0]
  const lineColor =
    lastScore >= 70 ? '#16a34a'
    : lastScore >= 40 ? '#d97706'
    : '#dc2626'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="overflow-visible">
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={lineColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dot no ponto mais recente */}
      {(() => {
        const [x, y] = pts[0].split(',').map(Number)
        return (
          <circle cx={x} cy={y} r={2.5} fill={lineColor} />
        )
      })()}
    </svg>
  )
}
