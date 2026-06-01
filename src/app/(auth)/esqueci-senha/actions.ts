'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const Schema = z.object({
  email: z.string().trim().email({ message: 'E-mail inválido.' }),
})

export type EsqueciState = {
  errors?: { email?: string[] }
  message?: string
  success?: boolean
} | null

export async function actionEsqueciSenha(
  _prev: EsqueciState,
  formData: FormData,
): Promise<EsqueciState> {
  const validated = Schema.safeParse({ email: formData.get('email') })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const supabase = await createClient()

  await supabase.auth.resetPasswordForEmail(validated.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?type=recovery&next=/redefinir-senha`,
  })

  // Sempre retorna sucesso — não revela se o e-mail existe
  return { success: true }
}
