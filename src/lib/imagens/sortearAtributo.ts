export interface AtributoSorteavel {
  id: string
  valor: string
  vezes_usado: number
  status: string
}

/**
 * Sorteia o atributo de variação a usar: entre os aprovados, o de menor
 * vezes_usado (lógica de não-repetição); empate resolvido aleatoriamente.
 * Retorna null se a categoria não tem atributos aprovados.
 */
export function sortearAtributo<T extends AtributoSorteavel>(
  atributos: T[],
): T | null {
  const aprovados = atributos.filter((a) => a.status === 'aprovado')
  if (aprovados.length === 0) return null

  const menorUso = Math.min(...aprovados.map((a) => a.vezes_usado))
  const candidatos = aprovados.filter((a) => a.vezes_usado === menorUso)
  return candidatos[Math.floor(Math.random() * candidatos.length)]
}
