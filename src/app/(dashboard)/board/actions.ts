'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile, requireEquipe } from '@/lib/dal'
import type { StatusCard, PrioridadeCard, CampoFormulario } from '@/types/database'

// ---------------------------------------------------------------------------
// Tipos compartilhados com o client
// ---------------------------------------------------------------------------

export interface BoardCard {
  id: string
  titulo: string
  status: StatusCard
  prioridade: PrioridadeCard
  prazo_cliente: string | null
  confidencial: boolean
  created_at: string
  cliente: { id: string; nome: string }
  tipo: { id: string; nome: string; categoria: string }
  responsavel: { id: string; nome: string } | null
}

// ---------------------------------------------------------------------------
// actionMoverCard — atualiza status via drag-and-drop
// ---------------------------------------------------------------------------

export async function actionMoverCard(
  cardId: string,
  novoStatus: StatusCard,
): Promise<{ error?: string }> {
  const profile = await requireEquipe()
  const supabase = await createClient()

  const { data: card, error: fetchError } = await supabase
    .from('cards')
    .select('status, organization_id')
    .eq('id', cardId)
    .single()

  if (fetchError || !card) {
    return { error: 'Card não encontrado.' }
  }

  if (card.status === novoStatus) return {}

  const { error } = await supabase
    .from('cards')
    .update({ status: novoStatus })
    .eq('id', cardId)

  if (error) {
    console.error('[actionMoverCard]', error.message)
    return { error: 'Erro ao mover card.' }
  }

  // Histórico de status
  await supabase.from('card_status_history').insert({
    organization_id: card.organization_id,
    card_id: cardId,
    status_anterior: card.status,
    status_novo: novoStatus,
    alterado_por: profile.id,
  })

  // Audit log
  await supabase.from('audit_log').insert({
    organization_id: card.organization_id,
    usuario_id: profile.id,
    acao: 'card.status_changed',
    entidade: 'card',
    entidade_id: cardId,
    metadata: { de: card.status, para: novoStatus },
  })

  return {}
}

// ---------------------------------------------------------------------------
// actionCriarCard — cria uma nova demanda
// ---------------------------------------------------------------------------

const CreateCardSchema = z.object({
  titulo: z.string().trim().min(3, { message: 'Título deve ter pelo menos 3 caracteres.' }),
  cliente_id: z.string().uuid({ message: 'Selecione um cliente.' }),
  tipo_id: z.string().uuid({ message: 'Selecione o tipo de demanda.' }),
  prioridade: z.enum(['urgente', 'alta', 'normal', 'baixa'] as const),
  prazo_cliente: z.string().optional(),
  responsavel_id: z.string().uuid().optional().or(z.literal('')),
  confidencial: z.boolean().default(false),
})

export async function actionCriarCard(
  formData: FormData,
  camposPublicos: Record<string, string>,
  camposInternos: Record<string, string>,
): Promise<{ card?: BoardCard; error?: string; errors?: Record<string, string[]> }> {
  const profile = await requireEquipe()
  const supabase = await createClient()

  const validated = CreateCardSchema.safeParse({
    titulo: formData.get('titulo'),
    cliente_id: formData.get('cliente_id'),
    tipo_id: formData.get('tipo_id'),
    prioridade: formData.get('prioridade') || 'normal',
    prazo_cliente: formData.get('prazo_cliente') || undefined,
    responsavel_id: formData.get('responsavel_id') || '',
    confidencial: formData.get('confidencial') === 'true',
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const { titulo, cliente_id, tipo_id, prioridade, prazo_cliente, responsavel_id, confidencial } =
    validated.data

  const { data: card, error } = await supabase
    .from('cards')
    .insert({
      organization_id: profile.organization_id,
      cliente_id,
      tipo_id,
      criado_por: profile.id,
      responsavel_id: responsavel_id || null,
      titulo,
      prioridade,
      prazo_cliente: prazo_cliente || null,
      confidencial,
      status: 'aguardando_info',
      campos_publicos: camposPublicos,
      campos_internos: camposInternos,
    })
    .select(`
      id, titulo, status, prioridade, prazo_cliente, confidencial, created_at,
      cliente:clientes!cliente_id(id, nome),
      tipo:tipos_demanda!tipo_id(id, nome, categoria),
      responsavel:profiles!responsavel_id(id, nome)
    `)
    .single()

  if (error || !card) {
    console.error('[actionCriarCard]', error?.message)
    return { error: 'Erro ao criar demanda. Tente novamente.' }
  }

  // Histórico de status inicial
  await supabase.from('card_status_history').insert({
    organization_id: profile.organization_id,
    card_id: card.id,
    status_anterior: null,
    status_novo: 'aguardando_info',
    alterado_por: profile.id,
  })

  // Audit log
  await supabase.from('audit_log').insert({
    organization_id: profile.organization_id,
    usuario_id: profile.id,
    acao: 'card.created',
    entidade: 'card',
    entidade_id: card.id,
    metadata: { titulo, tipo_id, cliente_id },
  })

  return { card: card as unknown as BoardCard }
}

// ---------------------------------------------------------------------------
// actionBuscarTipo — retorna campos_formulario de um tipo específico
// ---------------------------------------------------------------------------

export async function actionBuscarTipo(tipoId: string): Promise<{
  campos?: CampoFormulario[]
  tem_publicacao?: boolean
  error?: string
}> {
  await getCurrentProfile()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tipos_demanda')
    .select('campos_formulario, tem_publicacao')
    .eq('id', tipoId)
    .single()

  if (error || !data) return { error: 'Tipo não encontrado.' }

  return {
    campos: data.campos_formulario as CampoFormulario[],
    tem_publicacao: data.tem_publicacao,
  }
}
