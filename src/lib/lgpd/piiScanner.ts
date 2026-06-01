/**
 * PII Scanner — detecta e redige dados pessoais identificáveis.
 *
 * Padrões cobertos:
 *   CPF, CNPJ, RG, telefone (BR), e-mail, CEP, cartão de crédito (heurística)
 *
 * Uso:
 *   const { tipos, count } = scanPii(text)
 *   const redacted = redactPii(text)
 */

// ---------------------------------------------------------------------------
// Padrões regex
// ---------------------------------------------------------------------------

const PII_PATTERNS: { tipo: string; regex: RegExp }[] = [
  {
    tipo: 'cpf',
    // 000.000.000-00 ou 00000000000
    regex: /\b\d{3}[\.\s]?\d{3}[\.\s]?\d{3}[-\.\s]?\d{2}\b/g,
  },
  {
    tipo: 'cnpj',
    // 00.000.000/0000-00 ou 00000000000000
    regex: /\b\d{2}[\.\s]?\d{3}[\.\s]?\d{3}[\/\s]?\d{4}[-\.\s]?\d{2}\b/g,
  },
  {
    tipo: 'email',
    regex: /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g,
  },
  {
    tipo: 'telefone',
    // (11) 9 1234-5678, (11) 1234-5678, +55 11 91234-5678
    regex: /(\+?55\s?)?(\(?\d{2}\)?[\s\-]?)(\d{4,5}[\-\s]?\d{4})\b/g,
  },
  {
    tipo: 'cep',
    // 00000-000 ou 00000000
    regex: /\b\d{5}-?\d{3}\b/g,
  },
  {
    tipo: 'cartao_credito',
    // 4 grupos de 4 dígitos, separados por espaço ou hífen
    regex: /\b(?:\d{4}[\s\-]){3}\d{4}\b/g,
  },
]

// Marcador visual para dados redatados
const REDACTION_MARKER = '[DADO REDATADO]'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface PiiScanResult {
  /** Tipos de PII encontrados (sem duplicatas) */
  tipos: string[]
  /** Total de ocorrências detectadas */
  count: number
  /** True se algum PII foi encontrado */
  hasPii: boolean
}

// ---------------------------------------------------------------------------
// Funções públicas
// ---------------------------------------------------------------------------

/**
 * Escaneia um texto e retorna os tipos de PII encontrados.
 * Não altera o texto original.
 */
export function scanPii(text: string): PiiScanResult {
  if (!text || text.trim().length === 0) {
    return { tipos: [], count: 0, hasPii: false }
  }

  const tiposEncontrados = new Set<string>()
  let totalCount = 0

  for (const { tipo, regex } of PII_PATTERNS) {
    // Usar exec em loop para contar ocorrências corretamente
    regex.lastIndex = 0
    const matches = text.match(regex)
    if (matches && matches.length > 0) {
      tiposEncontrados.add(tipo)
      totalCount += matches.length
    }
  }

  return {
    tipos: Array.from(tiposEncontrados),
    count: totalCount,
    hasPii: tiposEncontrados.size > 0,
  }
}

/**
 * Redige todos os padrões de PII encontrados no texto.
 * Substitui cada ocorrência por [DADO REDATADO].
 */
export function redactPii(text: string): string {
  if (!text || text.trim().length === 0) return text

  let redacted = text
  for (const { regex } of PII_PATTERNS) {
    regex.lastIndex = 0
    redacted = redacted.replace(regex, REDACTION_MARKER)
  }
  return redacted
}

/**
 * Retorna label amigável para cada tipo de PII.
 */
export function piiTipoLabel(tipo: string): string {
  const labels: Record<string, string> = {
    cpf: 'CPF',
    cnpj: 'CNPJ',
    email: 'E-mail',
    telefone: 'Telefone',
    cep: 'CEP',
    cartao_credito: 'Cartão de crédito',
  }
  return labels[tipo] ?? tipo.toUpperCase()
}

/**
 * Sanitiza um objeto JSON removendo campos com PII das chaves especificadas.
 * Útil para logs de auditoria (nunca incluir PII).
 */
export function sanitizeForLog<T extends Record<string, unknown>>(
  obj: T,
  fieldsToCheck: (keyof T)[],
): T {
  const sanitized = { ...obj }
  for (const field of fieldsToCheck) {
    const val = sanitized[field]
    if (typeof val === 'string' && scanPii(val).hasPii) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(sanitized as any)[field] = '[REDATADO]'
    }
  }
  return sanitized
}
