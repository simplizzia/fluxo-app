/**
 * Gamificação — Sprint 5.5
 *
 * Funções exportadas:
 *   avaliarBadges(cardId)        → avalia e concede badges ao concluir um card
 *   calcPontuacaoMensal(userId)  → recalcula pontos do mês corrente
 *   buscarRankingMensal()        → ranking de colaboradores do mês
 */
import 'server-only'

import { createServiceClient } from './supabase/server'
import type { Badge, BadgeConquistado, PontuacaoMensal, RankingEntry } from '@/types/gamificacao'

// Re-exporta para quem já importava daqui via paths de servidor
export type { Badge, BadgeConquistado, PontuacaoMensal, RankingEntry }

// Pontos por tipo de badge
const PONTOS_BADGE: Record<string, number> = {
  aprovacao_primeira: 15,
  velocidade:        10,
  zero_reproves:     20,
  resposta_rapida:    5,
  brief_completo:     5,
}

// ---------------------------------------------------------------------------
// avaliarBadges — chamado ao concluir ou transicionar um card
// ---------------------------------------------------------------------------

export async function avaliarBadges(cardId: string): Promise<void> {
  const service = createServiceClient()

  // Busca o card com dados relevantes
  const { data: card } = await service
    .from('cards')
    .select(`
      id, organization_id, cliente_id, status,
      responsavel_id, rodadas_revisao,
      data_entrega_programada, concluido_em,
      sla_iniciado_em, sla_respondido_em,
      created_at, updated_at,
      cliente:clientes!cliente_id(contato_principal_id)
    `)
    .eq('id', cardId)
    .single()

  if (!card) return

  const orgId = card.organization_id as string

  // Busca badges da organização
  const { data: badgesDefs } = await service
    .from('badges_definicoes')
    .select('id, nome, icone, tipo, criterios')
    .eq('organization_id', orgId)
    .eq('ativo', true)

  if (!badgesDefs || badgesDefs.length === 0) return

  const badges = badgesDefs as Badge[]

  // ---------------------------------------------------------------------------
  // Avalia cada badge
  // ---------------------------------------------------------------------------

  const conquistar: { usuarioId: string; badgeId: string }[] = []

  for (const badge of badges) {
    const tipo = (badge.criterios as Record<string, unknown>)?.tipo as string | undefined
    if (!tipo) continue

    // --- Aprovação de Primeira (colaborador) ---
    if (tipo === 'aprovacao_primeira' && badge.tipo === 'colaborador') {
      const responsavelId = card.responsavel_id as string | null
      if (!responsavelId) continue
      const rodadas = (card.rodadas_revisao as number) ?? 0
      if (card.status === 'concluido' && rodadas === 0) {
        conquistar.push({ usuarioId: responsavelId, badgeId: badge.id })
      }
    }

    // --- Velocidade (colaborador) ---
    if (tipo === 'velocidade' && badge.tipo === 'colaborador') {
      const responsavelId = card.responsavel_id as string | null
      if (!responsavelId || !card.data_entrega_programada || !card.concluido_em) continue
      const diasAntes = ((badge.criterios as Record<string, unknown>).dias_antes as number) ?? 2
      const prazo = new Date(card.data_entrega_programada as string)
      const concluido = new Date(card.concluido_em as string)
      const diffDias = (prazo.getTime() - concluido.getTime()) / (1000 * 60 * 60 * 24)
      if (diffDias >= diasAntes) {
        conquistar.push({ usuarioId: responsavelId, badgeId: badge.id })
      }
    }

    // --- Resposta Relâmpago (cliente) ---
    if (tipo === 'resposta_rapida' && badge.tipo === 'cliente') {
      const clienteContatoId = (card.cliente as unknown as { contato_principal_id: string | null } | null)
        ?.contato_principal_id
      if (!clienteContatoId || !card.sla_respondido_em || !card.sla_iniciado_em) continue
      const horas = ((badge.criterios as Record<string, unknown>).horas as number) ?? 24
      const diff = (
        new Date(card.sla_respondido_em as string).getTime() -
        new Date(card.sla_iniciado_em as string).getTime()
      ) / (1000 * 60 * 60)
      if (diff <= horas) {
        conquistar.push({ usuarioId: clienteContatoId, badgeId: badge.id })
      }
    }

    // --- Brief Completo (cliente) ---
    if (tipo === 'brief_completo' && badge.tipo === 'cliente') {
      const clienteContatoId = (card.cliente as unknown as { contato_principal_id: string | null } | null)
        ?.contato_principal_id
      if (!clienteContatoId) continue

      // Verifica se o card nunca passou por aguardando_info
      const { count } = await service
        .from('audit_log')
        .select('id', { count: 'exact', head: true })
        .eq('entidade_id', cardId)
        .eq('acao', 'status_mudou')
        .eq('detalhes->>novo_status', 'aguardando_info')

      if ((count ?? 0) === 0) {
        conquistar.push({ usuarioId: clienteContatoId, badgeId: badge.id })
      }
    }
  }

  // Concede badges (ignora duplicatas via UNIQUE constraint)
  for (const { usuarioId, badgeId } of conquistar) {
    await service.from('badges_conquistados').upsert(
      {
        organization_id: orgId,
        usuario_id:      usuarioId,
        badge_id:        badgeId,
        card_id:         cardId,
        conquistado_em:  new Date().toISOString(),
      },
      { onConflict: 'organization_id,usuario_id,badge_id,card_id', ignoreDuplicates: true },
    )
  }

  // Recalcula pontuação dos usuários afetados
  const usuariosAfetados = [...new Set(conquistar.map((c) => c.usuarioId))]
  await Promise.all(usuariosAfetados.map((uid) => calcPontuacaoMensal(uid, orgId)))
}

