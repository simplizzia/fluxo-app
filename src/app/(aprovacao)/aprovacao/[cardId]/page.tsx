import { getCurrentProfile } from '@/lib/dal'
import {
  actionBuscarCardParaAprovacao,
  actionBuscarArquivosAprovacao,
} from './actions'
import AprovacaoActions from './AprovacaoActions'
import Link from 'next/link'
import { buscarMeusBadges } from '@/app/(dashboard)/socias/gamificacao/actions'

interface Props {
  params: Promise<{ cardId: string }>
}

export default async function AprovacaoPage({ params }: Props) {
  const { cardId } = await params

  const [profile, { card, error }, { arquivos }, { badges: meusBadges, pontuacaoMes }] = await Promise.all([
    getCurrentProfile(),
    actionBuscarCardParaAprovacao(cardId),
    actionBuscarArquivosAprovacao(cardId),
    buscarMeusBadges().catch(() => ({ badges: [], pontuacaoMes: null })),
  ])

  if (error || !card) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <div
          className="mb-6 h-12 w-12 rounded-2xl text-xl flex items-center justify-center text-white font-bold font-display"
          style={{ background: 'linear-gradient(135deg,#A046C6 0%,#F9267C 100%)' }}
        >
          S
        </div>
        <p className="text-zinc-500 text-sm">{error ?? 'Demanda não encontrada.'}</p>
        <Link href="/board" className="mt-4 text-xs text-brand hover:underline">
          Ir para o board
        </Link>
      </div>
    )
  }

  // Somente o status para_aprovacao permite ação — outros estados informam o cliente
  const podeAprovar =
    card.status === 'para_aprovacao' && profile.papel === 'cliente'

  // Equipe vê esta página mas sem os botões de aprovação (only read)
  const ehEquipe = profile.papel !== 'cliente'

  // Arquivos de entrega/revisão em ordem cronológica inversa
  const entregas = (arquivos ?? []).filter(
    (a) => a.tipo === 'entrega' || a.tipo === 'revisao',
  )

  // Mensagens de estado (quando card não está para_aprovacao)
  const mensagemEstado: Record<string, string> = {
    aguardando_info: 'Aguardando informações da equipe.',
    a_fazer: 'Esta demanda ainda está na fila.',
    em_andamento: 'A equipe ainda está trabalhando nesta entrega.',
    necessita_ajustes: 'A equipe está revisando com base no seu feedback.',
    concluido: 'Esta demanda já foi aprovada. Obrigada! 💜',
    cancelado: 'Esta demanda foi cancelada.',
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div
          className="flex h-9 w-9 flex-none items-center justify-center rounded-xl font-display text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg,#A046C6 0%,#F9267C 100%)' }}
        >
          S
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            Simplizzia · por Izzi
          </p>
          <p className="truncate text-sm font-semibold text-zinc-800">
            {card.titulo}
          </p>
        </div>
        <RodadasBadge rodadas={card.rodadas_revisao} />
      </div>

      {/* Mensagem de estado (card não em para_aprovacao) */}
      {card.status !== 'para_aprovacao' && (
        <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-6 text-center">
          <StatusIcon status={card.status} />
          <p className="mt-3 text-sm font-medium text-zinc-700">
            {mensagemEstado[card.status] ?? 'Status atual: ' + card.status}
          </p>
          {ehEquipe && (
            <Link
              href="/board"
              className="mt-4 inline-block text-xs text-brand hover:underline"
            >
              Ver no board →
            </Link>
          )}
        </div>
      )}

      {/* Preview das entregas */}
      {entregas.length > 0 ? (
        <AprovacaoActions
          cardId={cardId}
          card={card}
          arquivos={entregas}
          podeAprovar={podeAprovar}
          ehEquipe={ehEquipe}
        />
      ) : card.status === 'para_aprovacao' ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-sm text-amber-700">
            Nenhum arquivo de entrega anexado ainda.
          </p>
        </div>
      ) : null}

      {/* Sua Parceria — só para clientes */}
      {profile.papel === 'cliente' && (meusBadges.length > 0 || pontuacaoMes) && (
        <div className="mt-6 rounded-2xl border border-brand/20 bg-white p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand">
            ✨ Sua parceria
          </p>
          {pontuacaoMes && (
            <p className="mb-3 text-sm text-zinc-700">
              Você conquistou{' '}
              <span className="font-bold text-brand">{pontuacaoMes.pontos} pontos</span>{' '}
              este mês!
            </p>
          )}
          {meusBadges.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {meusBadges.slice(0, 4).map((b) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const badge = b.badge as any
                return (
                  <span
                    key={b.id}
                    title={badge?.descricao}
                    className="flex items-center gap-1 rounded-full border border-brand/20 bg-brand-light/40 px-2.5 py-1 text-[11px] text-zinc-700"
                  >
                    {badge?.icone ?? '🏆'} {badge?.nome ?? 'Badge'}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <p className="mt-8 text-center text-[11px] text-zinc-400">
        Izzi · Assistente da Simplizzia
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Subcomponentes
// ---------------------------------------------------------------------------

function RodadasBadge({ rodadas }: { rodadas: number }) {
  if (rodadas === 0) return null
  return (
    <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
      Rodada {rodadas + 1}
    </span>
  )
}

function StatusIcon({ status }: { status: string }) {
  const icons: Record<string, string> = {
    concluido: '✅',
    cancelado: '❌',
    em_andamento: '⚙️',
    necessita_ajustes: '🔄',
    a_fazer: '📋',
    aguardando_info: '⏳',
  }
  return <p className="text-4xl">{icons[status] ?? '📄'}</p>
}
