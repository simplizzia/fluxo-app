import 'server-only'
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
}): Promise<{ ok: boolean; error?: string }> {
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

  await service
    .from('onboarding_pipeline')
    .update({ status: 'gerando', updated_at: new Date().toISOString() })
    .eq('cliente_id', clienteId).eq('marca_id', marcaId).eq('etapa', etapaKey)

  // Dá ao agente o trecho final do documento e pede para emendar
  const trechoFinal = row.output.slice(-2000)
  const result = await executarAgente({
    organizationId,
    agenteChave: def.agenteChave,
    clienteId,
    marcaId,
    input: {
      instrucao: `O documento abaixo (etapa "${def.label}") foi INTERROMPIDO por limite de tamanho. Continue EXATAMENTE de onde parou: não repita nada já escrito, não reescreva o início nem reintroduza o documento, apenas emende o texto que falta a partir da última frase, mantendo o mesmo formato markdown e o mesmo tom. Comece a resposta diretamente com a continuação.`,
      trecho_final_ja_escrito: trechoFinal,
    },
  })

  if (!result.output) {
    await service
      .from('onboarding_pipeline')
      .update({ status: 'aguardando_aprovacao', updated_at: new Date().toISOString() })
      .eq('cliente_id', clienteId).eq('marca_id', marcaId).eq('etapa', etapaKey)
    return { ok: false, error: result.error ?? 'Falha ao continuar' }
  }

  // Emenda: junta o output existente com a continuação
  const continuacao = result.output.trimStart()
  const sep = row.output.endsWith('\n') ? '' : '\n'
  const novoOutput = `${row.output}${sep}${continuacao}`

  await service
    .from('onboarding_pipeline')
    .update({
      status:     'aguardando_aprovacao',
      output:     novoOutput,
      run_id:     result.runId ?? null,
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

  // dispara a próxima etapa da mesma marca, se automática
  const proxima = ETAPAS_PIPELINE.find((e) => e.ordem === def.ordem + 1)
  if (proxima && !proxima.requerInput) {
    await gerarEtapa({ clienteId, organizationId, marcaId, etapaKey: proxima.key })
    return { ok: true, proximaGerada: proxima.key }
  }

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
