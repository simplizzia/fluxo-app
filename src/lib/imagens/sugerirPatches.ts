export interface PatchSugerivel {
  id: string
  nome: string
  quando_usar: string | null
  snippet_texto: string
  palavras_chave: string[]
}

/** Normaliza para comparação: minúsculas e sem acentos. */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Sugere Patches Técnicos cujas palavras-chave aparecem no texto da ação/pose.
 * Match por substring, case/acento-insensitive — a sugestão é um alerta
 * opcional que o usuário aceita ou ignora, então falso-positivo é barato.
 */
export function sugerirPatches<T extends PatchSugerivel>(
  acaoPose: string,
  patches: T[],
): T[] {
  const texto = normalizar(acaoPose)
  if (!texto.trim()) return []

  return patches.filter((patch) =>
    patch.palavras_chave.some(
      (palavra) => palavra.trim() && texto.includes(normalizar(palavra)),
    ),
  )
}
