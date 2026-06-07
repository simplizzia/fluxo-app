'use client'

import { useState } from 'react'
import { Users, User, Megaphone, Gift, Mail } from 'lucide-react'
import type { Colaborador } from '@/app/(dashboard)/socias/actions'
import type {
  OnboardingToken,
  ParceiroPerfilResumo,
  AvisoEquipe,
  AtividadeParceiro,
} from '@/app/(dashboard)/socias/pessoas/actions'
import { AbaEquipe } from './AbaEquipe'
import { AbaPerfis } from './AbaPerfis'
import { AbaAvisos } from './AbaAvisos'
import { AbaAtividades } from './AbaAtividades'
import { AbaConvites } from './AbaConvites'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  colaboradores: Colaborador[]
  perfisEquipe: { id: string; nome: string; papel: string }[]
  tokens: OnboardingToken[]
  perfis: ParceiroPerfilResumo[]
  avisos: AvisoEquipe[]
  atividades: AtividadeParceiro[]
}

type Aba = 'equipe' | 'perfis' | 'avisos' | 'atividades' | 'convites'

const ABAS: { key: Aba; label: string; icon: React.ElementType; badge?: (props: Props) => number }[] = [
  { key: 'equipe',     label: 'Equipe',      icon: Users   },
  { key: 'perfis',     label: 'Perfis',      icon: User    },
  { key: 'avisos',     label: 'Avisos',      icon: Megaphone },
  { key: 'atividades', label: 'Atividades',  icon: Gift    },
  { key: 'convites',   label: 'Convites',    icon: Mail,
    badge: (p) => p.tokens.filter((t) => t.status === 'pendente').length },
]

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function PessoasPainel(props: Props) {
  const [abaAtiva, setAbaAtiva] = useState<Aba>('equipe')

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-display font-bold text-zinc-900">Pessoas & Cultura</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Equipe, perfis de parceiros, avisos e atividades de cultura.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-200">
        {ABAS.map(({ key, label, icon: Icon, badge }) => {
          const count = badge?.(props) ?? 0
          return (
            <button
              key={key}
              onClick={() => setAbaAtiva(key)}
              className={[
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px',
                abaAtiva === key
                  ? 'border-violet-600 text-violet-700'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 hover:border-zinc-300',
              ].join(' ')}
            >
              <Icon className="h-4 w-4" />
              {label}
              {count > 0 && (
                <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-100 px-1 text-[10px] font-semibold text-amber-700">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Conteúdo da aba */}
      <div>
        {abaAtiva === 'equipe'     && <AbaEquipe colaboradores={props.colaboradores} />}
        {abaAtiva === 'perfis'     && <AbaPerfis perfis={props.perfis} />}
        {abaAtiva === 'avisos'     && <AbaAvisos avisos={props.avisos} perfisEquipe={props.perfisEquipe} />}
        {abaAtiva === 'atividades' && <AbaAtividades atividades={props.atividades} perfis={props.perfis} />}
        {abaAtiva === 'convites'   && <AbaConvites tokens={props.tokens} />}
      </div>
    </div>
  )
}
