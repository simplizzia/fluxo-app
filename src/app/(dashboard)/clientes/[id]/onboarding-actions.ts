'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { requirePapel } from '@/lib/dal'
import { enviarEmail, emailOnboardingCliente } from '@/lib/email'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

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
  ordem: number
  status: 'pending' | 'done'
  briefing_output: string | null
  briefing_salvo_em: string | null
}

export interface OnboardingConfig {
  token: string
  status: 'pending' | 'briefing' | 'done'
  nome_contato: string | null
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
      token, status, nome_contato, cargo_contato, setor,
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
        cenario_atual, ordem, status, briefing_output, briefing_salvo_em
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
    cargo_contato?: string
    setor?: string
    servicos_contratados?: string[]
    objetivo_declarado?: string
    dores_identificadas?: string
    cenario_atual?: string
  },
): Promise<{ error?: string }> {
  const profile = await requirePapel('socia', 'gestao')
  const service = createServiceClient()

  // Cria sessão se não existir (idempotente)
  const { data: clienteRow } = await service
    .from('clientes')
    .select('nome')
    .eq('id', clienteId)
    .single()

  await service
    .from('onboarding_clientes')
    .upsert(
      {
        organization_id: profile.organization_id,
        cliente_id:      clienteId,
        client_name:     clienteRow?.nome ?? '',
        ...config,
        servicos_contratados: config.servicos_contratados ?? [],
      },
      { onConflict: 'cliente_id' },
    )

  revalidatePath(`/clientes/${clienteId}`)
  return {}
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

    const { data: nova } = await service
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

    if (!nova) return { error: 'Erro ao inicializar onboarding.' }
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

  // Marca data/hora do envio
  await service
    .from('onboarding_clientes')
    .update({ link_enviado_em: new Date().toISOString() })
    .eq('cliente_id', clienteId)

  revalidatePath(`/clientes/${clienteId}`)
  return {}
}
