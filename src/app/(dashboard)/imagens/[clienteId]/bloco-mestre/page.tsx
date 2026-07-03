import type { Metadata } from 'next'
import { requireAcessoCliente } from '@/lib/imagens/acesso'
import { createClient } from '@/lib/supabase/server'
import { BlocoMestreForm } from './BlocoMestreForm'

export const metadata: Metadata = {
  title: 'Bloco Mestre — Simplizzia',
}

export default async function BlocoMestrePage({
  params,
}: {
  params: Promise<{ clienteId: string }>
}) {
  const { clienteId } = await params
  const { isAdmin } = await requireAcessoCliente(clienteId)
  const supabase = await createClient()

  const { data: bloco } = await supabase
    .from('imagens_bloco_mestre')
    .select('paleta_hex, regra_paleta, estilo_luz, sentimento_marca, negativos_padrao, formato_padrao, estilo_geral')
    .eq('cliente_id', clienteId)
    .maybeSingle()

  return <BlocoMestreForm clienteId={clienteId} bloco={bloco} readOnly={!isAdmin} />
}