// ---------------------------------------------------------------------------
// avaliarBadgeZeroReproves — chamado mensalmente para cada colaborador
// ---------------------------------------------------------------------------

export async function avaliarBadgeZeroReprovesMes(orgId: string): Promise<void> {
  const service = createServiceClient()

  // Busca o badge "zero_reproves"
  const { data: badge } = await service
    .from('badges_definicoes')
    .select('id, nome, icone')
    .eq('organization_id', orgId)
    .eq('ativo', true)
    .contains('criterios', { tipo: 'zero_reproves' })
    .single()

  if (!badge) return

  // Mês atual
  const agora = new Date()
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()
  const fimMes    = new Date(agora.getFullYear(), agora.getMonth() + 1, 1).toISOString()

  // Busca colaboradores ativos
  const { data: colaboradores } = await service
    .from('profiles')
    .select('id')
    .eq('organization_id', orgId)
    .in('papel', ['executor', 'gestao', 'atendimento'])
    .eq('ativo', true)

  for (const colab of (colaboradores ?? [])) {
    // Verifica se o colaborador tem algum card necessita_ajustes no mês
    const { count } = await service
      .from('cards')
      .select('id', { count: 'exact', head: true })
      .eq('responsavel_id', colab.id)
      .eq('organization_id', orgId)
      .eq('status', 'necessita_ajustes')
      .gte('updated_at', inicioMes)
      .lt('updated_at', fimMes)

    if ((count ?? 0) === 0) {
      // Não tem nenhum reprove no mês — concede o badge
      await service.from('badges_conquistados').upsert(
        {
          organization_id: orgId,
          usuario_id:      colab.id,
          badge_id:        badge.id,
          card_id:         null,
          conquistado_em:  new Date().toISOString(),
        },
        { onConflict: 'organization_id,usuario_id,badge_id,card_id', ignoreDuplicates: true },
      )
      await calcPontuacaoMensal(colab.id, orgId)
    }
  }
}

// ---------------------------------------------------------------------------
// calcPontuacaoMensal — recalcula pontos do mês para um usuário
// ---------------------------------------------------------------------------

export async function calcPontuacaoMensal(usuarioId: string, orgId: string): Promise<void> {
  const service = createServiceClient()

  const agora = new Date()
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)
  const mesRef = inicioMes.toISOString().slice(0, 10) // "2026-05-01"

  // Busca badges conquistados neste mês
  const { data: conquistados } = await service
    .from('badges_conquistados')
    .select(`
      badge_id,
      badge:badges_definicoes!badge_id(nome, icone, criterios)
    `)
    .eq('organization_id', orgId)
    .eq('usuario_id', usuarioId)
    .gte('conquistado_em', inicioMes.toISOString())

  let totalPontos = 0
  const detalhes: { badge: string; pontos: number; icone: string }[] = []

  for (const c of (conquistados ?? [])) {
    const b = c.badge as unknown as { nome: string; icone: string; criterios: { tipo: string } } | null
    if (!b) continue
    const pts = PONTOS_BADGE[b.criterios?.tipo] ?? 5
    totalPontos += pts
    detalhes.push({ badge: b.nome, pontos: pts, icone: b.icone })
  }

  await service.from('pontuacao_mensal').upsert(
    {
      organization_id: orgId,
      usuario_id:      usuarioId,
      mes_referencia:  mesRef,
      pontos:          totalPontos,
      detalhes:        detalhes,
    },
    { onConflict: 'organization_id,usuario_id,mes_referencia' },
  )
}

// ---------------------------------------------------------------------------
// buscarRankingMensal — top colaboradores do mês corrente
// ---------------------------------------------------------------------------

export async function buscarRankingMensal(orgId: string, limite = 10): Promise<RankingEntry[]> {
  const service = createServiceClient()

  const agora = new Date()
  const mesRef = new Date(agora.getFullYear(), agora.getMonth(), 1)
    .toISOString().slice(0, 10)

  const { data } = await service
    .from('pontuacao_mensal')
    .select(`
      usuario_id, pontos,
      profile:profiles!usuario_id(nome_completo)
    `)
    .eq('organization_id', orgId)
    .eq('mes_referencia', mesRef)
    .order('pontos', { ascending: false })
    .limit(limite)

  if (!data) return []

  // Conta badges do mês para cada usuário
  const iniMes = mesRef
  const entries: RankingEntry[] = await Promise.all(
    data.map(async (row) => {
      const { count } = await service
        .from('badges_conquistados')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('usuario_id', row.usuario_id as string)
        .gte('conquistado_em', iniMes)

      const nome = (row.profile as unknown as { nome_completo: string } | null)?.nome_completo ?? 'Usuário'
      return {
        usuario_id: row.usuario_id as string,
        nome,
        pontos:     row.pontos as number,
        badges_mes: count ?? 0,
      }
    })
  )

  return entries
}
