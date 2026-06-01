import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

/**
 * Cliente Supabase para uso em Server Components, Server Actions e Route Handlers.
 * Lê e escreve cookies via next/headers.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // setAll chamado de Server Component — ignorar.
            // O middleware garante que a sessão seja atualizada.
          }
        },
      },
    },
  )
}

/**
 * Cliente com service role — SOMENTE para operações server-side
 * que precisam bypassar RLS (ex: onboarding, automações, relatórios).
 * Usa @supabase/supabase-js diretamente para garantir bypass de RLS.
 * NUNCA expor no frontend.
 */
export function createServiceClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  )
}
