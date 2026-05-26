'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'

const SetPasswordSchema = z
  .object({
    nome: z
      .string()
      .trim()
      .min(2, { message: 'Nome deve ter pelo menos 2 caracteres.' }),
    password: z
      .string()
      .min(8, { message: 'Senha deve ter pelo menos 8 caracteres.' })
      .regex(/[a-zA-Z]/, { message: 'Senha deve conter pelo menos uma letra.' })
      .regex(/[0-9]/, { message: 'Senha deve conter pelo menos um número.' }),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'As senhas não coincidem.',
    path: ['passwordConfirm'],
  })

export type SetPasswordState = {
  errors?: {
    nome?: string[]
    password?: string[]
    passwordConfirm?: string[]
  }
  message?: string
} | null

export async function actionSetPassword(
  _prevState: SetPasswordState,
  formData: FormData,
): Promise<SetPasswordState> {
  // Verificar sessão ativa (usuário chegou via link de convite)
  await verifySession()

  const validated = SetPasswordSchema.safeParse({
    nome: formData.get('nome'),
    password: formData.get('password'),
    passwordConfirm: formData.get('passwordConfirm'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const { nome, password } = validated.data
  const supabase = await createClient()

  // 1. Atualizar senha
  const { error: authError } = await supabase.auth.updateUser({ password })

  if (authError) {
    return { message: 'Erro ao definir senha. Tente novamente.' }
  }

  // 2. Atualizar nome no profile
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    await supabase
      .from('profiles')
      .update({ nome })
      .eq('user_id', user.id)
  }

  redirect('/dashboard')
}
