import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExecucaoOpts {
  organizationId: string
  agenteChave: string         // e.g. 'criativo.carrossel'
  clienteId?: string
  marcaId?: string            // escopa o contexto a uma marca específica
  cardId?: string
  triggeredBy?: string        // profile.id
  input: Record<string, unknown>
  maxTokens?: number          // limite de saída (default 4096)
  model?: string              // override do modelo (default claude-haiku-4-5)
}

export interface ExecucaoResult {
  runId?: string
  output?: string
  error?: string
  tokensInput?: number
  tokensOutput?: number
  duracaoMs?: number
}

// ---------------------------------------------------------------------------
// Context builder — fetches client brand data to include in every agent call
// ---------------------------------------------------------------------------

async function buildContextoCliente(
  clienteId: string,
  organizationId: string,
  marcaId?: string,
): Promise<string> {
  try {
    const service = createServiceClient()

    // Cliente básico
    const { data: cliente } = await service
      .from('clientes')
      .select('nome, status')
      .eq('id', clienteId)
      .eq('organization_id', organizationId)
      .single()

    if (!cliente) return ''

    const partes: string[] = [
      `## Dados do Cliente\nNome: ${cliente.nome}\nStatus: ${cliente.status}`,
    ]

    // Quando há marca, injeta o contexto específico dela (dados + briefing Modo 1)
    if (marcaId) {
      const { data: marca } = await service
        .from('onboarding_marcas')
        .select('nome, publico, posicionamento_atual, concorrentes, contexto_estrategico, cenario_atual, briefing_output')
        .eq('id', marcaId)
        .single()

      if (marca) {
        const dados = [
          `Nome: ${marca.nome}`,
          marca.publico ? `Público: ${marca.publico}` : null,
          marca.posicionamento_atual ? `Posicionamento atual: ${marca.posicionamento_atual}` : null,
          marca.concorrentes ? `Concorrentes: ${marca.concorrentes}` : null,
          marca.contexto_estrategico ? `Contexto estratégico: ${marca.contexto_estrategico}` : null,
          marca.cenario_atual ? `Cenário atual: ${marca.cenario_atual}` : null,
        ].filter(Boolean).join('\n')
        partes.push(`\n## Marca em foco\n${dados}`)
        if (marca.briefing_output) {
          partes.push(`\n## Briefing da Marca (onboarding)\n${marca.briefing_output}`)
        }
      }
    }

    // Seções do universo de marca.
    // Quando há marca em foco: inclui docs da marca + da marca mãe (se sub-marca)
    // + docs de nível cliente que não misturam conteúdo de marcas (perfil_cliente,
    // prep_reuniao). O briefing_completo monolítico é excluído intencionalmente
    // para evitar contaminação cruzada entre marcas irmãs.
    // Sem marca: traz tudo do cliente.
    let query = service
      .from('universo_marca')
      .select('categoria, titulo, conteudo, marca_id')
      .eq('cliente_id', clienteId)
      .eq('organization_id', organizationId)

    if (marcaId) {
      // Verifica se a marca tem uma marca mãe (hierarquia)
      const { data: marcaHierarquia } = await service
        .from('onboarding_marcas')
        .select('marca_pai_id')
        .eq('id', marcaId)
        .maybeSingle()

      const idsRelevantes = [marcaId]
      if (marcaHierarquia?.marca_pai_id) {
        idsRelevantes.push(marcaHierarquia.marca_pai_id)
      }

      // Inclui: docs das marcas relevantes (marca + mãe) + perfil e prep do cliente
      // Exclui: briefing_completo (monolítico com todas as marcas misturadas)
      const idsStr = idsRelevantes.join(',')
      query = query.or(
        `marca_id.in.(${idsStr}),and(marca_id.is.null,subcategoria.in.(perfil_cliente,prep_reuniao,estrutura_empresa))`,
      )
    }

    const { data: secoes } = await query.order('categoria')

    if (secoes && secoes.length > 0) {
      partes.push('\n## Universo de Marca')
      for (const s of secoes) {
        const texto = (s.conteudo as { texto?: string })?.texto ?? ''
        if (texto) {
          partes.push(`\n### ${s.titulo}\n${texto}`)
        }
      }
    }

    return partes.join('\n')
  } catch {
    return ''
  }
}

// ---------------------------------------------------------------------------
// Feedback context enrichment (Sprint 3.3)
// Fetches the 5 most recent feedbacks for this agent+client combination
// and formats them as calibration instructions for Claude.
// ---------------------------------------------------------------------------

