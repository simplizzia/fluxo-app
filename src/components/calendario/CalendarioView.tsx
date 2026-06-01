'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, AlertTriangle, CalendarDays } from 'lucide-react'
import type { CardCalendario, AlertaPrazo } from '@/app/(dashboard)/calendario/actions'
import type { PapelUsuario } from '@/types/database'

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const MESES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const PRIORIDADE_PILL: Record<string, string> = {
  urgente: 'border-l-red-500 bg-red-50 text-red-700',
  alta:    'border-l-orange-400 bg-orange-50 text-orange-700',
  normal:  'border-l-blue-400 bg-blue-50 text-blue-700',
  baixa:   'border-l-zinc-300 bg-zinc-50 text-zinc-500',
}

const STATUS_PONTO: Record<string, string> = {
  aguardando_info:  'bg-amber-400',
  a_fazer:          'bg-zinc-400',
  em_andamento:     'bg-blue-500',
  para_aprovacao:   'bg-violet-500',
  necessita_ajustes:'bg-orange-500',
  concluido:        'bg-green-500',
  cancelado:        'bg-red-400',
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface CalendarioViewProps {
  cards: CardCalendario[]
  anoMes: string
  alertas: AlertaPrazo[]
  papel: PapelUsuario
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function CalendarioView({ cards, anoMes, alertas, papel }: CalendarioViewProps) {
  const router = useRouter()

  const [anoStr, mesStr] = anoMes.split('-')
  const ano = parseInt(anoStr, 10)
  const mes = parseInt(mesStr, 10)

  const primeiroDia = new Date(ano, mes - 1, 1)
  const diaInicio = primeiroDia.getDay() // 0 = domingo
  const diasNoMes = new Date(ano, mes, 0).getDate()

  const hojeStr = new Date().toISOString().split('T')[0]
  const mesAtualStr = hojeStr.slice(0, 7)

  // Agrupa cards por data de prazo
  const cardsPorDia = new Map<string, CardCalendario[]>()
  for (const card of cards) {
    const dia = card.prazo_cliente
    if (!cardsPorDia.has(dia)) cardsPorDia.set(dia, [])
    cardsPorDia.get(dia)!.push(card)
  }

  // Detecta dias com sobreposição de executor (só para equipe)
  const diasComSobreposicao = new Set<string>()
  if (['socia', 'gestao', 'atendimento'].includes(papel)) {
    const contagem: Record<string, number> = {}
    for (const card of cards) {
      if (card.responsavel) {
        const key = `${card.responsavel.id}|${card.prazo_cliente}`
        contagem[key] = (contagem[key] ?? 0) + 1
        if (contagem[key] >= 2) diasComSobreposicao.add(card.prazo_cliente)
      }
    }
  }

  function navegar(delta: number) {
    const novoMes = new Date(ano, mes - 1 + delta, 1)
    const novoAnoMes = `${novoMes.getFullYear()}-${String(novoMes.getMonth() + 1).padStart(2, '0')}`
    router.push(`/calendario?mes=${novoAnoMes}`)
  }

  // Cells: padding inicial + dias do mês
  const totalCells = diaInicio + diasNoMes
  const totalLinhas = Math.ceil(totalCells / 7)

  return (
    <div className="flex flex-col gap-5">
      {/* Cabeçalho da página */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Calendário</h1>
          <p className="mt-0.5 text-sm text-zinc-500">Prazos e entregas por data.</p>
        </div>

        {/* Navegação de mês */}
        <div className="flex items-center gap-2">
          {anoMes !== mesAtualStr && (
            <button
              onClick={() => router.push('/calendario')}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition"
            >
              Hoje
            </button>
          )}
          <div className="flex items-center gap-0 rounded-xl border border-zinc-200 overflow-hidden">
            <button
              onClick={() => navegar(-1)}
              className="flex h-9 w-9 items-center justify-center border-r border-zinc-200 text-zinc-500 hover:bg-zinc-50 transition"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[140px] text-center text-sm font-semibold text-zinc-800 px-4">
              {MESES_PT[mes - 1]} {ano}
            </span>
            <button
              onClick={() => navegar(+1)}
              className="flex h-9 w-9 items-center justify-center border-l border-zinc-200 text-zinc-500 hover:bg-zinc-50 transition"
              aria-label="Próximo mês"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Banner de alertas de prazo (48h) — só para equipe */}
      {alertas.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-orange-500" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-orange-800">
              {alertas.length} {alertas.length === 1 ? 'card com prazo' : 'cards com prazo'} nas próximas 48h ainda não enviados para aprovação
            </p>
            <ul className="mt-2 space-y-1">
              {alertas.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-center gap-2 text-xs text-orange-700">
                  <span className="font-medium">{a.cliente.nome}</span>
                  <span className="text-orange-400">·</span>
                  <span className="truncate">{a.titulo}</span>
                  <span className="ml-auto flex-none font-medium">
                    {formatarData(a.prazo_cliente)}
                  </span>
                </li>
              ))}
              {alertas.length > 5 && (
                <li className="text-xs text-orange-600">
                  + {alertas.length - 5} mais
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Grid do calendário */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        {/* Header dos dias da semana */}
        <div className="grid grid-cols-7 border-b border-zinc-100">
          {DIAS_SEMANA.map((dia) => (
            <div
              key={dia}
              className="py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-400"
            >
              {dia}
            </div>
          ))}
        </div>

        {/* Linhas do mês */}
        <div className="grid grid-cols-7">
          {Array.from({ length: totalLinhas * 7 }).map((_, idx) => {
            const diaNum = idx - diaInicio + 1
            const isDiaDoMes = diaNum >= 1 && diaNum <= diasNoMes

            if (!isDiaDoMes) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="min-h-[120px] border-b border-r border-zinc-100 bg-zinc-50/40 last:border-r-0"
                />
              )
            }

            const diaStr = `${anoMes}-${String(diaNum).padStart(2, '0')}`
            const cardsNoDia = cardsPorDia.get(diaStr) ?? []
            const isHoje = diaStr === hojeStr
            const temSobreposicao = diasComSobreposicao.has(diaStr)
            const estaAtrasado = diaStr < hojeStr && cardsNoDia.length > 0

            const isUltimaDaLinha = (idx + 1) % 7 === 0
            const isUltimaLinha = idx >= (totalLinhas - 1) * 7

            return (
              <div
                key={diaStr}
                className={`min-h-[120px] p-2 flex flex-col gap-1
                  ${!isUltimaDaLinha ? 'border-r border-zinc-100' : ''}
                  ${!isUltimaLinha ? 'border-b border-zinc-100' : ''}
                  ${isHoje ? 'bg-brand-light/30' : ''}
                `}
              >
                {/* Número do dia */}
                <div className="flex items-center justify-between mb-0.5">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold
                      ${isHoje ? 'bg-gradient-brand text-white' : estaAtrasado && cardsNoDia.some(c => !['concluido','cancelado'].includes(c.status)) ? 'text-red-600' : 'text-zinc-500'}
                    `}
                  >
                    {diaNum}
                  </span>

                  {/* Indicadores */}
                  <div className="flex items-center gap-1">
                    {temSobreposicao && (
                      <span
                        title="Sobreposição de prazos: mesmo executor com múltiplos cards"
                        className="h-2 w-2 rounded-full bg-orange-400"
                      />
                    )}
                    {estaAtrasado && cardsNoDia.some(c => !['concluido','cancelado','para_aprovacao'].includes(c.status)) && (
                      <span
                        title="Cards atrasados"
                        className="h-2 w-2 rounded-full bg-red-500"
                      />
                    )}
                  </div>
                </div>

                {/* Cards do dia */}
                {cardsNoDia.slice(0, 3).map((card) => (
                  <CardPill key={card.id} card={card} />
                ))}

                {cardsNoDia.length > 3 && (
                  <Link
                    href={`/board?cliente=${cardsNoDia[0].cliente.id}`}
                    className="mt-0.5 text-center text-[10px] font-medium text-zinc-400 hover:text-zinc-600 transition"
                  >
                    +{cardsNoDia.length - 3} mais
                  </Link>
                )}

                {cardsNoDia.length === 0 && <div className="flex-1" />}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-zinc-500">
        <LegendaItem cor="bg-orange-400" label="Sobreposição de executor" />
        <LegendaItem cor="bg-red-500" label="Card(s) atrasado(s)" />
        <LegendaItem cor="bg-gradient-brand" label="Hoje" className="bg-gradient-brand" />
      </div>

      {/* Estado vazio */}
      {cards.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-200 py-16 text-center">
          <CalendarDays className="h-8 w-8 text-zinc-300" />
          <div>
            <p className="text-sm font-medium text-zinc-500">Nenhum prazo em {MESES_PT[mes - 1]}</p>
            <p className="mt-0.5 text-xs text-zinc-400">Cards com prazo definido aparecem aqui.</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// CardPill — card compacto para célula do calendário
// ---------------------------------------------------------------------------

function CardPill({ card }: { card: CardCalendario }) {
  const pilllClass = PRIORIDADE_PILL[card.prioridade] ?? PRIORIDADE_PILL.normal
  const pontoCor = STATUS_PONTO[card.status] ?? 'bg-zinc-400'

  return (
    <Link
      href={`/board?card=${card.id}`}
      className={`group flex min-w-0 items-start gap-1.5 rounded-lg border-l-[3px] px-1.5 py-1 text-[11px] transition hover:opacity-80 ${pilllClass}`}
      title={`${card.titulo} — ${card.cliente.nome}`}
    >
      <span className={`mt-[3px] h-1.5 w-1.5 flex-none rounded-full ${pontoCor}`} />
      <span className="min-w-0 flex-1 truncate font-medium leading-tight">
        {card.titulo}
      </span>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function LegendaItem({
  cor,
  label,
  className,
}: {
  cor: string
  label: string
  className?: string
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 flex-none rounded-full ${className ?? cor}`} />
      {label}
    </span>
  )
}

function formatarData(iso: string): string {
  const [, , dia] = iso.split('-')
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  const mesIdx = parseInt(iso.split('-')[1], 10) - 1
  return `${parseInt(dia, 10)} ${meses[mesIdx]}`
}
