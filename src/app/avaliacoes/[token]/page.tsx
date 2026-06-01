import { createServiceClient } from '@/lib/supabase/server'
import NpsForm from './NpsForm'

interface Props {
  params: Promise<{ token: string }>
}

export default async function AvaliacaoPage({ params }: Props) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data: avaliacao } = await supabase
    .from('avaliacoes_cliente')
    .select('id, organization_id, cliente_id, respondido_em, clientes(nome)')
    .eq('token_unico', token)
    .maybeSingle()

  if (!avaliacao) {
    return <StatusPage tipo="invalido" />
  }

  if (avaliacao.respondido_em) {
    return <StatusPage tipo="respondido" />
  }

  const clienteNome = (avaliacao.clientes as unknown as { nome: string } | null)?.nome ?? 'Cliente'

  return <NpsForm token={token} clienteNome={clienteNome} />
}

// ---------------------------------------------------------------------------
// StatusPage — link inválido ou já respondido
// ---------------------------------------------------------------------------

function StatusPage({ tipo }: { tipo: 'invalido' | 'respondido' }) {
  const config = {
    invalido: {
      emoji: '🔗',
      titulo: 'Link inválido',
      descricao: 'Este link de avaliação não existe ou já expirou.',
    },
    respondido: {
      emoji: '✅',
      titulo: 'Avaliação já respondida',
      descricao: 'Você já enviou sua opinião sobre a Simplizzia. Muito obrigada! 💜',
    },
  }[tipo]

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F4F4] px-4 py-12">
      <div className="w-full max-w-md">
        <div
          className="mb-1 rounded-2xl px-6 py-4"
          style={{ background: 'linear-gradient(135deg,#A046C6 0%,#F9267C 100%)' }}
        >
          <div className="flex items-center justify-between">
            <span className="font-display text-lg font-bold text-white">Simplizzia</span>
            <span className="text-xs text-white/70">por Izzi</span>
          </div>
        </div>
        <div className="rounded-2xl bg-white px-8 py-10 text-center">
          <p className="mb-3 text-4xl">{config.emoji}</p>
          <h1 className="mb-2 font-display text-xl font-bold text-zinc-900">{config.titulo}</h1>
          <p className="text-sm leading-relaxed text-zinc-500">{config.descricao}</p>
        </div>
        <p className="mt-4 text-center text-xs text-zinc-400">
          Izzi · Assistente da Simplizzia
        </p>
      </div>
    </div>
  )
}
