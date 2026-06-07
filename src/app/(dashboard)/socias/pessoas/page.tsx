import { requirePapel } from '@/lib/dal'
import { PessoasPainel } from '@/components/pessoas/PessoasPainel'
import {
  buscarColaboradores,
  buscarPerfisEquipe,
} from '@/app/(dashboard)/socias/actions'
import {
  buscarTokens,
  buscarPerfis,
  buscarAvisos,
  buscarAtividades,
} from './actions'

export const metadata = {
  title: 'Pessoas & Cultura — Simplizzia',
}

export default async function PessoasPage() {
  await requirePapel('socia')

  const [colaboradores, perfisEquipe, tokens, perfis, avisos, atividades] =
    await Promise.all([
      buscarColaboradores(),
      buscarPerfisEquipe(),
      buscarTokens(),
      buscarPerfis(),
      buscarAvisos(),
      buscarAtividades(),
    ])

  return (
    <PessoasPainel
      colaboradores={colaboradores}
      perfisEquipe={perfisEquipe}
      tokens={tokens}
      perfis={perfis}
      avisos={avisos}
      atividades={atividades}
    />
  )
}
