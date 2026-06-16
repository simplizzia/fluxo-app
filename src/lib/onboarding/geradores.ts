import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'
import { executarAgente } from '@/lib/agents/executor'
import { inicializarPipeline, continuarTextoMarkdown } from '@/lib/onboarding/pipeline'

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

  const briefingsTexto = marcas.map((m) => {
    const contextoEquipe = [
      m.publico ? `Público: ${m.publico}` : null,
      m.posicionamento_atual ? `Posicionamento atual: ${m.posicionamento_atual}` : null,
      m.concorrentes ? `Concorrentes: ${m.concorrentes}` : null,
      m.contexto_estrategico ? `Contexto estratégico: ${m.contexto_estrategico}` : null,
      m.cenario_atual ? `Cenário atual: ${m.cenario_atual}` : null,
    ].filter(Boolean).join('\n')

    return [
      `## ${m.nome}`,
      contextoEquipe ? `### Contexto já levantado pela equipe (antes da conversa)\n${contextoEquipe}` : null,
      `### Briefing da conversa com a Izzi\n${m.briefing_output ?? '(sem briefing)'}`,
    ].filter(Boolean).join('\n\n')
  }).join('\n\n---\n\n')

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
// parsearTranscricao — extrai seções por marca da transcrição do kickoff
// Retorna um Record<nomeOuChave, textoExtraido>
// ---------------------------------------------------------------------------

interface MarcaInfo {
  id: string
  nome: string
  nivel: string
}

