import { notFound, redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/dal'
import { actionBuscarApresentacao } from '../../apresentacao-actions'
import ApresentacaoEditorClient from './ApresentacaoEditorClient'

interface Props {
  params: Promise<{ id: string; apresentacaoId: string }>
}

export default async function ApresentacaoEditorPage({ params }: Props) {
  const { id: clienteId, apresentacaoId } = await params

  const profile = await getCurrentProfile()
  if (profile.papel !== 'socia' && profile.papel !== 'gestao' && profile.papel !== 'atendimento') {
    redirect('/clientes')
  }

  const { data: apresentacao, error } = await actionBuscarApresentacao(apresentacaoId)
  if (error || !apresentacao) notFound()

  const podeEditar = profile.papel === 'socia' || profile.papel === 'gestao'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  return (
    <ApresentacaoEditorClient
      clienteId={clienteId}
      apresentacao={apresentacao}
      podeEditar={podeEditar}
      appUrl={appUrl}
    />
  )
}
