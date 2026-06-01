'use server'

import { revalidatePath } from 'next/cache'
import Anthropic from '@anthropic-ai/sdk'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { requireSocia } from '@/lib/dal'
import { enviarEmail } from '@/lib/email'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type StageProspect =
  | 'prospeccao'
  | 'reuniao_agendada'
  | 'reuniao_realizada'
  | 'proposta_enviada'
  | 'negociacao'
  | 'contrato_assinado'
  | 'cliente_ativo'
  | 'perdido'

export type OrigemProspect = 'indicacao' | 'prospeccao_ativa' | 'inbound' | 'evento'

export type TipoInteracao = 'contato' | 'nota' | 'reuniao' | 'objecao' | 'proposta' | 'contrato'

export interface Prospect {
  id: string
  nome: string
  empresa: string | null
  segmento: string | null
  contato: {
    telefone?: string
    email?: string
    linkedin?: string
  }
  origem: OrigemProspect
  stage: StageProspect
  valor_mensal_proposto: number | null
  desconto: number | null
  motivo_perda: string | null
  cliente_id: string | null
  responsavel_id: string
  responsavel_nome?: string
  created_at: string
  updated_at: string
}

export interface Interacao {
  id: string
  prospect_id: string
  tipo: TipoInteracao
  descricao: string
  registrado_por: string
  registrado_por_nome?: string
  created_at: string
}

