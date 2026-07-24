// ---------------------------------------------------------------------------
// Feature flags — o que está ligado nesta fase de uso.
//
// O app foi construído com muitos módulos; para colocar no ar com a equipe e
// os clientes começamos com um núcleo enxuto e ligamos o resto conforme a
// operação amadurece. Ligar de volta é trocar `false` por `true` aqui — nada de
// mexer em navegação ou rota.
//
// A flag governa DUAS coisas, para o módulo ficar de fato indisponível e não só
// escondido no menu:
//   1. o item some da barra lateral (layout.tsx)
//   2. a rota redireciona para /dashboard (requireFeature, nos page.tsx)
//
// O núcleo — Dashboard, Board, Clientes, Agentes, Cronograma, Perfil e a
// administração de usuários/SLA — não tem flag: está sempre disponível.
// ---------------------------------------------------------------------------

export type FeatureKey =
  | 'calendario'
  | 'imagens'
  | 'reunioes'
  | 'cs'
  | 'nps'
  | 'relatorios'
  | 'plano'
  | 'automacoes'
  | 'pipeline'
  | 'socias'
  | 'financeiro'
  | 'social'
  | 'gamificacao'
  | 'lgpd'
  | 'marca_cliente'

// Ligado = true. Ajuste esta lista para revelar módulos conforme forem entrando
// em uso. O default liga o que sustenta o fluxo de kanban + cronograma e o
// acesso do cliente; deixa desligado o que ainda não vamos operar.
export const FEATURES: Record<FeatureKey, boolean> = {
  // Produção do dia a dia
  calendario: true,   // o cronograma desmembrado aparece aqui — único ligado no lançamento
  imagens: false,     // módulo de Imagens IA
  reunioes: false,

  // Relacionamento e métricas de cliente
  cs: false,          // Customer Success / health score
  nps: false,
  relatorios: false,  // relatórios mensais de IA
  plano: false,       // uso do plano / cotas
  marca_cliente: false, // acesso de cliente segurado até o cronograma rodar

  // Inteligência e automação
  automacoes: false,

  // Comercial
  pipeline: false,    // CRM de prospects

  // Gestão interna (Área das Sócias)
  socias: false,      // hub + Pessoas & Cultura
  financeiro: false,
  social: false,      // agendamento de redes
  gamificacao: false,
  lgpd: false,
}

export function isFeatureEnabled(key: FeatureKey): boolean {
  return FEATURES[key]
}
