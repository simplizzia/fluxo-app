/**
 * GET /onboarding/cliente/[token]
 * Página pública de onboarding de clientes — sem login necessário.
 * Vai direto para o chat (sem slides de apresentação).
 *
 * Fluxo:
 *   pending/briefing → ChatOnboarding (Izzi conduz 2 fases)
 *   done             → Tela de encerramento
 *   inválido         → Tela de erro
 */
import { createServiceClient } from '@/lib/supabase/server'
import ChatOnboarding from './ChatOnboarding'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function OnboardingClientePage({ params }: PageProps) {
  const { token } = await params
  const service = createServiceClient()

  // Valida sessão e busca dados completos
  const { data: session, error } = await service
    .from('onboarding_clientes')
    .select(`
      token, status, client_name,
      nome_contato, cargo_contato, setor,
      servicos_contratados, objetivo_declarado,
      dores_identificadas, cenario_atual
    `)
    .eq('token', token)
    .single()

  if (error || !session) return <TelaErro />

  // Busca marcas configuradas
  const { data: marcas } = await service
    .from('onboarding_marcas')
    .select('id, nome, publico, instagram, linkedin, posicionamento_atual, concorrentes, contexto_estrategico, cenario_atual, status, briefing_output')
    .eq('token', token)
    .order('ordem', { ascending: true })

  // Só mostra tela de conclusão se TODAS as marcas tiverem briefing salvo
  // (usa briefing_output como fonte de verdade — status pode estar desatualizado)
  const temMarcasPendentes = (marcas ?? []).some((m) => m.status !== 'done' && !m.briefing_output)
  if (session.status === 'done' && !temMarcasPendentes) return <TelaConcluido />

  // Busca histórico de mensagens para retomada
  const { data: mensagens } = await service
    .from('onboarding_mensagens')
    .select('role, content')
    .eq('token', token)
    .order('created_at', { ascending: true })

  return (
    <ChatOnboarding
      token={token}
      cliente={{
        nome:                 session.client_name,
        nomeContato:          session.nome_contato,
        cargoContato:         session.cargo_contato,
        setor:                session.setor,
        servicosContratados:  (session.servicos_contratados as string[]) ?? [],
        objetivoDeclarado:    session.objetivo_declarado,
        doresIdentificadas:   session.dores_identificadas,
        cenarioAtual:         session.cenario_atual,
        marcas: (marcas ?? []).map((m) => ({
          id:                 m.id,
          nome:               m.nome,
          publico:            m.publico,
          instagram:          m.instagram,
          linkedin:           m.linkedin,
          posicionamentoAtual: m.posicionamento_atual,
          concorrentes:       m.concorrentes,
          contextoEstrategico: m.contexto_estrategico,
          cenarioAtual:       m.cenario_atual,
          status:             m.status,
          briefingOutput:     m.briefing_output,
        })),
      }}
      initialMessages={
        (mensagens ?? []).map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))
      }
    />
  )
}

function TelaConcluido() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#A046C6] via-[#C040A0] to-[#F9267C] px-4">
      <div className="w-full max-w-md rounded-3xl bg-white px-8 py-10 text-center shadow-xl">
        <img src="/izzi-final.png" alt="Izzi" className="mx-auto mb-5 h-20 w-20 rounded-full object-cover" />
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C040A0]">Simplizzia</p>
        <h1 className="mb-3 font-display text-2xl font-bold text-zinc-900">Onboarding concluído 💜</h1>
        <p className="text-sm leading-relaxed text-zinc-600">
          Já guardei tudo que a gente conversou. A equipe da Simplizzia vai analisar
          e entrar em contato com você para os próximos passos.
        </p>
        <p className="mt-6 text-xs italic text-zinc-400">— Izzi, da Simplizzia</p>
      </div>
    </div>
  )
}

function TelaErro() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <p className="mb-4 text-xs font-medium uppercase tracking-widest text-zinc-400">Simplizzia</p>
        <p className="text-sm text-zinc-500">
          Link inválido ou expirado. Entre em contato com a equipe Simplizzia.
        </p>
      </div>
    </div>
  )
}
