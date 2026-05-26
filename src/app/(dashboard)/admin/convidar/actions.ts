'use server'

import { z } from 'zod'
import { requireSocia } from '@/lib/dal'
import { createServiceClient } from '@/lib/supabase/server'

const InviteSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(2, { message: 'Nome deve ter pelo menos 2 caracteres.' }),
  email: z
    .string()
    .trim()
    .email({ message: 'E-mail inválido.' }),
  papel: z.enum(['gestao', 'atendimento', 'executor', 'socia', 'cliente'] as const, {
    message: 'Papel inválido.',
  }),
})

export type InviteState = {
  errors?: { nome?: string[]; email?: string[]; papel?: string[] }
  message?: string
  success?: boolean
} | null

export async function actionConvidarUsuario(
  _prevState: InviteState,
  formData: FormData,
): Promise<InviteState> {
  // Somente sócias podem convidar usuários
  const socia = await requireSocia()

  const validated = InviteSchema.safeParse({
    nome: formData.get('nome'),
    email: formData.get('email'),
    papel: formData.get('papel'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const { nome, email, papel } = validated.data

  // Usar service client (admin) para criar o convite
  // O service role bypassa RLS — usar apenas para operações admin controladas
  const supabase = createServiceClient()

  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    // Metadados lidos pelo trigger handle_new_user para criar o profile
    data: {
      nome,
      papel,
      organization_id: socia.organization_id,
    },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?type=invite`,
  })

  if (error) {
    // Não revelar detalhes do erro ao frontend (ex: email já cadastrado)
    console.error('[actionConvidarUsuario] invite error:', error.message)
    return {
      message:
        error.message.includes('already registered')
          ? 'Este e-mail já possui um acesso cadastrado.'
          : 'Erro ao enviar convite. Tente novamente.',
    }
  }

  return { success: true }
}
