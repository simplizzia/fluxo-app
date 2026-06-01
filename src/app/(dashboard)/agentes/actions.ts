'use server'

import Anthropic from '@anthropic-ai/sdk'
import { requirePapel, getCurrentProfile } from '@/lib/dal'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { executarAgente } from '@/lib/agents/executor'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentRun {
  id: string
  agentChave: string
  agentNome: string
  clienteNome: string | null
  cardTitulo: string | null
  status: 'pendente' | 'rodando' | 'concluido' | 'falhou'
  input: Record<string, unknown>
  output: { texto?: string } | null
  tokensInput: number | null
  tokensOutput: number | null
  duracaoMs: number | null
  erro: string | null
  criadoEm: string
  feedback: 'bom' | 'ruim' | null
}

export interface ClienteSimples {
  id: string
  nome: string
}

// ---------------------------------------------------------------------------
// buscarRunsRecentes — últimas 30 execuções da org
// ---------------------------------------------------------------------------

export async function buscarRunsRecentes(): Promise<{ runs: AgentRun[]; error?: string }> {
  await requirePapel('socia', 'gestao', 'atendimento')
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('agent_runs')
    .select(`
      id, status, input, output, tokens_input, tokens_output, duracao_ms, erro, criado_em,
      agente:agent_catalog!agent_id(chave, nome),
      card:cards!card_id(titulo),
      cliente:clientes!cliente_id(nome),
      feedback:agent_feedback!run_id(avaliacao)
    `)
    .order('criado_em', { ascending: false })
    .limit(30)

  if (error) return { runs: [], error: 'Falha ao buscar execuções.' }

  const runs: AgentRun[] = (data ?? []).map((r) => ({
    id: r.id,
    agentChave: (r.agente as unknown as { chave: string } | null)?.chave ?? '',
    agentNome: (r.agente as unknown as { nome: string } | null)?.nome ?? '—',
    clienteNome: (r.cliente as unknown as { nome: string } | null)?.nome ?? null,
    cardTitulo: (r.card as unknown as { titulo: string } | null)?.titulo ?? null,
    status: r.status as AgentRun['status'],
    input: (r.input as Record<string, unknown>) ?? {},
    output: r.output as { texto?: string } | null,
    tokensInput: r.tokens_input,
    tokensOutput: r.tokens_output,
    duracaoMs: r.duracao_ms,
    erro: r.erro,
    criadoEm: r.criado_em,
    feedback:
      ((r.feedback as unknown as { avaliacao: string }[] | null)?.[0]?.avaliacao ?? null) as
        | 'bom'
        | 'ruim'
        | null,
  }))

  return { runs }
}

// ---------------------------------------------------------------------------
// buscarClientesAtivos — para o seletor de cliente no trigger form
// ---------------------------------------------------------------------------

export async function buscarClientesAtivos(): Promise<{ clientes: ClienteSimples[]; error?: string }> {
  await requirePapel('socia', 'gestao', 'atendimento')
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('clientes')
    .select('id, nome')
    .eq('status', 'ativo')
    .order('nome')

  if (error) return { clientes: [] }
  return { clientes: (data ?? []).map((c) => ({ id: c.id, nome: c.nome })) }
}

// ---------------------------------------------------------------------------
// actionTriggerAgente — Pattern C: manual trigger
// ---------------------------------------------------------------------------

export async function actionTriggerAgente(
  agenteChave: string,
  input: Record<string, unknown>,
  clienteId?: string,
): Promise<{ runId?: string; output?: string; error?: string }> {
  await requirePapel('socia', 'gestao', 'atendimento')
  const profile = await getCurrentProfile()

  // Get organization_id
  const service = createServiceClient()
  const { data: profile_db } = await service
    .from('profiles')
    .select('organization_id')
    .eq('id', profile.id)
    .single()

  if (!profile_db?.organization_id) {
    return { error: 'Organização não encontrada.' }
  }

  const result = await executarAgente({
    organizationId: profile_db.organization_id as string,
    agenteChave,
    clienteId,
    triggeredBy: profile.id,
    input,
  })

  return result
}

// ---------------------------------------------------------------------------
// actionTriggerAgenteCard — Pattern A: triggered from a card
// ---------------------------------------------------------------------------