function extrairSecoesPorMarca(
  outputParser: string,
  marcas: MarcaInfo[],
): { cliente: string; porMarca: Record<string, string> } {
  // O agente gera seções com cabeçalhos "## [Nome da Marca] (..."
  // Extrai seção "## Cliente" e uma seção por marca
  const secoes: Record<string, string> = {}

  // Divide por cabeçalhos ## (nível 2)
  const partes = outputParser.split(/^## /m)
  for (const parte of partes) {
    if (!parte.trim()) continue
    const linhas = parte.split('\n')
    const cabecalho = linhas[0].trim()
    const corpo = linhas.slice(1).join('\n').trim()
    secoes[cabecalho] = corpo
  }

  const cliente = secoes['Cliente'] ?? ''

  // Mapeia cada marca pelo nome (busca parcial case-insensitive)
  const porMarca: Record<string, string> = {}
  for (const marca of marcas) {
    const chave = Object.keys(secoes).find(
      (k) => k.toLowerCase().includes(marca.nome.toLowerCase()),
    )
    porMarca[marca.id] = chave ? secoes[chave] : ''
  }

  return { cliente, porMarca }
}

// ---------------------------------------------------------------------------
// gerarModo3 — Briefing por marca (nova arquitetura hierárquica)
//
// Fluxo:
//   1. Parsear transcrição → seções por marca
//   2. Gerar perfil do cliente (nível cliente)
//   3. Para cada marca (mãe antes das filhas): gerar briefing_marca isolado
//   4. Inicializar pipeline por marca
// ---------------------------------------------------------------------------

export interface GerarModo3Result {
  etapa: string
  briefingsUsados: number
  marcasGeradas: number
  erros?: string[]
  outputLen?: number
  agenteErro?: string
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
    return { etapa: 'cliente_nao_encontrado', briefingsUsados: 0, marcasGeradas: 0, ok: false }
  }

  // Buscar sessão de onboarding
  const { data: onboardingSession } = await service
    .from('onboarding_clientes')
    .select('token, client_name, setor, servicos_contratados, objetivo_declarado, dores_identificadas')
    .eq('cliente_id', clienteId)
    .eq('organization_id', organizationId)
    .maybeSingle()

  // Buscar hierarquia de marcas (mãe primeiro via ORDER BY nivel)
  let marcas: Array<{
    id: string
    nome: string
    nivel: string
    marca_pai_id: string | null
    publico: string | null
    posicionamento_atual: string | null
    concorrentes: string | null
    contexto_estrategico: string | null
    cenario_atual: string | null
    notas_complementares: string | null
    briefing_output: string | null
  }> = []

  if (onboardingSession) {
    const { data: marcasData } = await service
      .from('onboarding_marcas')
      .select('id, nome, nivel, marca_pai_id, publico, posicionamento_atual, concorrentes, contexto_estrategico, cenario_atual, notas_complementares, briefing_output')
      .eq('token', onboardingSession.token)
      .order('ordem', { ascending: true })
    marcas = (marcasData ?? []) as typeof marcas
  }

  const clienteTexto = onboardingSession
    ? [
        `Nome: ${onboardingSession.client_name}`,
        onboardingSession.setor ? `Setor: ${onboardingSession.setor}` : null,
        Array.isArray(onboardingSession.servicos_contratados) && onboardingSession.servicos_contratados.length
          ? `Serviços: ${(onboardingSession.servicos_contratados as string[]).join(', ')}`
          : null,
        onboardingSession.objetivo_declarado ? `Objetivo: ${onboardingSession.objetivo_declarado}` : null,
        onboardingSession.dores_identificadas ? `Dores: ${onboardingSession.dores_identificadas}` : null,
        marcas.length > 0
          ? `Marcas: ${marcas.map((m) => `${m.nome} (${m.nivel})`).join(', ')}`
          : null,
      ].filter(Boolean).join('\n')
    : `Nome: ${cliente.nome}`

  // --- PASSO 1: Parsear transcrição por marca ---
  const marcasListaTexto = marcas
    .map((m) => {
      const nivelLabel = m.nivel === 'mae' ? 'mãe B2B' : m.nivel === 'sub' ? 'sub-marca B2C' : 'standalone'
      return `- ${m.nome} (${nivelLabel})`
    })
    .join('\n')

  const resultParser = await executarAgente({
    organizationId,
    agenteChave: 'onboarding.parser_transcricao',
    clienteId,
    input: {
      transcricao,
      marcas: marcasListaTexto || '(sem marcas cadastradas)',
    },
  })

  let secoesPorMarca: Record<string, string> = {}
  let secaoCliente = ''

  if (resultParser.output) {
    const parsed = extrairSecoesPorMarca(resultParser.output, marcas)
    secoesPorMarca = parsed.porMarca
    secaoCliente = parsed.cliente
  }

  // --- PASSO 2: Gerar perfil do cliente ---
  const resultPerfil = await executarAgente({
    organizationId,
    agenteChave: 'onboarding.perfil_cliente',
    clienteId,
    input: {
      cliente: clienteTexto,
      secao_kickoff: secaoCliente || '(não identificado na transcrição)',
    },
  })

  if (resultPerfil.output) {
    const { data: perfilExistente } = await service
      .from('universo_marca')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('cliente_id', clienteId)
      .eq('subcategoria', 'perfil_cliente')
      .maybeSingle()

    if (perfilExistente) {
      await service
        .from('universo_marca')
        .update({ conteudo: { texto: resultPerfil.output }, gerado_por_agente: 'onboarding.perfil_cliente' })
        .eq('id', perfilExistente.id)
    } else {
      await service.from('universo_marca').insert({
        organization_id:      organizationId,
        cliente_id:           clienteId,
        categoria:            'diagnostico',
        subcategoria:         'perfil_cliente',
        titulo:               `Perfil do Cliente — ${cliente.nome}`,
        conteudo:             { texto: resultPerfil.output },
        visivel_para_cliente: false,
        gerado_por_agente:    'onboarding.perfil_cliente',
      })
    }
  }

  // --- PASSO 3: Gerar briefing por marca (mãe antes das filhas) ---
  const erros: string[] = []
  let marcasGeradas = 0
  let totalOutputLen = 0

  // Ordena: marcas mãe e standalone primeiro, sub-marcas depois
  const marcasOrdenadas = [
    ...marcas.filter((m) => m.nivel !== 'sub'),
    ...marcas.filter((m) => m.nivel === 'sub'),
  ]

  // Cache dos briefings das marcas mãe para passar como contexto às filhas
  const briefingsMae: Record<string, string> = {}

  for (const marca of marcasOrdenadas) {
    // Contexto da marca mãe (se sub-marca)
    let marcaMaeContexto = ''
    if (marca.nivel === 'sub' && marca.marca_pai_id) {
      marcaMaeContexto = briefingsMae[marca.marca_pai_id] ?? ''
    }

    // Contexto da equipe (pré-kickoff)
    const contextoEquipe = [
      marca.publico           ? `Público: ${marca.publico}` : null,
      marca.posicionamento_atual ? `Posicionamento atual: ${marca.posicionamento_atual}` : null,
      marca.concorrentes      ? `Concorrentes: ${marca.concorrentes}` : null,
      marca.contexto_estrategico ? `Contexto estratégico: ${marca.contexto_estrategico}` : null,
      marca.cenario_atual     ? `Cenário atual: ${marca.cenario_atual}` : null,
      marca.notas_complementares?.trim() ? `Notas complementares: ${marca.notas_complementares}` : null,
    ].filter(Boolean).join('\n')

    const nivelLabel = marca.nivel === 'mae' ? 'Marca Mãe (B2B)' : marca.nivel === 'sub' ? 'Sub-marca (B2C)' : 'Marca'

    const result = await executarAgente({
      organizationId,
      agenteChave: 'onboarding.briefing_marca',
      clienteId,
      marcaId: marca.id,
      input: {
        cliente: clienteTexto,
        marca: `Nome: ${marca.nome}\nNível: ${nivelLabel}\n\n${contextoEquipe}`,
        marca_mae_contexto: marcaMaeContexto || '(não se aplica — esta é uma marca standalone ou marca mãe)',
        conteudo_kickoff: secoesPorMarca[marca.id] || marca.briefing_output || '(sem conteúdo específico encontrado)',
        briefing_onboarding: marca.briefing_output || '(sem briefing de onboarding)',
      },
    })

    if (!result.output) {
      erros.push(`${marca.nome}: ${result.error ?? 'falha desconhecida'}`)
      continue
    }

    // Armazena no cache para sub-marcas filhas
    briefingsMae[marca.id] = result.output

    // Upsert em universo_marca com marca_id
    const { data: existente } = await service
      .from('universo_marca')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('cliente_id', clienteId)
      .eq('marca_id', marca.id)
      .eq('subcategoria', 'briefing_marca')
      .maybeSingle()

    if (existente) {
      await service
        .from('universo_marca')
        .update({
          titulo:            `Briefing de Marca — ${marca.nome}`,
          conteudo:          { texto: result.output },
          gerado_por_agente: 'onboarding.briefing_marca',
        })
        .eq('id', existente.id)
    } else {
      await service.from('universo_marca').insert({
        organization_id:      organizationId,
        cliente_id:           clienteId,
        marca_id:             marca.id,
        categoria:            'brand_system',
        subcategoria:         'briefing_marca',
        titulo:               `Briefing de Marca — ${marca.nome}`,
        conteudo:             { texto: result.output },
        visivel_para_cliente: false,
        gerado_por_agente:    'onboarding.briefing_marca',
      })
    }

    marcasGeradas++
    totalOutputLen += result.output.length
  }

  // --- PASSO 4: Inicializa pipeline por marca ---
  await inicializarPipeline(clienteId, organizationId).catch(
    (err) => console.error('[gerarModo3] inicializarPipeline', err),
  )

  return {
    etapa: marcasGeradas > 0 ? 'concluido' : 'sem_marcas_geradas',
    briefingsUsados: marcas.filter((m) => m.briefing_output).length,
    marcasGeradas,
    erros: erros.length > 0 ? erros : undefined,
    outputLen: totalOutputLen,
    ok: marcasGeradas > 0,
  }
}

