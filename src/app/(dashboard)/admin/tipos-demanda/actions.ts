'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requirePapel } from '@/lib/dal'

export interface TipoDemandaSla {
  id: string
  nome: string
  categoria: string
  sla_ativo: boolean
  sla_prazo_inicio_horas: number | null
  sla_prazo_resposta_horas: number | null
}

export async function buscarTiposDemandaComSla(): Promise<TipoDemandaSla[]> {
  await requirePapel('socia')
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tipos_demanda')
    .select('id, nome, categoria, sla_ativo, sla_prazo_inicio_horas, sla_prazo_resposta_horas')
    .order('categoria')
    .order('nome')

  if (error) {
    console.error('[buscarTiposDemandaComSla]', error.message)
    return []
  }

  return (data ?? []) as TipoDemandaSla[]
}

const SlaUpdateSchema = z.object({
  tipoId: z.string().uuid(),
  sla_ativo: z.boolean(),
  sla_prazo_inicio_horas: z.number().int().min(1).max(720).nullable(),
  sla_prazo_resposta_horas: z.number().int().min(1).max(720).nullable(),
})

export async function actionSalvarSla(
  input: z.infer<typeof SlaUpdateSchema>,
): Promise<{ error?: string }> {
  await requirePapel('socia')
  const supabase = await createClient()

  const validated = SlaUpdateSchema.safeParse(input)
  if (!validated.success) {
    return { error: 'Dados inválidos.' }
  }

  const { tipoId, sla_ativo, sla_prazo_inicio_horas, sla_prazo_resposta_horas } = validated.data

  const { error } = await supabase
    .from('tipos_demanda')
    .update({ sla_ativo, sla_prazo_inicio_horas, sla_prazo_resposta_horas })
    .eq('id', tipoId)

  if (error) {
    console.error('[actionSalvarSla]', error.message)
    return { error: 'Erro ao salvar SLA. Tente novamente.' }
  }

  revalidatePath('/admin/tipos-demanda')
  return {}
}
