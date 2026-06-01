'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const Schema = z.object({
  password: z.string().min(8, { message: 'Senha deve ter pelo menos 8 caracteres.' }),
  passwordConfirm: z.string(),
}).refine((d) => d.password === d.passwordConfirm, {
  message: 'As senhas não coincidem.',
  path: ['passwordConfirm'],
})

export type RedefinirState = {
  errors?: { password?: string[]; passwordConfirm?: string[] }
  message?: string
} | null

export async function actionRedefinirSenha(
  _prev: RedefinirState,
  formData: FormData,
): Promise<RedefinirState> {
  const validated = Schema.safeParse({
    password:        formData.get('password'),
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
    return { message: 'Não foi possível redefinir a senha. O link pode ter expirado — solicite um novo.' }
  }

  redirect('/dashboard')
}