// ---------------------------------------------------------------------------
// continuarBriefingMarca — emenda o briefing de uma marca específica quando
// o texto foi cortado por limite de tamanho, sem regerar tudo do zero.
// ---------------------------------------------------------------------------

export async function continuarBriefingMarca(opts: {
  clienteId: string
  organizationId: string
  marcaId: string
}): Promise<{ ok: boolean; completo?: boolean; error?: string; outputLen?: number }> {
  const { clienteId, organizationId, marcaId } = opts
  const service = createServiceClient()

  const { data: row } = await service
    .from('universo_marca')
    .select('id, conteudo')
    .eq('cliente_id', clienteId)
    .eq('organization_id', organizationId)
    .eq('marca_id', marcaId)
    .eq('subcategoria', 'briefing_marca')
    .maybeSingle()

  if (!row) return { ok: false, error: 'Briefing de marca não encontrado.' }

  const textoAtual = (row.conteudo as { texto?: string })?.texto ?? ''
  if (!textoAtual) return { ok: false, error: 'Briefing vazio.' }

  const { continuacao, completo, error } = await continuarTextoMarkdown(textoAtual, 4096)
  if (error) return { ok: false, error }
  if (completo || !continuacao) return { ok: true, completo: true, outputLen: textoAtual.length }

  const sep = textoAtual.endsWith('\n') ? '' : '\n'
  const novoTexto = `${textoAtual}${sep}${continuacao}`

  const { error: eUp } = await service
    .from('universo_marca')
    .update({ conteudo: { texto: novoTexto } })
    .eq('id', row.id)

  if (eUp) return { ok: false, error: eUp.message }

  return { ok: true, outputLen: novoTexto.length }
}

// ---------------------------------------------------------------------------
// continuarBriefingGeral — legado: emenda o Briefing Completo (Modo 3) quando
// o texto foi cortado. Mantido para clientes com briefing_completo existente.
// ---------------------------------------------------------------------------

export async function continuarBriefingGeral(opts: {
  clienteId: string
  organizationId: string
}): Promise<{ ok: boolean; completo?: boolean; error?: string; outputLen?: number }> {
  const { clienteId, organizationId } = opts
  const service = createServiceClient()

  const { data: row } = await service
    .from('universo_marca')
    .select('id, conteudo')
    .eq('cliente_id', clienteId)
    .eq('organization_id', organizationId)
    .eq('subcategoria', 'briefing_completo')
    .is('marca_id', null)
    .maybeSingle()

  if (!row) return { ok: false, error: 'Briefing Completo não encontrado.' }

  const textoAtual = (row.conteudo as { texto?: string })?.texto ?? ''
  if (!textoAtual) return { ok: false, error: 'Briefing vazio.' }

  const { continuacao, completo, error } = await continuarTextoMarkdown(textoAtual, 4096)
  if (error) return { ok: false, error }
  if (completo || !continuacao) return { ok: true, completo: true, outputLen: textoAtual.length }

  const sep = textoAtual.endsWith('\n') ? '' : '\n'
  const novoTexto = `${textoAtual}${sep}${continuacao}`

  const { error: eUp } = await service
    .from('universo_marca')
    .update({ conteudo: { texto: novoTexto } })
    .eq('id', row.id)

  if (eUp) return { ok: false, error: eUp.message }

  return { ok: true, outputLen: novoTexto.length }
}