export async function actionTriggerAgenteCard(
  cardId: string,
  agenteChave: string,
  input?: Record<string, unknown>,
): Promise<{ runId?: string; output?: string; error?: string }> {
  await requirePapel('socia', 'gestao', 'atendimento')
  const profile = await getCurrentProfile()
  const service = createServiceClient()

  // Get card and its cliente/org
  const { data: card } = await service
    .from('cards')
    .select('cliente_id, tipo:tipos_demanda!tipo_id(agente_slug)')
    .eq('id', cardId)
    .single()

  if (!card) return { error: 'Card não encontrado.' }

  const { data: profile_db } = await service
    .from('profiles')
    .select('organization_id')
    .eq('id', profile.id)
    .single()

  if (!profile_db?.organization_id) return { error: 'Organização não encontrada.' }

  const result = await executarAgente({
    organizationId: profile_db.organization_id as string,
    agenteChave,
    clienteId: card.cliente_id ?? undefined,
    cardId,
    triggeredBy: profile.id,
    input: input ?? {},
  })

  return result
}

// ---------------------------------------------------------------------------
// Types para feedback e insights (Sprint 3.3)
// ---------------------------------------------------------------------------

export interface AgentInsight {
  id: string
  agentChave: string
  agentNome: string
  clienteNome: string | null
  resumo: string
  taxaAprovacao: number | null
  totalFeedbacks: number
  padroesPositivos: string[]
  padroesNegativos: string[]
  sugestoes: string[]
  atualizadoEm: string
}

// ---------------------------------------------------------------------------
// actionRegistrarFeedback — registra avaliação de uma execução
// ---------------------------------------------------------------------------

export async function actionRegistrarFeedback(
  runId: string,
  avaliacao: 'bom' | 'ruim',
  comentario?: string,
): Promise<{ error?: string }> {
  await requirePapel('socia', 'gestao', 'atendimento')
  const profile = await getCurrentProfile()
  const service = createServiceClient()

  // Busca o run para validar org + pegar agent_id e cliente_id
  const { data: run } = await service
    .from('agent_runs')
    .select('organization_id, agent_id, cliente_id')
    .eq('id', runId)
    .single()

  if (!run) return { error: 'Execução não encontrada.' }

  const { data: profile_db } = await service
    .from('profiles')
    .select('organization_id')
    .eq('id', profile.id)
    .single()

  if (run.organization_id !== profile_db?.organization_id) {
    return { error: 'Sem permissão para avaliar esta execução.' }
  }

  const { error } = await service
    .from('agent_feedback')
    .upsert(
      {
        organization_id: run.organization_id,
        run_id: runId,
        agent_id: run.agent_id,
        cliente_id: run.cliente_id ?? null,
        avaliado_por: profile.id,
        avaliacao,
        comentario: comentario?.trim() || null,
      },
      { onConflict: 'run_id' },
    )

  if (error) return { error: 'Falha ao registrar feedback.' }
  return {}
}

// ---------------------------------------------------------------------------
// actionAnalisarPadroes — extrai padrões via Claude dos feedbacks acumulados
// ---------------------------------------------------------------------------

