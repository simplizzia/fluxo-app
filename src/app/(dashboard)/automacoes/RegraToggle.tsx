'use client'

import { useTransition } from 'react'
import { actionToggleRegra } from './actions'

interface Props {
  regraId: string
  ativa: boolean
  isSocia: boolean
}

export default function RegraToggle({ regraId, ativa, isSocia }: Props) {
  const [pending, startTransition] = useTransition()

  function toggle() {
    if (!isSocia || pending) return
    startTransition(async () => {
      await actionToggleRegra(regraId, !ativa)
    })
  }

  return (
    <button
      onClick={toggle}
      disabled={!isSocia || pending}
      title={isSocia ? (ativa ? 'Clique para desativar' : 'Clique para ativar') : 'Apenas sócias podem alterar'}
      aria-label={ativa ? 'Desativar regra' : 'Ativar regra'}
      className="relative shrink-0 focus:outline-none disabled:cursor-not-allowed"
    >
      <span
        className={`block h-6 w-11 rounded-full transition-colors duration-200 ${
          ativa ? 'bg-brand' : 'bg-zinc-200'
        } ${pending ? 'opacity-50' : ''}`}
      />
      <span
        className={`absolute top-0.5 left-0.5 block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
          ativa ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}
