import { redirect } from 'next/navigation'

export default async function ImagensClientePage({
  params,
}: {
  params: Promise<{ clienteId: string }>
}) {
  const { clienteId } = await params
  redirect(`/imagens/${clienteId}/montador`)
}
