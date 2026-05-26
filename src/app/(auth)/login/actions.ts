'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Schema de validação
// ---------------------------------------------------------------------------

const LoginSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: 'E-mail inválido.' }),
  password: z
    .string()
    .min(8, { message: 'Senha deve ter pelo menos 8 caracteres.' }),
})

// ---------------------------------------------------------------------------
// Tipos de estado do formulário
// ---------------------------------------------------------------------------

export type LoginState = {
  errors?: { email?: string[]; password?: string[] }
  message?: string
} | null

// ---------------------------------------------------------------------------
// actionLogin
// ---------------------------------------------------------------------------

export async function actionLogin(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  // 1. Validar campos no servidor
  const validated = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const { email, password } = validated.data

  // 2. Rate limiting — verifica por email e por IP
  const supabase = await createClient()
  const headerStore = await headers()
  const ip = headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  // Verificar rate limit por email (10 tentativas / 15min)
  const { data: emailOk } = await supabase.rpc('check_login_rate_limit', {
    p_identifier: `email:${email}`,
    p_limit: 10,
    p_window_minutes: 15,
  })

  if (!emailOk) {
    return {
      message: 'Muitas tentativas de login. Aguarde 15 minutos e tente novamente.',
    }
  }

  // Verificar rate limit por IP (30 tentativas / 15min — mais permissivo para redes corporativas)
  const { data: ipOk } = await supabase.rpc('check_login_rate_limit', {
    p_identifier: `ip:${ip}`,
    p_limit: 30,
    p_window_minutes: 15,
  })

  if (!ipOk) {
    return {
      message: 'Muitas tentativas de login a partir deste endereço. Aguarde 15 minutos.',
    }
  }

  // 3. Autenticar com Supabase
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Não revelar se o e-mail existe ou não (evita user enumeration)
    return { message: 'E-mail ou senha incorretos.' }
  }

  // 4. Redirecionar para o dashboard (ou para o redirect param se existir)
  redirect('/dashboard')
}

// ---------------------------------------------------------------------------
// actionLogout
// ---------------------------------------------------------------------------

export async function actionLogout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
