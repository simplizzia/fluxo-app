'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/**
 * Marca o onboarding do cliente como concluído.
 * Chamado pelo IzziOnboarding ao finalizar os 4 passos.
 */
export async function actionConcluirOnboarding(): Promise<void> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  await supabase
    .from('profiles')
    .update({
      onboarding_concluido: true,
      onboarding_passo: 4,
    })
    .eq('user_id', user.id)

  revalidatePath('/dashboard')
}
