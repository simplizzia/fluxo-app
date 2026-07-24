'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/dal'
import type { StatusCard, PrioridadeCard } from '@/types/database'

// ---------------------------------------------------------------------------
// Tipos exportados
// ---------------------------------------------------------------------------

export interface CardCalendario {
  id: string
  titulo: string
  status: StatusCard
  prioridade: PrioridadeCard
  /** Data que posiciona o card no calendário: publicação (post) ou prazo. */
  data_efetiva: string
  prazo_cliente: string | null
  confidencial: boolean
  cliente: { id: string; nome: string }
  marca: { id: string; nome: string } | null
  tipo: { id: string; nome: string }
  responsavel: { id: string; nome: string } | null
}

export interface AlertaPrazo {
  id: string
  titulo: string
  prazo_cliente: string
  status: StatusCard
  cliente: { nome: string }
  responsavel: { nome: string } | null
}

// ---------------------------------------------------------------------------
// buscarCardsCalendario — cards com prazo_cliente no mês indicado
// ---------------------------------------------------------------------------

export async function buscarCardsCalendario(anoMes: string): Promise<{
  cards?: CardCalendario[]
  error?: string
}> {
  await getCurrentProfile()
  const supabase = await createClient()

  const [anoStr, mesStr] = anoMes.split('-')
  const ano = parseInt(anoStr, 10)
  const mes = parseInt(mesStr, 10)

  const primeiro = `${anoMes}-01`
  const ultimoDia = new Date(ano, mes, 0).getDate()
  const ultimo = `${anoMes}-${String(ultimoDia).padStart(2, '0')}`

  // Um card entra no mês pela data de publicação (posts do cronograma) OU pelo
  // prazo do cliente (demandas em geral). Antes só o prazo contava, e os posts
  // desmembrados — que têm data_publicacao e às vezes não têm prazo — sumiam.
  const { data, error } = await supabase
    .from('cards')
    .select(`
      id, titulo, status, prioridade, prazo_cliente, data_publicacao, confidencial,
      cliente:clientes!cliente_id(id, nome),
      marca:onboarding_marcas!marca_id(id, nome),
      tipo:tipos_demanda!tipo_id(id, nome),
      responsavel:profiles!responsavel_id(id, nome)
    `)
    .or(
      `and(data_publicacao.gte.${primeiro},data_publicacao.lte.${ultimo}),and(prazo_cliente.gte.${primeiro},prazo_cliente.lte.${ultimo})`,
    )
    .not('status', 'in', '(cancelado)')
    .order('prioridade', { ascending: false })

  if (error) {
    console.error('[buscarCardsCalendario]', error.message)
    return { error: 'Erro ao carregar calendário.' }
  }

  const cards = (data ?? []).map((c) => {
    const row = c as unknown as {
      data_publicacao: string | null
      prazo_cliente: string | null
    } & Record<string, unknown>
    return {
      ...row,
      data_efetiva: row.data_publicacao ?? row.prazo_cliente ?? primeiro,
    }
  }) as unknown as CardCalendario[]

  return { cards }
}

// ---------------------------------------------------------------------------
// buscarAlertasPrazo — cards com prazo nas próximas 48h fora de para_aprovacao
// Só relevante para equipe (socia/gestao/atendimento)
// ---------------------------------------------------------------------------

export async function buscarAlertasPrazo(): Promise<{
  alertas?: AlertaPrazo[]
}> {
  const profile = await getCurrentProfile()

  if (!['socia', 'gestao', 'atendimento'].includes(profile.papel)) {
    return { alertas: [] }
  }

  const supabase = await createClient()

  const agora = new Date()
  const em48h = new Date(agora.getTime() + 48 * 60 * 60 * 1000)

  const { data, error } = await supabase
    .from('cards')
    .select(`
      id, titulo, prazo_cliente, status,
      cliente:clientes!cliente_id(nome),
      responsavel:profiles!responsavel_id(nome)
    `)
    .gte('prazo_cliente', agora.toISOString().split('T')[0])
    .lte('prazo_cliente', em48h.toISOString().split('T')[0])
    .not('status', 'in', '(para_aprovacao,concluido,cancelado)')
    .order('prazo_cliente', { ascending: true })

  if (error) {
    console.error('[buscarAlertasPrazo]', error.message)
    return { alertas: [] }
  }

  return { alertas: data as unknown as AlertaPrazo[] }
}
