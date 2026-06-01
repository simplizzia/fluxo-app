/**
 * Data Access Layer — Fluxo App
 *
 * Centraliza verificação de sessão e busca de dados autenticados.
 * Todas as queries de dados sensíveis passam por aqui.
 *
 * Regras:
 * - Este arquivo é server-only (nunca importar em Client Components)
 * - verifySession() redireciona para /login se não autenticado
 * - getCurrentProfile() redireciona para /login se profile não existe
 * - Use React cache() para evitar queries duplicadas no mesmo render
 */
import 'server-only'

import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { PapelUsuario } from '@/types/database'

// Re-exporta para manter compatibilidade com imports que vinham de dal.ts
export type { PapelUsuario }

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface UserProfile {
  id: string
  user_id: string
  organization_id: string
  papel: PapelUsuario
  nome: string
  avatar_url: string | null
  onboarding_concluido: boolean
  ativo: boolean
}

// ---------------------------------------------------------------------------
// verifySession
//
// Verifica se há sessão ativa. Redireciona para /login se não houver.
// Retorna o objeto user do Supabase Auth.
// ---------------------------------------------------------------------------

export const verifySession = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  return user
})

// ---------------------------------------------------------------------------
// getCurrentProfile
//
// Busca o profile completo do usuário autenticado.
// Redireciona para /login se o profile não existir.
// ---------------------------------------------------------------------------

export const getCurrentProfile = cache(async (): Promise<UserProfile> => {
  const user = await verifySession()
  const supabase = await createClient()

  // Seleciona apenas colunas que existem desde o schema inicial.
  // onboarding_concluido e ativo têm fallback seguro caso a migration
  // ainda não tenha sido aplicada no ambiente local.
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, user_id, organization_id, papel, nome, avatar_url')
    .eq('user_id', user.id)
    .single()

  if (error || !profile) {
    // Profile ausente indica convite aceito mas trigger não rodou
    // ou inconsistência de dados — forçar novo login
    redirect('/login?erro=perfil_nao_encontrado')
  }

  // Busca colunas opcionais separadamente (adicionadas em migrations posteriores)
  const { data: extras } = await supabase
    .from('profiles')
    .select('onboarding_concluido, ativo')
    .eq('user_id', user.id)
    .single()

  // ativo === false (explicitamente desativado por encerramento LGPD)
  // undefined/null = coluna ainda não existe → não bloqueia
  if ((extras as { ativo?: boolean } | null)?.ativo === false) {
    redirect('/login?erro=conta_desativada')
  }

  return {
    ...profile,
    onboarding_concluido: (extras as { onboarding_concluido?: boolean } | null)?.onboarding_concluido ?? false,
    ativo: (extras as { ativo?: boolean } | null)?.ativo ?? true,
  } as UserProfile
})

// ---------------------------------------------------------------------------
// Helpers de verificação de papel
// ---------------------------------------------------------------------------

export async function requirePapel(
  ...papeis: PapelUsuario[]
): Promise<UserProfile> {
  const profile = await getCurrentProfile()
  if (!papeis.includes(profile.papel)) {
    redirect('/dashboard?erro=sem_permissao')
  }
  return profile
}

export async function requireSocia(): Promise<UserProfile> {
  return requirePapel('socia')
}

export async function requireEquipe(): Promise<UserProfile> {
  return requirePapel('socia', 'gestao', 'atendimento', 'executor')
}
