import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'
import { executarAgente } from '@/lib/agents/executor'

// ---------------------------------------------------------------------------
// Definição das etapas do pipeline pós-kickoff (ordem por dependência)
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

// ---------------------------------------------------------------------------
// Inicializa as linhas do pipeline (idempotente) — chamado quando o briefing
// geral (Modo 3) é gerado.
// ---------------------------------------------------------------------------

export async function inicializarPipeline(
  clienteId: string,
  organizationId: string,
): Promise<void> {
  const service = createServiceClient()
  const { data: existentes } = await service
    .from('onboarding_pipeline')
    .select('etapa')
    .eq('cliente_id', clienteId)

  const jaExiste = new Set((existentes ?? []).map((r) => r.etapa))

  const novas = ETAPAS_PIPELINE
    .filter((e) => !jaExiste.has(e.key))
    .map((e) => ({
      organization_id: organizationId,
      cliente_id:      clienteId,
      etapa:           e.key,
      ordem:           e.ordem,
      status:          'pendente' as const,
    }))

  if (novas.length > 0) {
    await service.from('onboarding_pipeline').insert(novas)
  }
}

// ---------------------------------------------------------------------------
// Gera (ou regenera) uma etapa via executarAgente
// ---------------------------------------------------------------------------

export async function gerarEtapa(opts: {
  clienteId: string
  organizationId: string
  etapaKey: string
  inputManual?: string
  ajuste?: string
}): Promise<{ ok: boolean; error?: string }> {
  const { clienteId, organizationId, etapaKey, inputManual, ajuste } = opts
  const def = etapaDef(etapaKey)
  if (!def) return { ok: false, error: 'Etapa inválida' }

  const service = createServiceClient()

  // marca como gerando
  await service
    .from('onboarding_pipeline')
    .update({ status: 'gerando', erro: null, updated_at: new Date().toISOString() })
    .eq('cliente_id', clienteId)
    .eq('etapa', etapaKey)

  // monta input — o contexto do cliente (universo_marca) é injetado pelo executor
  const input: Record<string, unknown> = {
    instrucao: `Gere a etapa "${def.label}" com base no contexto do cliente já fornecido (briefing, personas e demais documentos aprovados).`,
  }
  if (inputManual) input.presenca_digital = inputManual
  if (ajuste) input.ajuste_solicitado = ajuste

  const result = await executarAgente({
    organizationId,
    agenteChave: def.agenteChave,
    clienteId,
    input,
  })

  if (!result.output) {
    await service
      .from('onboarding_pipeline')
      .update({ status: 'erro', erro: result.error ?? 'Falha ao gerar', updated_at: new Date().toISOString() })
      .eq('cliente_id', clienteId)
      .eq('etapa', etapaKey)
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
    .eq('cliente_id', clienteId)
    .eq('etapa', etapaKey)

  return { ok: true }
}

// ---------------------------------------------------------------------------
// Aprova uma etapa → grava em universo_marca + dispara a próxima (se automática)
// ---------------------------------------------------------------------------

export async function aprovarEtapa(opts: {
  clienteId: string
  organizationId: string
  etapaKey: string
  aprovadoPor: string
}): Promise<{ ok: boolean; error?: string; proximaGerada?: string }> {
  const { clienteId, organizationId, etapaKey, aprovadoPor } = opts
  const def = etapaDef(etapaKey)
  if (!def) return { ok: false, error: 'Etapa inválida' }

  const service = createServiceClient()

  const { data: row } = await service
    .from('onboarding_pipeline')
    .select('output')
    .eq('cliente_id', clienteId)
    .eq('etapa', etapaKey)
    .single()

  if (!row?.output) return { ok: false, error: 'Etapa sem conteúdo para aprovar.' }

  // nome do cliente para o título
  const { data: cliente } = await service
    .from('clientes')
    .select('nome')
    .eq('id', clienteId)
    .single()

  // grava o conteúdo aprovado em universo_marca (insert ou update por subcategoria)
  const { data: existente } = await service
    .from('universo_marca')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('cliente_id', clienteId)
    .eq('subcategoria', def.subcategoria)
    .maybeSingle()

  const conteudo = { texto: row.output }
  const titulo = `${def.label} — ${cliente?.nome ?? ''}`.trim()

  if (existente) {
    await service.from('universo_marca').update({
      titulo, conteudo, gerado_por_agente: def.agenteChave,
    }).eq('id', existente.id)
  } else {
    await service.from('universo_marca').insert({
      organization_id:      organizationId,
      cliente_id:           clienteId,
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
    .eq('cliente_id', clienteId)
    .eq('etapa', etapaKey)

  // dispara a próxima etapa, se automática
  const proxima = ETAPAS_PIPELINE.find((e) => e.ordem === def.ordem + 1)
  if (proxima && !proxima.requerInput) {
    await gerarEtapa({ clienteId, organizationId, etapaKey: proxima.key })
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
  etapaKey: string
  feedback: string
  avaliadoPor: string
}): Promise<{ ok: boolean; error?: string }> {
  const { clienteId, organizationId, etapaKey, feedback, avaliadoPor } = opts
  const def = etapaDef(etapaKey)
  if (!def) return { ok: false, error: 'Etapa inválida' }

  const service = createServiceClient()

  // pega run_id atual + agent_id para gravar o feedback
  const [{ data: row }, { data: agente }] = await Promise.all([
    service.from('onboarding_pipeline').select('run_id, input_manual').eq('cliente_id', clienteId).eq('etapa', etapaKey).single(),
    service.from('agent_catalog').select('id').eq('chave', def.agenteChave).single(),
  ])

  // registra o ajuste como feedback negativo (calibra próximas gerações deste cliente)
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
    .eq('cliente_id', clienteId)
    .eq('etapa', etapaKey)

  // regenera com o ajuste no input
  return gerarEtapa({
    clienteId,
    organizationId,
    etapaKey,
    inputManual: row?.input_manual ?? undefined,
    ajuste: feedback,
  })
}
