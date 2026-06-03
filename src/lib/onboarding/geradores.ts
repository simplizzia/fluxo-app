import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'
import { executarAgente } from '@/lib/agents/executor'
import { inicializarPipeline } from '@/lib/onboarding/pipeline'

// ---------------------------------------------------------------------------
// gerarModo2 — Prep de Reunião (auto-gerado ao concluir onboarding)
// ---------------------------------------------------------------------------

export interface GerarModo2Result {
  etapa: string
  marcasEncontradas: number
  marcasComBriefing: number
  agenteErro?: string
  outputLen?: number
  insertErro?: string
  ok: boolean
}

export async function gerarModo2(opts: {
  token: string
  organizationId: string
}): Promise<GerarModo2Result> {
  const { token, organizationId } = opts
  const service = createServiceClient()

  // Buscar dados do cliente + marcas com briefing
  const { data: session } = await service
    .from('onboarding_clientes')
    .select(`
      cliente_id, client_name, setor, servicos_contratados,
      objetivo_declarado, dores_identificadas, cenario_atual
    `)
    .eq('token', token)
    .single()

  if (!session?.cliente_id) {
    return { etapa: 'session_nao_encontrada', marcasEncontradas: 0, marcasComBriefing: 0, ok: false }
  }

  const { data: marcasAll, error: errMarcas } = await service
    .from('onboarding_marcas')
    .select('nome, publico, posicionamento_atual, concorrentes, contexto_estrategico, cenario_atual, briefing_output')
    .eq('token', token)
    .order('ordem', { ascending: true })

  const marcas = (marcasAll ?? []).filter((m) => m.briefing_output)

  if (marcas.length === 0) {
    return {
      etapa: 'sem_briefings',
      marcasEncontradas: (marcasAll ?? []).length,
      marcasComBriefing: 0,
      agenteErro: errMarcas?.message,
      ok: false,
    }
  }

  const clienteTexto = [
    `Nome: ${session.client_name}`,
    session.setor ? `Setor: ${session.setor}` : null,
    Array.isArray(session.servicos_contratados) && session.servicos_contratados.length
      ? `Serviços: ${(session.servicos_contratados as string[]).join(', ')}`
      : null,
    session.objetivo_declarado ? `Objetivo: ${session.objetivo_declarado}` : null,
    session.dores_identificadas ? `Dores: ${session.dores_identificadas}` : null,
    session.cenario_atual ? `Cenário atual: ${session.cenario_atual}` : null,
  ].filter(Boolean).join('\n')

  const briefingsTexto = marcas.map((m) =>
    `## ${m.nome}\n${m.briefing_output ?? '(sem briefing)'}`
  ).join('\n\n')

  const result = await executarAgente({
    organizationId,
    agenteChave: 'onboarding.modo2',
    clienteId: session.cliente_id,
    input: { cliente: clienteTexto, briefings: briefingsTexto },
  })

  if (!result.output) {
    return {
      etapa: 'agente_falhou',
      marcasEncontradas: (marcasAll ?? []).length,
      marcasComBriefing: marcas.length,
      agenteErro: result.error,
      ok: false,
    }
  }

  // Verifica se já existe uma linha de prep_reuniao para este cliente
  const { data: existente } = await service
    .from('universo_marca')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('cliente_id', session.cliente_id)
    .eq('subcategoria', 'prep_reuniao')
    .maybeSingle()

  let insertError
  if (existente) {
    const { error } = await service
      .from('universo_marca')
      .update({
        titulo:            `Prep de Reunião — ${session.client_name}`,
        conteudo:          { texto: result.output },
        gerado_por_agente: 'onboarding.modo2',
      })
      .eq('id', existente.id)
    insertError = error
  } else {
    const { error } = await service.from('universo_marca').insert({
      organization_id:      organizationId,
      cliente_id:           session.cliente_id,
      categoria:            'diagnostico',
      subcategoria:         'prep_reuniao',
      titulo:               `Prep de Reunião — ${session.client_name}`,
      conteudo:             { texto: result.output },
      visivel_para_cliente: false,
      gerado_por_agente:    'onboarding.modo2',
    })
    insertError = error
  }

  return {
    etapa: insertError ? 'insert_falhou' : 'concluido',
    marcasEncontradas: (marcasAll ?? []).length,
    marcasComBriefing: marcas.length,
    outputLen: result.output.length,
    insertErro: insertError?.message,
    ok: !insertError,
  }
}

// ---------------------------------------------------------------------------
// gerarModo3 — Briefing Completo (auto-gerado após importar notas Gemini do kickoff)
// ---------------------------------------------------------------------------

export interface GerarModo3Result {
  etapa: string
  briefingsUsados: number
  agenteErro?: string
  outputLen?: number
  insertErro?: string
  ok: boolean
}

