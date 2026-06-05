import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/server'
import { executarAgente } from '@/lib/agents/executor'

// ---------------------------------------------------------------------------
// Definição das etapas do pipeline pós-kickoff (ordem por dependência).
// O pipeline roda POR MARCA — cada marca do cliente tem sua própria sequência.
// ---------------------------------------------------------------------------

type CategoriaUniverso = 'outros' | 'brand_system' | 'personas' | 'diagnostico' | 'parametros' | 'calendario'

export interface EtapaDef {
  key: string
  ordem: number
  label: string
  agenteChave: string
  categoria: CategoriaUniverso   // destino em universo_marca
  subcategoria: string
  requerInput: boolean           // precisa de input manual antes de gerar
  inputLabel?: string
}

export const ETAPAS_PIPELINE: EtapaDef[] = [
  {
    key: 'personas', ordem: 1, label: 'Personas',
    agenteChave: 'personas.personas',
    categoria: 'personas', subcategoria: 'personas',
    requerInput: false,
  },
  {
    key: 'diagnostico_digital', ordem: 2, label: 'Diagnóstico Digital',
    agenteChave: 'diagnostico.digital',
    categoria: 'diagnostico', subcategoria: 'digital',
    requerInput: true,
    inputLabel: 'Cole os links das redes sociais, site e o que encontrou (prints/descrições). A Izzi analisa com base nisso.',
  },
  {
    key: 'posicionamento_marca', ordem: 3, label: 'Posicionamento & Marca',
    agenteChave: 'brand-system.principal',
    categoria: 'brand_system', subcategoria: 'posicionamento',
    requerInput: false,
  },
  {
    key: 'diagnostico_marca', ordem: 4, label: 'Diagnóstico de Marca',
    agenteChave: 'diagnostico-marca.diagnostico',
    categoria: 'diagnostico', subcategoria: 'marca',
    requerInput: false,
  },
  {
    key: 'parametros_conteudo', ordem: 5, label: 'Parâmetros de Conteúdo',
    agenteChave: 'inteligencia.parametrizador',
    categoria: 'parametros', subcategoria: 'parametros',
    requerInput: false,
  },
]

export function etapaDef(key: string): EtapaDef | undefined {
  return ETAPAS_PIPELINE.find((e) => e.key === key)
}

// Marcas configuradas do cliente (via onboarding)
async function getMarcas(clienteId: string): Promise<{ id: string; nome: string }[]> {
  const service = createServiceClient()
  const { data: session } = await service
    .from('onboarding_clientes')
    .select('token')
    .eq('cliente_id', clienteId)
    .maybeSingle()
  if (!session) return []
  const { data: marcas } = await service
    .from('onboarding_marcas')
    .select('id, nome')
    .eq('token', session.token)
    .order('ordem', { ascending: true })
  return (marcas ?? []) as { id: string; nome: string }[]
}

// ---------------------------------------------------------------------------
// Inicializa o pipeline (idempotente): cria as etapas para CADA marca.
// Chamado quando o Briefing Geral (Modo 3) é gerado.
// ---------------------------------------------------------------------------

export async function inicializarPipeline(
  clienteId: string,
  organizationId: string,
): Promise<void> {
  const service = createServiceClient()
  const marcas = await getMarcas(clienteId)
  if (marcas.length === 0) return

  const { data: existentes } = await service
    .from('onboarding_pipeline')
    .select('etapa, marca_id')
    .eq('cliente_id', clienteId)

  const jaExiste = new Set((existentes ?? []).map((r) => `${r.marca_id}::${r.etapa}`))

  const novas: {
    organization_id: string; cliente_id: string; marca_id: string
    etapa: string; ordem: number; status: 'pendente'
  }[] = []

  for (const marca of marcas) {
    for (const e of ETAPAS_PIPELINE) {
      if (!jaExiste.has(`${marca.id}::${e.key}`)) {
        novas.push({
          organization_id: organizationId,
          cliente_id:      clienteId,
          marca_id:        marca.id,
          etapa:           e.key,
          ordem:           e.ordem,
          status:          'pendente',
        })
      }
    }
  }

  if (novas.length > 0) {
    await service.from('onboarding_pipeline').insert(novas)
  }
}

// ---------------------------------------------------------------------------
// Gera (ou regenera) uma etapa de uma marca via executarAgente
// ---------------------------------------------------------------------------