export async function actionAnalisarPadroes(
  agenteChave: string,
  clienteId?: string,
): Promise<{ insight?: AgentInsight; error?: string }> {
  await requirePapel('socia', 'gestao')
  const profile = await getCurrentProfile()
  const service = createServiceClient()

  const { data: profile_db } = await service
    .from('profiles')
    .select('organization_id')
    .eq('id', profile.id)
    .single()

  const organizationId = profile_db?.organization_id as string
  if (!organizationId) return { error: 'Organização não encontrada.' }

  // Busca o agente
  const { data: agente } = await service
    .from('agent_catalog')
    .select('id, nome, chave')
    .eq('chave', agenteChave)
    .single()

  if (!agente) return { error: 'Agente não encontrado.' }

  // Busca todos os feedbacks deste agente+cliente
  let query = service
    .from('agent_feedback')
    .select('avaliacao, comentario, criado_em')
    .eq('organization_id', organizationId)
    .eq('agent_id', agente.id)
    .order('criado_em', { ascending: false })
    .limit(50)

  if (clienteId) {
    query = query.eq('cliente_id', clienteId)
  }

  const { data: feedbacks } = await query

  if (!feedbacks || feedbacks.length === 0) {
    return { error: 'Feedbacks insuficientes para análise (mínimo: 1).' }
  }

  const totalFeedbacks = feedbacks.length
  const totalBons = feedbacks.filter((f) => f.avaliacao === 'bom').length
  const taxaAprovacao = Math.round((totalBons / totalFeedbacks) * 100)

  // Formata feedbacks para o prompt
  const feedbackTexto = feedbacks
    .map((f) => {
      const av = f.avaliacao === 'bom' ? '✅ BOM' : '❌ RUIM'
      return `${av}: ${f.comentario ?? '(sem comentário)'}`
    })
    .join('\n')

  const prompt = `Analise os seguintes feedbacks sobre outputs do agente "${agente.nome}" da Simplizzia.

Feedbacks (${totalFeedbacks} total, ${taxaAprovacao}% aprovação):
${feedbackTexto}

Retorne APENAS um JSON válido com esta estrutura exata:
{
  "resumo": "frase de 1-2 linhas resumindo o estado atual do agente",
  "padroes_positivos": ["padrão 1", "padrão 2", "padrão 3"],
  "padroes_negativos": ["problema 1", "problema 2"],
  "sugestoes": ["sugestão de melhoria 1", "sugestão de melhoria 2"]
}

Seja específico e acionável. Máximo 3 itens por lista.`

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    // Parse JSON — extract from markdown code block if needed
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { error: 'Falha ao interpretar resposta da IA.' }

    const parsed = JSON.parse(jsonMatch[0]) as {
      resumo: string
      padroes_positivos: string[]
      padroes_negativos: string[]
      sugestoes: string[]
    }

    // Upsert insight
    const { data: insightRec } = await service
      .from('agent_insights')
      .upsert(
        {
          organization_id: organizationId,
          agent_id: agente.id,
          cliente_id: clienteId ?? null,
          resumo: parsed.resumo ?? '',
          taxa_aprovacao: taxaAprovacao,
          total_feedbacks: totalFeedbacks,
          padroes_positivos: parsed.padroes_positivos ?? [],
          padroes_negativos: parsed.padroes_negativos ?? [],
          sugestoes: parsed.sugestoes ?? [],
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: 'organization_id,agent_id,cliente_id' },
      )
      .select('id, atualizado_em')
      .single()

    const insight: AgentInsight = {
      id: insightRec?.id ?? '',
      agentChave: agente.chave as string,
      agentNome: agente.nome as string,
      clienteNome: null,
      resumo: parsed.resumo,
      taxaAprovacao,
      totalFeedbacks,
      padroesPositivos: parsed.padroes_positivos ?? [],
      padroesNegativos: parsed.padroes_negativos ?? [],
      sugestoes: parsed.sugestoes ?? [],
      atualizadoEm: insightRec?.atualizado_em ?? new Date().toISOString(),
    }

    return { insight }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return { error: `Falha na análise: ${msg}` }
  }
}

// ---------------------------------------------------------------------------
// buscarInsights — lista insights salvos da org
// ---------------------------------------------------------------------------

export async function buscarInsights(clienteId?: string): Promise<{
  insights: AgentInsight[]
  error?: string
}> {
  await requirePapel('socia', 'gestao', 'atendimento')
  const supabase = await createClient()

  let query = supabase
    .from('agent_insights')
    .select(`
      id, resumo, taxa_aprovacao, total_feedbacks,
      padroes_positivos, padroes_negativos, sugestoes, atualizado_em,
      agente:agent_catalog!agent_id(chave, nome),
      cliente:clientes!cliente_id(nome)
    `)
    .order('atualizado_em', { ascending: false })

  if (clienteId) {
    query = query.eq('cliente_id', clienteId)
  }

  const { data, error } = await query

  if (error) return { insights: [] }

  const insights: AgentInsight[] = (data ?? []).map((r) => ({
    id: r.id,
    agentChave: (r.agente as unknown as { chave: string } | null)?.chave ?? '',
    agentNome: (r.agente as unknown as { nome: string } | null)?.nome ?? '—',
    clienteNome: (r.cliente as unknown as { nome: string } | null)?.nome ?? null,
    resumo: r.resumo,
    taxaAprovacao: r.taxa_aprovacao ? Number(r.taxa_aprovacao) : null,
    totalFeedbacks: r.total_feedbacks,
    padroesPositivos: (r.padroes_positivos as string[]) ?? [],
    padroesNegativos: (r.padroes_negativos as string[]) ?? [],
    sugestoes: (r.sugestoes as string[]) ?? [],
    atualizadoEm: r.atualizado_em,
  }))

  return { insights }
}
