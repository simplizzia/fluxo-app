'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'

// ---------------------------------------------------------------------------
// Atualizar nome do perfil
// ---------------------------------------------------------------------------

const UpdateProfileSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(2, { message: 'Nome deve ter pelo menos 2 caracteres.' })
    .max(80, { message: 'Nome deve ter no máximo 80 caracteres.' }),
})

export type UpdateProfileState = {
  errors?: { nome?: string[] }
  message?: string
  success?: boolean
} | null

export async function actionUpdateProfile(
  _prevState: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const user = await verifySession()

  const validated = UpdateProfileSchema.safeParse({
    nome: formData.get('nome'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({ nome: validated.data.nome })
    .eq('user_id', user.id)

  if (error) {
    return { message: 'Erro ao salvar. Tente novamente.' }
  }

  revalidatePath('/perfil')
  revalidatePath('/dashboard')

  return { success: true }
}

// ---------------------------------------------------------------------------
// Atualizar senha
// ---------------------------------------------------------------------------

const ChangePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, { message: 'Senha deve ter pelo menos 8 caracteres.' })
      .regex(/[a-zA-Z]/, { message: 'Deve conter pelo menos uma letra.' })
      .regex(/[0-9]/, { message: 'Deve conter pelo menos um número.' }),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'As senhas não coincidem.',
    path: ['passwordConfirm'],
  })

export type ChangePasswordState = {
  errors?: { password?: string[]; passwordConfirm?: string[] }
  message?: string
  success?: boolean
} | null

export async function actionChangePassword(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  await verifySession()

  const validated = ChangePasswordSchema.safeParse({
    password: formData.get('password'),
    passwordConfirm: formData.get('passwordConfirm'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    password: validated.data.password,
  })

  if (error) {
    return { message: 'Erro ao atualizar senha. Tente novamente.' }
  }

  return { success: true }
}
