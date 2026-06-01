import type { Metadata } from 'next'
import { getCurrentProfile } from '@/lib/dal'
import { CalendarioView } from '@/components/calendario/CalendarioView'
import { buscarCardsCalendario, buscarAlertasPrazo } from './actions'

export const metadata: Metadata = {
  title: 'Calendário — Simplizzia',
}

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  const { mes: mesParam } = await searchParams
  const profile = await getCurrentProfile()

  // Valida e normaliza o parâmetro do mês
  const hoje = new Date()
  const anoMes =
    mesParam && /^\d{4}-\d{2}$/.test(mesParam)
      ? mesParam
      : `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`

  const [{ cards = [] }, { alertas = [] }] = await Promise.all([
    buscarCardsCalendario(anoMes),
    buscarAlertasPrazo(),
  ])

  return (
    <CalendarioView
      cards={cards}
      anoMes={anoMes}
      alertas={alertas}
      papel={profile.papel}
    />
  )
}
