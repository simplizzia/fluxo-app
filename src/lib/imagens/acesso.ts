/**
 * Helpers server-only de acesso ao módulo de Produção de Imagem IA.
 *
 * Papéis: socia/gestao = admin do módulo (tudo, calibração, acessos);
 * atendimento/executor = produção (só clientes liberados em imagens_acesso);
 * cliente = nunca acessa.
 */
import 'server-only'

import { redirect } from 'next/navigation'
import { getCurrentProfile, type UserProfile } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'

export interface AcessoImagens {
  profile: UserProfile
  isAdmin: boolean
}

export function isImagensAdmin(profile: UserProfile): boolean {
  return profile.papel === 'socia' || profile.papel === 'gestao'
}

/** Qualquer papel interno pode entrar no módulo — cliente nunca. */
export async function requireEquipeImagens(): Promise<AcessoImagens> {
  const profile = await getCurrentProfile()
  if (profile.papel === 'cliente') {
    redirect('/dashboard?erro=sem_permissao')
  }
  return { profile, isAdmin: isImagensAdmin(profile) }
}

/** Calibração e gestão de acessos: só admin do módulo. */
export async function requireImagensAdmin(): Promise<AcessoImagens> {
  const acesso = await requireEquipeImagens()
  if (!acesso.isAdmin) {
    redirect('/imagens?erro=sem_permissao')
  }
  return acesso
}

/**
 * Valida acesso ao cliente: admin sempre; produção só se houver linha
 * em imagens_acesso (a RLS já garante isso no banco — aqui é UX).
 */
export async function requireAcessoCliente(
  clienteId: string,
): Promise<AcessoImagens> {
  const acesso = await requireEquipeImagens()
  if (acesso.isAdmin) return acesso

  const supabase = await createClient()
  const { data } = await supabase
    .from('imagens_acesso')
    .select('id')
    .eq('profile_id', acesso.profile.id)
    .eq('cliente_id', clienteId)
    .maybeSingle()

  if (!data) {
    redirect('/imagens?erro=sem_acesso_cliente')
  }
  return acesso
}
