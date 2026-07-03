import type { Database } from '@/types/database'

type BlocoMestre = Database['public']['Tables']['imagens_bloco_mestre']['Row']
type Produto = Database['public']['Tables']['imagens_produtos']['Row']

export interface MontarPromptInput {
  bloco: Pick<
    BlocoMestre,
    | 'regra_paleta'
    | 'estilo_luz'
    | 'sentimento_marca'
    | 'negativos_padrao'
    | 'formato_padrao'
    | 'estilo_geral'
  >
  produto?: Pick<
    Produto,
    | 'nome'
    | 'formato'
    | 'escala_relativa'
    | 'tampa'
    | 'regra_geracao'
    | 'restricao_conteudo'
    | 'alerta_contraste'
  > | null
  /** Valor do atributo de variação escolhido (ex: descrição da fachada) */
  variacaoValor?: string | null
  /** Texto livre do personagem OU nome do personagem cadastrado */
  personagemTexto?: string | null
  /** descricao_fixa do personagem cadastrado (traços que nunca mudam) */
  personagemDescricaoFixa?: string | null
  /** Único campo sempre obrigatório — a parte criativa da cena */
  acaoPose: string
  /** Sobrescreve o formato_padrao do Bloco Mestre quando preenchido */
  formato?: string | null
  notaEspecial?: string | null
  /** Snippets de Patches Técnicos aceitos pelo usuário */
  patchesAceitos?: string[]
}

export interface PromptMontado {
  promptFinal: string
  negativos: string
}

/**
 * Monta o prompt final por composição direta de texto (sem IA):
 * Bloco Mestre + Ficha de Produto + Variação + Personagem/Ação + Patches + Nota.
 * A ordem segue do geral (estilo) para o específico (cena).
 */
export function montarPrompt(input: MontarPromptInput): PromptMontado {
  const { bloco, produto } = input
  const secoes: string[] = []

  if (bloco.estilo_geral) secoes.push(bloco.estilo_geral)
  if (bloco.estilo_luz) secoes.push(`Lighting: ${bloco.estilo_luz}`)
  if (bloco.regra_paleta) secoes.push(`Color rule: ${bloco.regra_paleta}`)
  if (bloco.sentimento_marca) secoes.push(`Mood: ${bloco.sentimento_marca}`)

  if (input.variacaoValor) secoes.push(`Setting: ${input.variacaoValor}`)

  const personagem = [input.personagemTexto, input.personagemDescricaoFixa]
    .filter(Boolean)
    .join(' — ')
  const cena = personagem
    ? `Scene: ${personagem}, ${input.acaoPose}`
    : `Scene: ${input.acaoPose}`
  secoes.push(cena)

  if (produto) {
    const detalhes = [
      produto.formato,
      produto.escala_relativa && `scale: ${produto.escala_relativa}`,
      produto.tampa && `lid: ${produto.tampa}`,
    ]
      .filter(Boolean)
      .join(', ')
    secoes.push(`Product (${produto.nome}): ${detalhes}`)
    if (produto.regra_geracao) secoes.push(`Product rule: ${produto.regra_geracao}`)
    if (produto.restricao_conteudo)
      secoes.push(`Content restriction: ${produto.restricao_conteudo}`)
    if (produto.alerta_contraste)
      secoes.push(`Contrast note: ${produto.alerta_contraste}`)
  }

  for (const snippet of input.patchesAceitos ?? []) {
    if (snippet.trim()) secoes.push(snippet.trim())
  }

  if (input.notaEspecial) secoes.push(`Special note: ${input.notaEspecial}`)

  const formato = input.formato || bloco.formato_padrao
  if (formato) secoes.push(`Format: ${formato}`)

  return {
    promptFinal: secoes.join('\n'),
    negativos: (bloco.negativos_padrao ?? []).join(', '),
  }
}
