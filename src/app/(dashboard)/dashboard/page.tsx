import type { Metadata } from 'next'
import { getCurrentProfile } from '@/lib/dal'
import { DashboardSocia } from '@/components/dashboard/DashboardSocia'
import { DashboardGestao } from '@/components/dashboard/DashboardGestao'
import { DashboardAtendimento } from '@/components/dashboard/DashboardAtendimento'
import { DashboardExecutor } from '@/components/dashboard/DashboardExecutor'
import { DashboardCliente } from '@/components/dashboard/DashboardCliente'

export const metadata: Metadata = {
  title: 'Dashboard — Simplizzia',
}

export default async function DashboardPage() {
  const profile = await getCurrentProfile()

  const saudacao = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
  })()

  return (
    <div className="space-y-7">
      {/* Saudação */}
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">
          {saudacao}, {profile.nome.split(' ')[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Aqui está um resumo da operação de hoje.
        </p>
      </div>

      {/* Dashboard por papel */}
      {profile.papel === 'socia' && <DashboardSocia />}
      {profile.papel === 'gestao' && <DashboardGestao />}
      {profile.papel === 'atendimento' && <DashboardAtendimento />}
      {profile.papel === 'executor' && <DashboardExecutor />}
      {profile.papel === 'cliente' && <DashboardCliente />}
    </div>
  )
}
