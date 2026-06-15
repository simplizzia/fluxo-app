'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { requirePapel } from '@/lib/dal'
import { enviarEmail, emailOnboardingCliente } from '@/lib/email'
import { gerarModo3 } from '@/lib/onboarding/geradores'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface PipelineEtapa {
  marca_id: string | null
  etapa: string
  ordem: number
  status: 'pendente' | 'gerando' | 'aguardando_aprovacao' | 'aprovado' | 'ajuste_solicitado' | 'erro'
  output: string | null
  input_manual: string | null
  ajustes: string | null
  erro: string | null
  gerado_em: string | null
  aprovado_em: string | null
}

export async function buscarPipeline(clienteId: string): Promise<PipelineEtapa[]> {
  await requirePapel('socia', 'gestao', 'atendimento')
  const service = createServiceClient()
  const { data } = await service
    .from('onboarding_pipeline')
    .select('marca_id, etapa, ordem, status, output, input_manual, ajustes, erro, gerado_em, aprovado_em')
    .eq('cliente_id', clienteId)
    .order('ordem', { ascending: true })
  return (data ?? []) as PipelineEtapa[]
}

export interface OnboardingMarca {
  id: string
  nome: string
  publico: string | null
  site: string | null
  instagram: string | null
  linkedin: string | null
  posicionamento_atual: string | null
  concorrentes: string | null
  contexto_estrategico: string | null
  cenario_atual: string | null
  notas_complementares: string | null
  ordem: number
  status: 'pending' | 'done'
  briefing_output: string | null
  briefing_salvo_em: string | null
}

export interface OnboardingConfig {
  token: string
  status: 'pending' | 'briefing' | 'done'
  nome_contato: string | null
  email_contato: string | null
  cargo_contato: string | null
  setor: string | null
  servicos_contratados: string[]
  objetivo_declarado: string | null
  dores_identificadas: string | null
  cenario_atual: string | null
  link_enviado_em: string | null
  marcas: OnboardingMarca[]
  modos: { modo2: boolean; modo3: boolean }
}

// ---------------------------------------------------------------------------
// buscarOnboardingConfig — lê configuração atual de um cliente
// ---------------------------------------------------------------------------

export async function buscarOnboardingConfig(
  clienteId: string,
): Promise<{ data?: OnboardingConfig; error?: string }> {
  await requirePapel('socia', 'gestao', 'atendimento')
  const service = createServiceClient()

  const { data: session, error } = await service
    .from('onboarding_clientes')
    .select(`
      token, status, nome_contato, email_contato, cargo_contato, setor,
      servicos_contratados, objetivo_declarado, dores_identificadas,
      cenario_atual, link_enviado_em
    `)
    .eq('cliente_id', clienteId)
    .maybeSingle()

  if (error) return { error: 'Erro ao buscar configuração.' }
  if (!session) return { data: undefined }

  const [marcasResult, modosResult] = await Promise.all([
    service
      .from('onboarding_marcas')
      .select(`
        id, nome, publico, site, instagram, linkedin,
        posicionamento_atual, concorrentes, contexto_estrategico,
        cenario_atual, notas_complementares, ordem, status, briefing_output, briefing_salvo_em
      `)
      .eq('token', session.token)
      .order('ordem', { ascending: true }),
    service
      .from('universo_marca')
      .select('subcategoria')
      .eq('cliente_id', clienteId)
      .in('subcategoria', ['prep_reuniao', 'briefing_completo']),
  ])

  const subcats = new Set((modosResult.data ?? []).map((r) => r.subcategoria))

  return {
    data: {
      token:                session.token,
      status:               session.status as OnboardingConfig['status'],
      nome_contato:         session.nome_contato,
      email_contato:        session.email_contato,
      cargo_contato:        session.cargo_contato,
      setor:                session.setor,
      servicos_contratados: (session.servicos_contratados as string[]) ?? [],
      objetivo_declarado:   session.objetivo_declarado,
      dores_identificadas:  session.dores_identificadas,
      cenario_atual:        session.cenario_atual,
      link_enviado_em:      session.link_enviado_em,
      marcas:               (marcasResult.data ?? []) as OnboardingMarca[],
      modos: {
        modo2: subcats.has('prep_reuniao'),
        modo3: subcats.has('briefing_completo'),
      },
    },
  }
}

// ---------------------------------------------------------------------------
// actionSalvarOnboardingConfig — salva dados do cliente + marcas
// ---------------------------------------------------------------------------