export async function gerarModo3(opts: {
  clienteId: string
  organizationId: string
  transcricao: string
}): Promise<GerarModo3Result> {
  const { clienteId, organizationId, transcricao } = opts
  const service = createServiceClient()

  // Buscar nome do cliente
  const { data: cliente } = await service
    .from('clientes')
    .select('nome')
    .eq('id', clienteId)
    .single()

  if (!cliente) {
    return { etapa: 'cliente_nao_encontrado', briefingsUsados: 0, ok: false }
  }

  // Buscar briefings do onboarding (modo 1) salvos em universo_marca
  const { data: briefingRows } = await service
    .from('universo_marca')
    .select('titulo, conteudo')
    .eq('cliente_id', clienteId)
    .eq('organization_id', organizationId)
    .eq('gerado_por_agente', 'onboarding-modo1')
    .order('created_at', { ascending: true })

  // Fallback: buscar onboarding_marcas direto
  const { data: onboardingSession } = await service
    .from('onboarding_clientes')
    .select('token, client_name, setor, servicos_contratados, objetivo_declarado, dores_identificadas')
    .eq('cliente_id', clienteId)
    .eq('organization_id', organizationId)
    .maybeSingle()

  let clienteTexto = `Nome: ${cliente.nome}`
  let briefingsTexto = ''

  if (onboardingSession) {
    clienteTexto = [
      `Nome: ${onboardingSession.client_name}`,
      onboardingSession.setor ? `Setor: ${onboardingSession.setor}` : null,
      Array.isArray(onboardingSession.servicos_contratados) && onboardingSession.servicos_contratados.length
        ? `Serviços: ${(onboardingSession.servicos_contratados as string[]).join(', ')}`
        : null,
      onboardingSession.objetivo_declarado
        ? `Objetivo: ${onboardingSession.objetivo_declarado}`
        : null,
      onboardingSession.dores_identificadas
        ? `Dores: ${onboardingSession.dores_identificadas}`
        : null,
    ].filter(Boolean).join('\n')

    if (!briefingRows?.length) {
      // Fallback: buscar direto das onboarding_marcas usando briefing_output
      const { data: marcas } = await service
        .from('onboarding_marcas')
        .select('nome, briefing_output')
        .eq('token', onboardingSession.token)
        .order('ordem', { ascending: true })

      briefingsTexto = (marcas ?? [])
        .filter((m) => m.briefing_output)
        .map((m) => `## ${m.nome}\n${m.briefing_output}`)
        .join('\n\n')
    }
  }

  let briefingsCount = 0
  if (briefingRows?.length) {
    briefingsTexto = briefingRows.map((r) => {
      const texto = (r.conteudo as { texto?: string })?.texto ?? ''
      return `## ${r.titulo}\n${texto}`
    }).join('\n\n')
    briefingsCount = briefingRows.length
  } else {
    briefingsCount = briefingsTexto ? briefingsTexto.split('\n\n## ').length : 0
  }

  const result = await executarAgente({
    organizationId,
    agenteChave: 'onboarding.modo3',
    clienteId,
    input: {
      cliente: clienteTexto,
      briefings: briefingsTexto || '(briefings não disponíveis)',
      transcricao,
    },
  })

  if (!result.output) {
    return { etapa: 'agente_falhou', briefingsUsados: briefingsCount, agenteErro: result.error, ok: false }
  }

  // Insert ou update da linha de briefing_completo
  const { data: existente } = await service
    .from('universo_marca')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('cliente_id', clienteId)
    .eq('subcategoria', 'briefing_completo')
    .maybeSingle()

  let insertError
  if (existente) {
    const { error } = await service
      .from('universo_marca')
      .update({
        titulo:            `Briefing Completo — ${cliente.nome}`,
        conteudo:          { texto: result.output },
        gerado_por_agente: 'onboarding.modo3',
      })
      .eq('id', existente.id)
    insertError = error
  } else {
    const { error } = await service.from('universo_marca').insert({
      organization_id:      organizationId,
      cliente_id:           clienteId,
      categoria:            'brand_system',
      subcategoria:         'briefing_completo',
      titulo:               `Briefing Completo — ${cliente.nome}`,
      conteudo:             { texto: result.output },
      visivel_para_cliente: false,
      gerado_por_agente:    'onboarding.modo3',
    })
    insertError = error
  }

  // Inicializa o pipeline pós-kickoff (Personas → ... → Parâmetros) — idempotente
  if (!insertError) {
    await inicializarPipeline(clienteId, organizationId).catch(
      (err) => console.error('[gerarModo3] inicializarPipeline', err),
    )
  }

  return {
    etapa: insertError ? 'insert_falhou' : 'concluido',
    briefingsUsados: briefingsCount,
    outputLen: result.output.length,
    insertErro: insertError?.message,
    ok: !insertError,
  }
}
