import Link from 'next/link'
import { ArrowLeft, Calendar } from 'lucide-react'
import { getCurrentProfile } from '@/lib/dal'
import { buscarPerfilsEquipe, buscarClientesEProspects } from '../actions'
import { NovaReuniaoForm } from './NovaReuniaoForm'

export default async function NovaReuniaoPage() {
  const [profile, perfis, { clientes, prospects }] = await Promise.all([
    getCurrentProfile(),
    buscarPerfilsEquipe(),
    buscarClientesEProspects(),
  ])

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Link href="/reunioes" className="flex items-center gap-1.5 hover:text-zinc-800 transition">
          <ArrowLeft className="h-3.5 w-3.5" />
          Reuniões
        </Link>
        <span>/</span>
        <span className="text-zinc-800 font-medium">Nova Reunião</span>
      </div>

      {/* Título */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
          <Calendar className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-zinc-900">Nova Reunião</h1>
          <p className="text-xs text-zinc-500">Registre a reunião e gere o resumo automático depois</p>
        </div>
      </div>

      <NovaReuniaoForm
        perfis={perfis}
        clientes={clientes}
        prospects={prospects}
        profileId={profile.id}
        papel={profile.papel}
      />
    </div>
  )
}