export async function gerarEtapa(opts: {
  clienteId: string
  organizationId: string
  marcaId: string
  etapaKey: string
  inputManual?: string
  ajuste?: string
}): Promise<{ ok: boolean; error?: string }> {
  const { clienteId, organizationId, marcaId, etapaKey, inputManual, ajuste } = opts
  const def = etapaDef(etapaKey)
  if (!def) return { ok: false, error: 'Etapa inválida' }

  const service = createServiceClient()

  await service
    .from('onboarding_pipeline')
    .update({ status: 'gerando', erro: null, updated_at: new Date().toISOString() })
    .eq('cliente_id', clienteId).eq('marca_id', marcaId).eq('etapa', etapaKey)

  const input: Record<string, unknown> = {
    instrucao: `Gere a etapa "${def.label}" para a marca em foco, com base no contexto já fornecido (briefing geral, briefing da marca e documentos aprovados desta marca).`,
  }
  if (inputManual) input.presenca_digital = inputManual
  if (ajuste) input.ajuste_solicitado = ajuste

  const result = await executarAgente({
    organizationId,
    agenteChave: def.agenteChave,
    clienteId,
    marcaId,
    input,
  })

  if (!result.output) {
    await service
      .from('onboarding_pipeline')
      .update({ status: 'erro', erro: result.error ?? 'Falha ao gerar', updated_at: new Date().toISOString() })
      .eq('cliente_id', clienteId).eq('marca_id', marcaId).eq('etapa', etapaKey)
    return { ok: false, error: result.error }
  }

  await service
    .from('onboarding_pipeline')
    .update({
      status:       'aguardando_aprovacao',
      output:       result.output,
      run_id:       result.runId ?? null,
      ajustes:      ajuste ?? null,
      input_manual: inputManual ?? null,
      gerado_em:    new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    })
    .eq('cliente_id', clienteId).eq('marca_id', marcaId).eq('etapa', etapaKey)

  return { ok: true }
}

// ---------------------------------------------------------------------------
// Aprova uma etapa → grava em universo_marca (com marca_id) + dispara a próxima
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Continua uma etapa cujo texto foi cortado por limite — emenda sem regenerar
// ---------------------------------------------------------------------------

export async function continuarEtapa(opts: {
  clienteId: string
  organizationId: string
  marcaId: string
  etapaKey: string
}): Promise<{ ok: boolean; error?: string; completo?: boolean }> {
  const { clienteId, organizationId, marcaId, etapaKey } = opts
  const def = etapaDef(etapaKey)
  if (!def) return { ok: false, error: 'Etapa inválida' }

  const service = createServiceClient()

  const { data: row } = await service
    .from('onboarding_pipeline')
    .select('output')
    .eq('cliente_id', clienteId).eq('marca_id', marcaId).eq('etapa', etapaKey)
    .single()

  if (!row?.output) return { ok: false, error: 'Nada para continuar.' }

  // IMPORTANTE: a continuação NÃO usa o prompt do agente (que mandaria refazer o
  // documento inteiro). Usa um prompt mínimo de "continuação de texto", então o
  // modelo apenas emenda de onde parou — sem reiniciar nem repetir.
  const MARCADOR_COMPLETO = '[DOCUMENTO_COMPLETO]'
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  let continuacaoRaw = ''
  try {
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2000,
      system:
        'Você CONTINUA documentos markdown que foram cortados no fim por limite de tamanho. ' +
        'Você recebe o documento atual e devolve APENAS a continuação — começando exatamente na palavra/frase onde o texto parou. ' +
        'NUNCA repita, reescreva ou reintroduza nada que já está no documento. NUNCA recomece do título. ' +
        'Mantenha o mesmo formato markdown, tom e idioma. ' +
        `Se o documento já está visivelmente completo e bem encerrado, responda APENAS com ${MARCADOR_COMPLETO} e nada mais.`,
      messages: [{
        role: 'user',
        content: `Documento atual (continue a partir do final dele):\n\n<documento>\n${row.output}\n</documento>\n\nDevolva apenas a continuação a partir de onde o texto para (ou ${MARCADOR_COMPLETO} se já estiver completo).`,
      }],
    })
    continuacaoRaw = resp.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha ao continuar' }
  }

  // Documento já estava completo
  if (continuacaoRaw.includes(MARCADOR_COMPLETO) && continuacaoRaw.replace(MARCADOR_COMPLETO, '').trim().length < 40) {
    return { ok: true, completo: true }
  }

  const continuacao = continuacaoRaw.replace(MARCADOR_COMPLETO, '').trimStart()
  if (!continuacao) return { ok: true, completo: true }

  const sep = row.output.endsWith('\n') ? '' : '\n'
  const novoOutput = `${row.output}${sep}${continuacao}`

  await service
    .from('onboarding_pipeline')
    .update({
      status:     'aguardando_aprovacao',
      output:     novoOutput,
      updated_at: new Date().toISOString(),
    })
    .eq('cliente_id', clienteId).eq('marca_id', marcaId).eq('etapa', etapaKey)

  return { ok: true }
}

