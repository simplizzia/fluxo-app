import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { Trophy } from 'lucide-react'
import { getCurrentProfile } from '@/lib/dal'
import {
  UpdateProfileForm,
  ChangePasswordForm,
} from '@/components/perfil/ProfileForm'
import { GoogleCalendarCard } from './GoogleCalendarCard'
import { actionDesconectarGoogle } from './actions'
import { getGoogleCalendarInfo } from '@/lib/google/calendar'
import { buscarIntegracoesSociais } from '../socias/social/actions'
import { buscarMeusBadges } from '../socias/gamificacao/actions'

export const metadata: Metadata = {
  title: 'Meu perfil — Simplizzia',
}

const GOOGLE_ENABLED = !!(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
)
const META_ENABLED = !!(
  process.env.META_APP_ID && process.env.META_APP_SECRET
)
const LINKEDIN_ENABLED = !!(
  process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET
)

export default async function PerfilPage() {
  const profile = await getCurrentProfile()

  // Busca status do Google Calendar (apenas se as credenciais estiverem configuradas)
  const googleInfo = GOOGLE_ENABLED
    ? await getGoogleCalendarInfo(profile.id)
    : { conectado: false, email: null }

  // Busca integrações sociais (só para sócias)
  const integracoesSociais = profile.papel === 'socia' && (META_ENABLED || LINKEDIN_ENABLED)
    ? await buscarIntegracoesSociais()
    : []

  // Busca badges do usuário (best-effort)
  const { badges: meusBadges, pontuacaoMes } = await buscarMeusBadges().catch(() => ({
    badges: [], pontuacaoMes: null,
  }))

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Meu perfil</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Gerencie suas informações de acesso.
        </p>
      </div>

      {/* Dados pessoais */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-700">
          Dados pessoais
        </h2>
        <UpdateProfileForm profile={profile} />
      </section>

      {/* Alterar senha */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-700">
          Alterar senha
        </h2>
        <ChangePasswordForm />
      </section>

      {/* Info somente leitura */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-700">
          Informações da conta
        </h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-500">Papel</dt>
            <dd className="font-medium capitalize text-zinc-900">{profile.papel}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">ID do perfil</dt>
            <dd className="font-mono text-xs text-zinc-500">{profile.id}</dd>
          </div>
        </dl>
      </section>

      {/* Minhas Conquistas — gamificação */}
      {(meusBadges.length > 0 || pontuacaoMes) && (
        <section className="rounded-xl border border-zinc-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-700">Minhas Conquistas</h2>
            <Link
              href="/perfil/conquistas"
              className="text-xs text-brand hover:underline"
            >
              Ver todas →
            </Link>
          </div>

          {pontuacaoMes && (
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-brand/20 bg-brand-light/30 px-3 py-2.5">
              <Trophy className="h-4 w-4 text-brand" />
              <p className="text-sm font-semibold text-brand">
                {pontuacaoMes.pontos} pts este mês
              </p>
            </div>
          )}

          {meusBadges.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {meusBadges.slice(0, 6).map((b) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const badge = b.badge as any
                return (
                  <div
                    key={b.id}
                    title={badge?.nome}
                    className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs"
                  >
                    <span>{badge?.icone ?? '🏆'}</span>
                    <span className="text-zinc-700">{badge?.nome ?? 'Badge'}</span>
                  </div>
                )
              })}
              {meusBadges.length > 6 && (
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-500">
                  +{meusBadges.length - 6} mais
                </span>
              )}
            </div>
          )}
        </section>
      )}

      {/* Google Calendar — só aparece se as credenciais estiverem configuradas */}
      {GOOGLE_ENABLED && (
        <section className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-zinc-700">
            Google Calendar
          </h2>
          <Suspense fallback={null}>
            <GoogleCalendarCard
              conectado={googleInfo.conectado}
              googleEmail={googleInfo.email}
              onDesconectar={actionDesconectarGoogle}
            />
          </Suspense>
        </section>
      )}

      {/* Redes Sociais — só para sócias */}
      {profile.papel === 'socia' && (META_ENABLED || LINKEDIN_ENABLED) && (
        <section className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="mb-1 text-sm font-semibold text-zinc-700">
            Redes Sociais
          </h2>
          <p className="mb-4 text-xs text-zinc-500">
            Conecte suas páginas para agendar publicações direto da plataforma.
          </p>

          <div className="space-y-3">
            {/* Facebook / Instagram */}
            {META_ENABLED && (() => {
              const metaInteg = integracoesSociais.find((i) => i.plataforma === 'facebook')
              const expirou = metaInteg?.expires_at && new Date(metaInteg.expires_at) < new Date()
              return (
                <div className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-800">Facebook / Instagram</p>
                    <p className={`text-xs ${expirou ? 'text-red-500' : 'text-zinc-500'}`}>
                      {metaInteg?.ativo
                        ? expirou
                          ? 'Token expirado — reconecte'
                          : `Conectado${metaInteg.page_nome ? ` — ${metaInteg.page_nome}` : ''}`
                        : 'Não conectado'}
                    </p>
                  </div>
                  <a
                    href="/api/auth/meta"
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100"
                  >
                    {metaInteg?.ativo && !expirou ? 'Reconectar' : 'Conectar'}
                  </a>
                </div>
              )
            })()}

            {/* LinkedIn */}
            {LINKEDIN_ENABLED && (() => {
              const liInteg = integracoesSociais.find((i) => i.plataforma === 'linkedin')
              const expirou = liInteg?.expires_at && new Date(liInteg.expires_at) < new Date()
              return (
                <div className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-800">LinkedIn</p>
                    <p className={`text-xs ${expirou ? 'text-red-500' : 'text-zinc-500'}`}>
                      {liInteg?.ativo
                        ? expirou
                          ? 'Token expirado — reconecte'
                          : 'Conectado'
                        : 'Não conectado'}
                    </p>
                  </div>
                  <a
                    href="/api/auth/linkedin"
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100"
                  >
                    {liInteg?.ativo && !expirou ? 'Reconectar' : 'Conectar'}
                  </a>
                </div>
              )
            })()}
          </div>
        </section>
      )}
    </div>
  )
}
