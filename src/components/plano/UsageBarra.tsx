interface UsageBarraProps {
  usados: number
  limite: number
  porcentagem: number
  showLabel?: boolean
  height?: 'sm' | 'md' | 'lg'
}

export function UsageBarra({
  usados,
  limite,
  porcentagem,
  showLabel = true,
  height = 'md',
}: UsageBarraProps) {
  const pct = Math.min(porcentagem, 100)

  const barColor =
    porcentagem >= 100
      ? 'bg-red-500'
      : porcentagem >= 80
        ? 'bg-orange-400'
        : 'bg-brand'

  const bgColor =
    porcentagem >= 100
      ? 'bg-red-100'
      : porcentagem >= 80
        ? 'bg-orange-100'
        : 'bg-zinc-100'

  const barHeight = height === 'sm' ? 'h-1.5' : height === 'lg' ? 'h-3' : 'h-2'

  return (
    <div className="w-full">
      {showLabel && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-semibold text-zinc-700">
            {usados}{' '}
            <span className="font-normal text-zinc-400">de {limite} demandas</span>
          </span>
          <span
            className={`font-semibold ${
              porcentagem >= 100
                ? 'text-red-600'
                : porcentagem >= 80
                  ? 'text-orange-600'
                  : 'text-zinc-500'
            }`}
          >
            {porcentagem}%
          </span>
        </div>
      )}
      <div className={`w-full overflow-hidden rounded-full ${bgColor} ${barHeight}`}>
        <div
          className={`${barHeight} rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