async function buildFeedbackContext(
  agentId: string,
  organizationId: string,
  clienteId?: string,
): Promise<string> {
  try {
    const service = createServiceClient()

    let query = service
      .from('agent_feedback')
      .select('avaliacao, comentario, criado_em')
      .eq('organization_id', organizationId)
      .eq('agent_id', agentId)
      .order('criado_em', { ascending: false })
      .limit(5)

    if (clienteId) {
      query = query.eq('cliente_id', clienteId)
    }

    const { data: feedbacks } = await query

    if (!feedbacks || feedbacks.length === 0) return ''

    const linhas = feedbacks.map((f) => {
      const icone = f.avaliacao === 'bom' ? '✅' : '❌'
      const comentario = f.comentario ? ` — "${f.comentario}"` : ''
      return `${icone}${comentario}`
    })

    return (
      '\n\n## Histórico de Feedback (calibre seu output com base nisto)' +
      '\nAs últimas avaliações deste agente para este cliente foram:\n' +
      linhas.join('\n') +
      '\nUse estes feedbacks para ajustar o estilo, tom e estrutura do output atual.'
    )
  } catch {
    return ''
  }
}

// ---------------------------------------------------------------------------
// Main executor
// ---------------------------------------------------------------------------

export async function executarAgente(opts: ExecucaoOpts): Promise<ExecucaoResult> {
  const { organizationId, agenteChave, clienteId, marcaId, cardId, triggeredBy, input, maxTokens, model } = opts
  const inicio = Date.now()
  const service = createServiceClient()

  // 1. Fetch agent from catalog
  const { data: agente, error: errAgente } = await service
    .from('agent_catalog')
    .select('id, nome, prompt_sistema')
    .eq('chave', agenteChave)
    .eq('ativo', true)
    .single()

  if (errAgente || !agente) {
    return { error: `Agente "${agenteChave}" não encontrado no catálogo.` }
  }

  // 2. Create run record with status 'rodando'
  const { data: run, error: errRun } = await service
    .from('agent_runs')
    .insert({
      organization_id: organizationId,
      agent_id: agente.id,
      card_id: cardId ?? null,
      cliente_id: clienteId ?? null,
      marca_id: marcaId ?? null,
      triggered_by: triggeredBy ?? null,
      status: 'rodando',
      input: input as unknown as import('@/types/database').Json,
    })
    .select('id')
    .single()

  if (errRun || !run) {
    return { error: 'Falha ao registrar execução.' }
  }

  const runId = run.id as string

  try {
    // 3. Build context in parallel: client brand data + feedback history
    const [contextoCliente, contextoFeedback] = await Promise.all([
      clienteId ? buildContextoCliente(clienteId, organizationId, marcaId) : Promise.resolve(''),
      buildFeedbackContext(agente.id as string, organizationId, clienteId),
    ])

    // 4. Build user message from inputs
    const inputTexts = Object.entries(input)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `**${k}:** ${v}`)
      .join('\n')

    const contextoParts = [contextoCliente, contextoFeedback].filter(Boolean).join('')
    const userMessage = contextoParts
      ? `${contextoParts}\n\n## Input do Usuário\n${inputTexts}`
      : inputTexts || 'Inicie com base no contexto do cliente disponível.'

    // 5. Call Claude API
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

    const response = await anthropic.messages.create({
      model: model ?? 'claude-haiku-4-5',
      // 4096 termina com folga (~27s) dentro do limite de 60s da função, mesmo
      // com cold start. Documentos longos completam com o botão "Continuar".
      max_tokens: maxTokens ?? 4096,
      system: agente.prompt_sistema as string,
      messages: [{ role: 'user', content: userMessage }],
    })

    const outputText = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('\n')

    const tokensInput = response.usage.input_tokens
    const tokensOutput = response.usage.output_tokens
    const duracaoMs = Date.now() - inicio

    // 6. Update run record with success
    await service
      .from('agent_runs')
      .update({
        status: 'concluido',
        output: { texto: outputText },
        tokens_input: tokensInput,
        tokens_output: tokensOutput,
        duracao_ms: duracaoMs,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', runId)

    // 7. If Pattern A (card-triggered), save output to card's internal fields
    //    (tabela isolada cards_internos — escrita server-side via service role)
    if (cardId) {
      const internos = service.from('cards_internos' as never) as unknown as {
        select: (c: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: { dados: unknown; organization_id: string } | null }> } }
        upsert: (v: unknown, o: unknown) => Promise<unknown>
      }
      const { data: atual } = await internos.select('dados, organization_id').eq('card_id', cardId).maybeSingle()

      let orgId = atual?.organization_id
      if (!orgId) {
        const { data: c } = await service.from('cards').select('organization_id').eq('id', cardId).single()
        orgId = (c as { organization_id: string } | null)?.organization_id
      }

      const camposAtuais = (atual?.dados as Record<string, unknown>) ?? {}
      await internos.upsert(
        {
          card_id: cardId,
          organization_id: orgId,
          dados: {
            ...camposAtuais,
            ia_output: outputText,
            ia_agente: agenteChave,
            ia_gerado_em: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'card_id' },
      )
    }

    return { runId, output: outputText, tokensInput, tokensOutput, duracaoMs }
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : 'Erro desconhecido'

    // Update run with failure
    await service
      .from('agent_runs')
      .update({
        status: 'falhou',
        erro: mensagem,
        duracao_ms: Date.now() - inicio,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', runId)

    return { runId, error: mensagem }
  }
}
