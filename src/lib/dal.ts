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

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type PapelUsuario =
  | 'socia'
  | 'gestao'
  | 'atendimento'
  | 'executor'
  | 'cliente'

export interface UserProfile {
  id: string
  user_id: string
  organization_id: string
  papel: PapelUsuario
  nome: string
  avatar_url: string | null
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

  return profile as UserProfile
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