export interface Proposta {
  id: string
  prospect_id: string
  versao: number
  conteudo: string
  enviada: boolean
  enviada_em: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// QUERIES
// ---------------------------------------------------------------------------

/** Todos os prospects da org, agrupados por stage */
export async function buscarProspects(): Promise<Prospect[]> {
  await requireSocia()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('prospects')
    .select(`
      id, nome, empresa, segmento, contato, origem, stage,
      valor_mensal_proposto, desconto, motivo_perda, cliente_id,
      responsavel_id, created_at, updated_at,
      profiles!responsavel_id(nome)
    `)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map((p) => ({
    ...p,
    responsavel_nome: (p.profiles as unknown as { nome: string } | null)?.nome,
  })) as Prospect[]
}

/** Detalhe de um prospect + interações + propostas */
export async function buscarProspectDetalhe(prospectId: string) {
  await requireSocia()
  const supabase = await createClient()

  const [{ data: prospect }, { data: interacoes }, { data: propostas }] = await Promise.all([
    supabase
      .from('prospects')
      .select(`
        id, nome, empresa, segmento, contato, origem, stage,
        valor_mensal_proposto, desconto, motivo_perda, cliente_id,
        responsavel_id, created_at, updated_at,
        profiles!responsavel_id(nome)
      `)
      .eq('id', prospectId)
      .single(),

    supabase
      .from('interacoes_prospect')
      .select('id, prospect_id, tipo, descricao, registrado_por, created_at, profiles!registrado_por(nome)')
      .eq('prospect_id', prospectId)
      .order('created_at', { ascending: false }),

    supabase
      .from('propostas')
      .select('id, prospect_id, versao, conteudo, enviada, enviada_em, created_at')
      .eq('prospect_id', prospectId)
      .order('versao', { ascending: false }),
  ])

  if (!prospect) return null

  return {
    prospect: {
      ...prospect,
      responsavel_nome: (prospect.profiles as unknown as { nome: string } | null)?.nome,
    } as Prospect,
    interacoes: (interacoes ?? []).map((i) => ({
      ...i,
      registrado_por_nome: (i.profiles as unknown as { nome: string } | null)?.nome,
    })) as Interacao[],
    propostas: (propostas ?? []) as Proposta[],
  }
}

// ---------------------------------------------------------------------------
// MUTAÇÕES
// ---------------------------------------------------------------------------

export async function actionCriarProspect(formData: FormData) {
  const profile = await requireSocia()
  const supabase = await createClient()

  const nome = formData.get('nome') as string
  const empresa = (formData.get('empresa') as string) || null
  const segmento = (formData.get('segmento') as string) || null
  const telefone = (formData.get('telefone') as string) || undefined
  const email = (formData.get('email') as string) || undefined
  const linkedin = (formData.get('linkedin') as string) || undefined
  const origem = (formData.get('origem') as OrigemProspect) || 'inbound'
  const valorStr = formData.get('valor_mensal_proposto') as string
  const valor = valorStr ? parseFloat(valorStr) : null

  const { error } = await supabase.from('prospects').insert({
    organization_id: profile.organization_id,
    responsavel_id: profile.id,
    nome,
    empresa,
    segmento,
    contato: { telefone, email, linkedin },
    origem,
    stage: 'prospeccao',
    valor_mensal_proposto: valor,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/pipeline')
}

export async function actionAtualizarStage(
  prospectId: string,
  novoStage: StageProspect,
  motivoPerda?: string,
) {
  await requireSocia()
  const supabase = await createClient()

  const { error } = await supabase
    .from('prospects')
    .update({
      stage: novoStage,
      motivo_perda: motivoPerda ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', prospectId)

  if (error) throw new Error(error.message)
  revalidatePath('/pipeline')
  revalidatePath(`/pipeline/${prospectId}`)
}

export async function actionAtualizarProspect(prospectId: string, formData: FormData) {
  await requireSocia()
  const supabase = await createClient()

  const nome = formData.get('nome') as string
  const empresa = (formData.get('empresa') as string) || null
  const segmento = (formData.get('segmento') as string) || null
  const telefone = (formData.get('telefone') as string) || undefined
  const email = (formData.get('email') as string) || undefined
  const linkedin = (formData.get('linkedin') as string) || undefined
  const valorStr = formData.get('valor_mensal_proposto') as string
  const valor = valorStr ? parseFloat(valorStr) : null
  const descStr = formData.get('desconto') as string
  const desconto = descStr ? parseFloat(descStr) : null

  const { error } = await supabase
    .from('prospects')
    .update({
      nome,
      empresa,
      segmento,
      contato: { telefone, email, linkedin },
      valor_mensal_proposto: valor,
      desconto,
      updated_at: new Date().toISOString(),
    })
    .eq('id', prospectId)

  if (error) throw new Error(error.message)
  revalidatePath(`/pipeline/${prospectId}`)
}

export async function actionRegistrarInteracao(
  prospectId: string,
  tipo: TipoInteracao,
  descricao: string,
) {
  const profile = await requireSocia()
  const supabase = await createClient()

  const { error } = await supabase.from('interacoes_prospect').insert({
    organization_id: profile.organization_id,
    prospect_id: prospectId,
    tipo,
    descricao,
    registrado_por: profile.id,
  })

  if (error) throw new Error(error.message)
  revalidatePath(`/pipeline/${prospectId}`)
}

/** Gera proposta com IA (Claude Sonnet) a partir dos dados do prospect */
export async function actionGerarProposta(prospectId: string): Promise<{
  propostaId: string
  conteudo: string
}> {
  const profile = await requireSocia()
  const service = createServiceClient()

  // Busca dados completos do prospect + interações
  const { data: prospect } = await service
    .from('prospects')
    .select('nome, empresa, segmento, contato, origem, stage, valor_mensal_proposto, desconto')
    .eq('id', prospectId)
    .eq('organization_id', profile.organization_id)
    .single()

  if (!prospect) throw new Error('Prospect não encontrado')

  const { data: interacoes } = await service
    .from('interacoes_prospect')
    .select('tipo, descricao, created_at')
    .eq('prospect_id', prospectId)
    .order('created_at', { ascending: true })
    .limit(20)

  // Conta versão atual
  const { count: versaoAtual } = await service
    .from('propostas')
    .select('*', { count: 'exact', head: true })
    .eq('prospect_id', prospectId)

  const versao = (versaoAtual ?? 0) + 1

  // Contexto do prospect para o Claude
  const historicoInteracoes =
    interacoes
      ?.map((i) => `- [${i.tipo}] ${i.descricao}`)
      .join('\n') ?? 'Nenhuma interação registrada.'

  const valorInfo = prospect.valor_mensal_proposto
    ? `R$ ${prospect.valor_mensal_proposto.toLocaleString('pt-BR')}${prospect.desconto ? ` (${prospect.desconto}% de desconto = R$ ${(prospect.valor_mensal_proposto * (1 - prospect.desconto / 100)).toLocaleString('pt-BR')})` : ''}`
    : 'A definir'

  const promptContexto = `
## Dados do Prospect
- Nome/Empresa: ${prospect.nome} ${prospect.empresa ? `(${prospect.empresa})` : ''}
- Segmento: ${prospect.segmento ?? 'Não informado'}
- Origem: ${prospect.origem}
- Valor proposto: ${valorInfo}

## Histórico de Interações
${historicoInteracoes}
`

  const systemPrompt = `Você é uma especialista em propostas comerciais da Simplizzia, agência de marketing criativo.

Gere uma proposta comercial profissional, personalizada e persuasiva em Markdown.

A proposta deve conter:
1. **Apresentação** — quem é a Simplizzia e por que é a escolha certa para este cliente
2. **Diagnóstico** — o que você entende das necessidades deste prospect (baseado no histórico)
3. **Solução Proposta** — os serviços específicos recomendados (redes sociais, estratégia, identidade visual, etc.)
4. **Investimento** — tabela clara com o valor e o que está incluído
5. **Diferenciais** — por que a Simplizzia vs. alternativas
6. **Próximos Passos** — call to action claro (ex: reunião de alinhamento, assinatura do contrato)

Tom: profissional mas caloroso. Não use jargões vazios. Seja específica e mostre que entende o negócio deste cliente.`

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 3000,
    system: systemPrompt,
    messages: [
      { role: 'user', content: `Gere a proposta v${versao} para este prospect:\n\n${promptContexto}` },
    ],
  })

  const conteudo = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('\n')

  const { data: proposta, error } = await service
    .from('propostas')
    .insert({
      organization_id: profile.organization_id,
      prospect_id: prospectId,
      criado_por: profile.id,
      versao,
      conteudo,
      tokens_input: response.usage.input_tokens,
      tokens_output: response.usage.output_tokens,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(`/pipeline/${prospectId}`)
  return { propostaId: proposta.id as string, conteudo }
}

/** Converte prospect ganho em cliente ativo */
export async function actionConverterEmCliente(
  prospectId: string,
  nomeCliente: string,
) {
  const profile = await requireSocia()
  const supabase = await createClient()
  const service  = createServiceClient()

  // Cria slug a partir do nome
  const slug = nomeCliente
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  // Busca prospect para obter valor proposto e contexto de onboarding
  const { data: prospect } = await supabase
    .from('prospects')
    .select('valor_mensal_proposto, desconto, segmento, empresa, contato')
    .eq('id', prospectId)
    .single()

  // Cria o cliente
  const { data: novoCliente, error: errCliente } = await supabase
    .from('clientes')
    .insert({
      organization_id: profile.organization_id,
      nome: nomeCliente,
      slug,
      status: 'ativo',
    })
    .select('id')
    .single()

  if (errCliente) throw new Error(errCliente.message)

  // Vincula prospect ao cliente criado e avança stage
  const { error: errProspect } = await supabase
    .from('prospects')
    .update({
      stage: 'cliente_ativo',
      cliente_id: novoCliente.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', prospectId)

  if (errProspect) throw new Error(errProspect.message)

  // Auto-seed: cria rascunho de receita recorrente no módulo financeiro
  if (prospect?.valor_mensal_proposto && prospect.valor_mensal_proposto > 0) {
    const desconto = prospect.desconto ?? 0
    const valorFinal = Number(prospect.valor_mensal_proposto) * (1 - desconto / 100)
    await supabase.from('financeiro_receitas').insert({
      organization_id: profile.organization_id,
      cliente_id: novoCliente.id,
      descricao: `Contrato — ${nomeCliente}`,
      valor_mensal: Math.round(valorFinal * 100) / 100,
      ciclo: 'mensal' as const,
      data_cobranca_dia: 5,
      status: 'pendente' as const,
      observacoes: 'Rascunho criado automaticamente ao fechar deal no pipeline. Revise o valor e ciclo.',
    })
  }

  // NOVO: Cria sessão de onboarding e envia email ao cliente
  const contextoExtra = [
    prospect?.segmento ? `Segmento: ${prospect.segmento}` : '',
    prospect?.empresa   ? `Empresa: ${prospect.empresa}`   : '',
  ].filter(Boolean).join('\n')

  const { data: onboardingRow } = await service
    .from('onboarding_clientes')
    .insert({
      organization_id: profile.organization_id,
      cliente_id:      novoCliente.id,
      client_name:     nomeCliente,
      context_extra:   contextoExtra || null,
    })
    .select('token')
    .single()

  if (onboardingRow?.token) {
    const link = `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/cliente/${onboardingRow.token}`
    const { emailOnboardingCliente } = await import('@/lib/email')
    const emailHtml = emailOnboardingCliente({ nome: nomeCliente, link })
    const emailCliente = (prospect?.contato as Record<string, string> | null)?.email ?? ''
    if (emailCliente) {
      await enviarEmail(
        [emailCliente],
        `Bem-vindo à Simplizzia, ${nomeCliente}!`,
        emailHtml,
      ).catch(() => {}) // best-effort
    }
  }

  revalidatePath('/pipeline')
  revalidatePath('/clientes')
  revalidatePath('/socias/financeiro')

  return { clienteId: novoCliente.id as string }
}