export async function aprovarEtapa(opts: {
  clienteId: string
  organizationId: string
  marcaId: string
  etapaKey: string
  aprovadoPor: string
}): Promise<{ ok: boolean; error?: string; proximaGerada?: string }> {
  const { clienteId, organizationId, marcaId, etapaKey, aprovadoPor } = opts
  const def = etapaDef(etapaKey)
  if (!def) return { ok: false, error: 'Etapa inválida' }

  const service = createServiceClient()

  const { data: row } = await service
    .from('onboarding_pipeline')
    .select('output')
    .eq('cliente_id', clienteId).eq('marca_id', marcaId).eq('etapa', etapaKey)
    .single()

  if (!row?.output) return { ok: false, error: 'Etapa sem conteúdo para aprovar.' }

  const { data: marca } = await service
    .from('onboarding_marcas')
    .select('nome')
    .eq('id', marcaId)
    .single()

  // grava o conteúdo aprovado em universo_marca (por marca + subcategoria)
  const { data: existente } = await service
    .from('universo_marca')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('cliente_id', clienteId)
    .eq('marca_id', marcaId)
    .eq('subcategoria', def.subcategoria)
    .maybeSingle()

  const conteudo = { texto: row.output }
  const titulo = `${def.label} — ${marca?.nome ?? ''}`.trim()

  if (existente) {
    await service.from('universo_marca').update({
      titulo, conteudo, gerado_por_agente: def.agenteChave,
    }).eq('id', existente.id)
  } else {
    await service.from('universo_marca').insert({
      organization_id:      organizationId,
      cliente_id:           clienteId,
      marca_id:             marcaId,
      categoria:            def.categoria,
      subcategoria:         def.subcategoria,
      titulo,
      conteudo,
      visivel_para_cliente: false,
      gerado_por_agente:    def.agenteChave,
    })
  }

  await service
    .from('onboarding_pipeline')
    .update({
      status:       'aprovado',
      aprovado_em:  new Date().toISOString(),
      aprovado_por: aprovadoPor,
      updated_at:   new Date().toISOString(),
    })
    .eq('cliente_id', clienteId).eq('marca_id', marcaId).eq('etapa', etapaKey)

  // Aprovar apenas libera a próxima etapa (fica 'pendente'); a geração é feita
  // num clique separado para não estourar o tempo da função serverless.
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Solicita ajuste → grava feedback (calibra o agente p/ este cliente) + regera
// ---------------------------------------------------------------------------

export async function solicitarAjuste(opts: {
  clienteId: string
  organizationId: string
  marcaId: string
  etapaKey: string
  feedback: string
  avaliadoPor: string
}): Promise<{ ok: boolean; error?: string }> {
  const { clienteId, organizationId, marcaId, etapaKey, feedback, avaliadoPor } = opts
  const def = etapaDef(etapaKey)
  if (!def) return { ok: false, error: 'Etapa inválida' }

  const service = createServiceClient()

  const [{ data: row }, { data: agente }] = await Promise.all([
    service.from('onboarding_pipeline').select('run_id, input_manual')
      .eq('cliente_id', clienteId).eq('marca_id', marcaId).eq('etapa', etapaKey).single(),
    service.from('agent_catalog').select('id').eq('chave', def.agenteChave).single(),
  ])

  if (row?.run_id && agente?.id) {
    await service.from('agent_feedback').insert({
      organization_id: organizationId,
      run_id:          row.run_id,
      agent_id:        agente.id,
      cliente_id:      clienteId,
      avaliado_por:    avaliadoPor,
      avaliacao:       'ruim',
      comentario:      feedback,
    }).select('id').maybeSingle()
  }

  await service
    .from('onboarding_pipeline')
    .update({ status: 'ajuste_solicitado', ajustes: feedback, updated_at: new Date().toISOString() })
    .eq('cliente_id', clienteId).eq('marca_id', marcaId).eq('etapa', etapaKey)

  return gerarEtapa({
    clienteId,
    organizationId,
    marcaId,
    etapaKey,
    inputManual: row?.input_manual ?? undefined,
    ajuste: feedback,
  })
}
