import type { StatusCronograma } from './shared'

export const STATUS_CRONOGRAMA_LABEL: Record<StatusCronograma, string> = {
  rascunho: 'Rascunho',
  em_revisao: 'Em revisão',
  aprovado: 'Aprovado',
  desmembrado: 'Desmembrado',
}

export const STATUS_CRONOGRAMA_COR: Record<StatusCronograma, string> = {
  rascunho: 'bg-zinc-100 text-zinc-600',
  em_revisao: 'bg-amber-100 text-amber-700',
  aprovado: 'bg-green-100 text-green-700',
  desmembrado: 'bg-violet-100 text-violet-700',
}
