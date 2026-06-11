'use server'

import { z } from 'zod'
import { requireSocia } from '@/lib/dal'
import { createServiceClient } from '@/lib/supabase/server'
import { enviarEmail, emailConviteApp } from '@/lib/email'

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

  const supabase = createServiceClient()

  // Gera o link de convite sem disparar o email do Supabase
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      data: {
        nome,
        papel,
        organization_id: socia.organization_id,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?type=invite`,
    },
  })

  if (error) {
    console.error('[actionConvidarUsuario] generateLink error:', error.message)
    return {
      message:
        error.message.includes('already registered')
          ? 'Este e-mail já possui um acesso cadastrado.'
          : 'Erro ao gerar convite. Tente novamente.',
    }
  }

  const inviteLink = data.properties.action_link
  const { subject, html } = emailConviteApp({ nome, papel, link: inviteLink })
  await enviarEmail(email, subject, html)

  return { success: true }
}
