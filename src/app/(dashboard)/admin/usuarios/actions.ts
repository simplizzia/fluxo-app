'use server'

import { requireSocia } from '@/lib/dal'
import { createServiceClient } from '@/lib/supabase/server'
import { enviarEmail, emailConviteApp } from '@/lib/email'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database'

type PapelUsuario = Database['public']['Enums']['papel_usuario']

export async function actionAtualizarPapel(profileId: string, papel: PapelUsuario) {
  await requireSocia()
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('profiles')
    .update({ papel })
    .eq('id', profileId)
  if (error) return { error: 'Erro ao atualizar papel.' }
  revalidatePath('/admin/usuarios')
  return { success: true }
}

export async function actionAtualizarAtivo(profileId: string, ativo: boolean) {
  await requireSocia()
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('profiles')
    .update({ ativo })
    .eq('id', profileId)
  if (error) return { error: 'Erro ao atualizar status.' }
  revalidatePath('/admin/usuarios')
  return { success: true }
}

export async function actionReenviarAcesso(email: string, nome: string, papel: PapelUsuario) {
  await requireSocia()
  const supabase = createServiceClient()
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?type=invite`,
    },
  })
  if (error) return { error: 'Erro ao gerar link de acesso.' }
  const { subject, html } = emailConviteApp({ nome, papel, link: data.properties.action_link })
  await enviarEmail(email, subject, html)
  return { success: true }
}
