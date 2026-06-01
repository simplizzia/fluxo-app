'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { requirePapel, getCurrentProfile } from '@/lib/dal'
import type { Badge, BadgeConquistado, PontuacaoMensal, RankingEntry } from '@/types/gamificacao'

// ---------------------------------------------------------------------------
// Queries — socias
// ---------------------------------------------------------------------------

export async function buscarBadgesDefinicoes(): Promise<Badge[]> {
  await requirePapel('socia')
  const supabase = await createClient()
  const { data } = await supabase
    .from('badges_definicoes')
    .select('id, nome, descricao, icone, tipo, criterios, beneficio_descricao, ativo')
    .order('tipo')
    .order('nome')
  return (data ?? []) as unknown as Badge[]
}

export async function buscarRankingMensalAction(): Promise<RankingEntry[]> {
  await requirePapel('socia')
  const supabase = await createClient()

  const agora = new Date()
  const mesRef = new Date(agora.getFullYear(), agora.getMonth(), 1)
    .toISOString().slice(0, 10)

  const { data } = await supabase
    .from('pontuacao_mensal')
    .select(`
      usuario_id, pontos,
      profile:profiles!usuario_id(nome_completo)
    `)
    .eq('mes_referencia', mesRef)
    .order('pontos', { ascending: false })
    .limit(20)

  return (data ?? []).map((row) => ({
    usuario_id: row.usuario_id as string,
    nome: (row.profile as unknown as { nome_completo: string } | null)?.nome_completo ?? 'Usuário',
    pontos: row.pontos as number,
    badges_mes: 0,
  }))
}

export async function buscarBadgesConquistadosTodos(): Promise<(BadgeConquistado & { usuario_nome: string })[]> {
  await requirePapel('socia')
  const supabase = await createClient()

  const agora = new Date()
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()

  const { data } = await supabase
    .from('badges_conquistados')
    .select(`
      id, badge_id, conquistado_em, card_id,
      badge:badges_definicoes!badge_id(nome, icone, tipo),
      profile:profiles!usuario_id(nome_completo)
    `)
    .gte('conquistado_em', inicioMes)
    .order('conquistado_em', { ascending: false })
    .limit(100)

  return (data ?? []).map((row) => ({
    id: row.id as string,
    badge_id: row.badge_id as string,
    conquistado_em: row.conquistado_em as string,
    card_id: row.card_id as string | null,
    badge: row.badge as unknown as Badge,
    usuario_nome: (row.profile as unknown as { nome_completo: string } | null)?.nome_completo ?? 'Usuário',
  }))
}

// ---------------------------------------------------------------------------
// Queries — usuário logado (perfil + conquistas)
// ---------------------------------------------------------------------------

export async function buscarMeusBadges(): Promise<{
  badges: BadgeConquistado[]
  pontuacaoMes: PontuacaoMensal | null
}> {
  const profile = await getCurrentProfile()
  const supabase = await createClient()

  const [{ data: conquistados }, { data: pontuacao }] = await Promise.all([
    supabase
      .from('badges_conquistados')
      .select(`
        id, badge_id, conquistado_em, card_id,
        badge:badges_definicoes!badge_id(nome, descricao, icone, tipo, criterios, beneficio_descricao)
      `)
      .eq('usuario_id', profile.id)
      .order('conquistado_em', { ascending: false })
      .limit(50),

    supabase
      .from('pontuacao_mensal')
      .select('usuario_id, mes_referencia, pontos, detalhes')
      .eq('usuario_id', profile.id)
      .order('mes_referencia', { ascending: false })
      .limit(1)
      .single(),
  ])

  return {
    badges: (conquistados ?? []) as unknown as BadgeConquistado[],
    pontuacaoMes: (pontuacao ?? null) as PontuacaoMensal | null,
  }
}

// ---------------------------------------------------------------------------
// Mutações — socias
// ---------------------------------------------------------------------------

export async function actionSalvarBadge(formData: FormData) {
  await requirePapel('socia')
  const supabase = await createClient()

  const id                = formData.get('id') as string | null
  const nome              = (formData.get('nome') as string).trim()
  const descricao         = (formData.get('descricao') as string).trim()
  const icone             = (formData.get('icone') as string).trim() || '🏆'
  const tipo              = formData.get('tipo') as 'colaborador' | 'cliente'
  const beneficio         = (formData.get('beneficio_descricao') as string | null)?.trim() || null
  const ativo             = formData.get('ativo') === 'true'

  if (!nome || !descricao || !tipo) throw new Error('Campos obrigatórios ausentes')

  if (id) {
    const { error } = await supabase
      .from('badges_definicoes')
      .update({
        nome, descricao, icone, tipo,
        beneficio_descricao: beneficio,
        ativo,
      })
      .eq('id', id)
    if (error) throw new Error(error.message)
  } else {
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '')
      .single()

    if (!profile) throw new Error('Perfil não encontrado')

    const { error } = await supabase.from('badges_definicoes').insert({
      organization_id: profile.organization_id,
      nome, descricao, icone, tipo,
      criterios: { tipo: 'personalizado' },
      beneficio_descricao: beneficio,
      ativo,
    })
    if (error) throw new Error(error.message)
  }

  revalidatePath('/socias/gamificacao')
}

export async function actionToggleBadge(badgeId: string, ativo: boolean) {
  await requirePapel('socia')
  const service = createServiceClient()
  const { error } = await service
    .from('badges_definicoes')
    .update({ ativo })
    .eq('id', badgeId)
  if (error) throw new Error(error.message)
  revalidatePath('/socias/gamificacao')
}