export async function actionSalvarOnboardingConfig(
  clienteId: string,
  config: {
    nome_contato?: string
    email_contato?: string
    cargo_contato?: string
    setor?: string
    servicos_contratados?: string[]
    objetivo_declarado?: string
    dores_identificadas?: string
    cenario_atual?: string
  },
): Promise<{ error?: string }> {
  try {
    const profile = await requirePapel('socia', 'gestao')
    const service = createServiceClient()

    const { data: clienteRow } = await service
      .from('clientes')
      .select('nome')
      .eq('id', clienteId)
      .single()

    const { error } = await service
      .from('onboarding_clientes')
      .upsert(
        {
          organization_id:      profile.organization_id,
          cliente_id:           clienteId,
          client_name:          clienteRow?.nome ?? '',
          ...config,
          servicos_contratados: config.servicos_contratados ?? [],
        },
        { onConflict: 'cliente_id' },
      )

    if (error) {
      console.error('[actionSalvarOnboardingConfig] upsert error:', error)
      return { error: 'Erro ao salvar: ' + error.message }
    }

    revalidatePath(`/clientes/${clienteId}`)
    return {}
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[actionSalvarOnboardingConfig] exception:', msg)
    return { error: 'Exceção: ' + msg }
  }
}

// ---------------------------------------------------------------------------
// actionAdicionarMarca — adiciona marca ao onboarding
// ---------------------------------------------------------------------------

export async function actionAdicionarMarca(
  clienteId: string,
  marca: Omit<OnboardingMarca, 'id' | 'ordem' | 'status' | 'briefing_output' | 'briefing_salvo_em'>,
): Promise<{ error?: string }> {
  const profile = await requirePapel('socia', 'gestao')
  const service = createServiceClient()

  let { data: session } = await service
    .from('onboarding_clientes')
    .select('token')
    .eq('cliente_id', clienteId)
    .maybeSingle()

  // Auto-inicializa a sessão se ainda não existir
  if (!session) {
    const { data: clienteRow } = await service
      .from('clientes')
      .select('nome')
      .eq('id', clienteId)
      .single()

    const { data: nova, error: errInit } = await service
      .from('onboarding_clientes')
      .upsert(
        {
          organization_id: profile.organization_id,
          cliente_id:      clienteId,
          client_name:     clienteRow?.nome ?? '',
        },
        { onConflict: 'cliente_id' },
      )
      .select('token')
      .single()

    if (errInit || !nova) return { error: `Erro ao inicializar: ${errInit?.message ?? 'sem dados'}` }
    session = nova
  }

  // Próxima ordem
  const { data: ultima } = await service
    .from('onboarding_marcas')
    .select('ordem')
    .eq('token', session.token)
    .order('ordem', { ascending: false })
    .limit(1)
    .maybeSingle()

  const proxOrdem = ((ultima?.ordem ?? -1) + 1)

  const { error } = await service.from('onboarding_marcas').insert({
    organization_id:     profile.organization_id,
    token:               session.token,
    nome:                marca.nome,
    publico:             marca.publico ?? null,
    site:                marca.site ?? null,
    instagram:           marca.instagram ?? null,
    linkedin:            marca.linkedin ?? null,
    posicionamento_atual: marca.posicionamento_atual ?? null,
    concorrentes:        marca.concorrentes ?? null,
    contexto_estrategico: marca.contexto_estrategico ?? null,
    cenario_atual:       marca.cenario_atual ?? null,
    ordem:               proxOrdem,
  })

  if (error) return { error: 'Erro ao adicionar marca.' }
  revalidatePath(`/clientes/${clienteId}`)
  return {}
}

// ---------------------------------------------------------------------------
// actionEditarMarca
// ---------------------------------------------------------------------------

export async function actionEditarMarca(
  clienteId: string,
  marcaId: string,
  dados: Partial<Omit<OnboardingMarca, 'id' | 'ordem' | 'status' | 'briefing_output' | 'briefing_salvo_em'>>,
): Promise<{ error?: string }> {
  await requirePapel('socia', 'gestao')
  const service = createServiceClient()

  const { error } = await service
    .from('onboarding_marcas')
    .update({
      nome:                dados.nome ?? undefined,
      publico:             dados.publico ?? null,
      site:                dados.site ?? null,
      instagram:           dados.instagram ?? null,
      linkedin:            dados.linkedin ?? null,
      posicionamento_atual: dados.posicionamento_atual ?? null,
      concorrentes:        dados.concorrentes ?? null,
      contexto_estrategico: dados.contexto_estrategico ?? null,
      cenario_atual:       dados.cenario_atual ?? null,
    })
    .eq('id', marcaId)

  if (error) return { error: 'Erro ao editar marca.' }
  revalidatePath(`/clientes/${clienteId}`)
  return {}
}

// ---------------------------------------------------------------------------
// actionRemoverMarca
// ---------------------------------------------------------------------------

export async function actionRemoverMarca(
  clienteId: string,
  marcaId: string,
): Promise<{ error?: string }> {
  await requirePapel('socia', 'gestao')
  const service = createServiceClient()

  const { error } = await service
    .from('onboarding_marcas')
    .delete()
    .eq('id', marcaId)

  if (error) return { error: 'Erro ao remover marca.' }
  revalidatePath(`/clientes/${clienteId}`)
  return {}
}

// ---------------------------------------------------------------------------
// actionEnviarLinkOnboarding — envia email ao cliente com o link
// ---------------------------------------------------------------------------

export async function actionEnviarLinkOnboarding(
  clienteId: string,
  emailCliente: string,
): Promise<{ error?: string }> {
  const profile = await requirePapel('socia', 'gestao')
  const service = createServiceClient()

  const { data: session } = await service
    .from('onboarding_clientes')
    .select('token, client_name, marcas:onboarding_marcas(id)')
    .eq('cliente_id', clienteId)
    .single()

  if (!session) return { error: 'Configure o onboarding antes de enviar.' }

  const marcaCount = (session.marcas as { id: string }[])?.length ?? 0
  if (marcaCount === 0) return { error: 'Adicione pelo menos uma marca antes de enviar.' }

  const link = `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/cliente/${session.token}`

  await enviarEmail(
    [emailCliente],
    `Seu onboarding Simplizzia está pronto, ${session.client_name}!`,
    emailOnboardingCliente({ nome: session.client_name, link }),
  )

  // Marca data/hora do envio + guarda o email do contato (para convites de reunião)
  await service
    .from('onboarding_clientes')
    .update({ link_enviado_em: new Date().toISOString(), email_contato: emailCliente })
    .eq('cliente_id', clienteId)

  revalidatePath(`/clientes/${clienteId}`)
  return {}
}

// ---------------------------------------------------------------------------
// actionSalvarNotasComplementares — salva notas por marca (substitui reunião)
// ---------------------------------------------------------------------------

export async function actionSalvarNotasComplementares(
  clienteId: string,
  marcaId: string,
  notas: string,
): Promise<{ error?: string }> {
  await requirePapel('socia', 'gestao', 'atendimento')
  const service = createServiceClient()

  // Garante que a marca pertence a este cliente (via token da sessão)
  const { data: sessao } = await service
    .from('onboarding_clientes')
    .select('token')
    .eq('cliente_id', clienteId)
    .maybeSingle()

  if (!sessao?.token) return { error: 'Sessão de onboarding não encontrada.' }

  const { error } = await service
    .from('onboarding_marcas')
    .update({ notas_complementares: notas || null })
    .eq('id', marcaId)
    .eq('token', sessao.token)

  if (error) return { error: 'Erro ao salvar: ' + error.message }
  revalidatePath(`/clientes/${clienteId}`)
  return {}
}

// ---------------------------------------------------------------------------
// actionGerarModo3SemReuniao — gera Briefing Completo usando notas complementares
// ---------------------------------------------------------------------------

export async function actionGerarModo3SemReuniao(
  clienteId: string,
): Promise<{ error?: string; ok?: boolean }> {
  await requirePapel('socia', 'gestao')
  const service = createServiceClient()

  const { data: cliente } = await service
    .from('clientes')
    .select('organization_id')
    .eq('id', clienteId)
    .single()

  if (!cliente) return { error: 'Cliente não encontrado.' }

  const { data: sessao } = await service
    .from('onboarding_clientes')
    .select('token')
    .eq('cliente_id', clienteId)
    .maybeSingle()

  if (!sessao?.token) return { error: 'Sessão de onboarding não encontrada.' }

  const { data: marcas } = await service
    .from('onboarding_marcas')
    .select('nome, notas_complementares')
    .eq('token', sessao.token)
    .not('notas_complementares', 'is', null)
    .order('ordem', { ascending: true })

  const marcasComNotas = ((marcas ?? []) as { nome: string; notas_complementares: string | null }[])
    .filter((m) => m.notas_complementares?.trim())
  if (marcasComNotas.length === 0) {
    return { error: 'Preencha as notas complementares de pelo menos uma marca antes de gerar.' }
  }

  const transcricao = [
    '⚠️ ATENÇÃO: Não houve reunião de kickoff presencial. As informações abaixo substituem a transcrição.',
    'Use-as para preencher todas as seções do Briefing Completo — inclusive "Diretrizes Estratégicas" e "Próximos Passos" — sem mencionar reunião ou validação presencial.',
    '',
    ...marcasComNotas.map((m) => `## Notas complementares — ${m.nome}\n${m.notas_complementares}`),
  ].join('\n\n---\n\n')

  const resultado = await gerarModo3({
    clienteId,
    organizationId: cliente.organization_id,
    transcricao,
  })

  if (!resultado.ok) {
    return { error: resultado.agenteErro ?? resultado.insertErro ?? 'Erro ao gerar.' }
  }

  revalidatePath(`/clientes/${clienteId}`)
  return { ok: true }
}
