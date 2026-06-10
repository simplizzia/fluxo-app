// ---------------------------------------------------------------------------
// Catálogo de Agentes — Simplizzia OS
// 62 agentes organizados em 16 times.
// Este arquivo é a fonte de verdade para o frontend; a tabela agent_catalog
// no banco espelha estes dados (seeded na migration sprint32).
// ---------------------------------------------------------------------------

export type PadraoAgente = 'A' | 'B' | 'C'

export interface InputSchema {
  chave: string
  label: string
  tipo: 'text' | 'textarea' | 'number'
  obrigatorio: boolean
}

export interface AgenteDef {
  chave: string             // unique key, e.g. 'criativo.carrossel'
  nome: string
  descricao: string
  time: string
  timeNumero: number
  padrao: PadraoAgente
  tipoDemandaSlug?: string  // Pattern A: maps to tipos_demanda.slug
  papeisPermitidos: string[]
  inputsSchema: InputSchema[]
}

// ---------------------------------------------------------------------------
// Catálogo completo
// ---------------------------------------------------------------------------

export const AGENTES: AgenteDef[] = [
  // ── Time 0: Brand System ──────────────────────────────────────────────────
  {
    chave: 'brand-system.principal',
    nome: 'Brand System',
    descricao: 'Constrói o Brand System completo do cliente: identidade verbal, visual e posicionamento estratégico.',
    time: 'Brand System',
    timeNumero: 0,
    padrao: 'A',
    tipoDemandaSlug: 'brand-system',
    papeisPermitidos: ['socia', 'gestao'],
    inputsSchema: [{ chave: 'objetivos', label: 'Objetivos da marca', tipo: 'textarea', obrigatorio: true }],
  },
  {
    chave: 'brand-system.banco-prompts-visuais',
    nome: 'Banco de Prompts Visuais',
    descricao: 'Gera prompts otimizados para IA de imagem que capturam a identidade visual da marca.',
    time: 'Brand System',
    timeNumero: 0,
    padrao: 'C',
    papeisPermitidos: ['socia', 'gestao', 'atendimento'],
    inputsSchema: [
      { chave: 'estilo_visual', label: 'Estilo visual da marca', tipo: 'textarea', obrigatorio: true },
      { chave: 'num_prompts', label: 'Número de prompts', tipo: 'number', obrigatorio: false },
    ],
  },
  {
    chave: 'brand-system.diretor-fotografia',
    nome: 'Diretor de Fotografia',
    descricao: 'Define a direção de fotografia da marca: estilo, composição, paleta e diretrizes de produção.',
    time: 'Brand System',
    timeNumero: 0,
    padrao: 'C',
    papeisPermitidos: ['socia', 'gestao'],
    inputsSchema: [{ chave: 'briefing_foto', label: 'Briefing do ensaio', tipo: 'textarea', obrigatorio: true }],
  },
  {
    chave: 'brand-system.validador-visual',
    nome: 'Validador Visual',
    descricao: 'Valida se um ativo visual está alinhado com o Brand System do cliente.',
    time: 'Brand System',
    timeNumero: 0,
    padrao: 'C',
    papeisPermitidos: ['socia', 'gestao', 'atendimento'],
    inputsSchema: [{ chave: 'descricao_ativo', label: 'Descrição do ativo a validar', tipo: 'textarea', obrigatorio: true }],
  },
  {
    chave: 'brand-system.campanhas',
    nome: 'Conceito de Campanha',
    descricao: 'Gera sugestões de brand platform e conceito de campanha mestre com estrutura Hero/Hub/Help e ativações do ano.',
    time: 'Brand System',
    timeNumero: 0,
    padrao: 'C',
    tipoDemandaSlug: 'conceito-de-campanha',
    papeisPermitidos: ['socia', 'gestao'],
    inputsSchema: [
      { chave: 'marca', label: 'Marca', tipo: 'text', obrigatorio: true },
      { chave: 'periodo', label: 'Período da campanha', tipo: 'text', obrigatorio: true },
      { chave: 'contexto', label: 'Diagnóstico e personas resumidos (cole o conteúdo do universo da marca)', tipo: 'textarea', obrigatorio: true },
    ],
  },

  // ── Time 1: Briefing ──────────────────────────────────────────────────────
  {
    chave: 'briefing.izzi',
    nome: 'Briefing — Izzi',
    descricao: 'Conduz o briefing do cliente via conversa: captura objetivos, público, tom de voz e referências.',
    time: 'Briefing',
    timeNumero: 1,
    padrao: 'C',
    papeisPermitidos: ['socia', 'gestao', 'atendimento'],
    inputsSchema: [{ chave: 'contexto_cliente', label: 'Contexto inicial do cliente', tipo: 'textarea', obrigatorio: true }],
  },

  // ── Time 2: Diagnóstico ───────────────────────────────────────────────────
  {
    chave: 'diagnostico.digital',
    nome: 'Diagnóstico Digital',
    descricao: 'Analisa a presença digital do cliente: perfis, conteúdo, performance e oportunidades.',
    time: 'Diagnóstico',
    timeNumero: 2,
    padrao: 'C',
    papeisPermitidos: ['socia', 'gestao'],
    inputsSchema: [
      { chave: 'canais', label: 'Canais a diagnosticar', tipo: 'textarea', obrigatorio: true },
      { chave: 'dados_performance', label: 'Dados de performance disponíveis', tipo: 'textarea', obrigatorio: false },
    ],
  },
  {
    chave: 'diagnostico-marca.diagnostico',
    nome: 'Diagnóstico de Marca',
    descricao: 'Analisa a identidade de marca atual: consistência visual, mensagem e posicionamento.',
    time: 'Diagnóstico de Marca',
    timeNumero: 2,
    padrao: 'C',
    papeisPermitidos: ['socia', 'gestao'],
    inputsSchema: [{ chave: 'materiais_marca', label: 'Materiais e canais da marca atual', tipo: 'textarea', obrigatorio: true }],
  },

  // ── Time 3: Inteligência ──────────────────────────────────────────────────
  {
    chave: 'inteligencia.parametrizador',
    nome: 'Parametrizador de Conteúdo',
    descricao: 'Define os parâmetros completos de cada post do calendário editorial.',
    time: 'Inteligência',
    timeNumero: 3,
    padrao: 'B',
    papeisPermitidos: ['socia', 'gestao', 'atendimento'],
    inputsSchema: [{ chave: 'calendario', label: 'Calendário editorial do mês', tipo: 'textarea', obrigatorio: true }],
  },
  {
    chave: 'inteligencia.validador-pilar',
    nome: 'Validador de Pilar',
    descricao: 'Valida se um conteúdo está alinhado com os pilares de conteúdo do cliente.',
    time: 'Inteligência',
    timeNumero: 3,
    padrao: 'C',
    papeisPermitidos: ['socia', 'gestao', 'atendimento'],
    inputsSchema: [{ chave: 'conteudo', label: 'Conteúdo a validar', tipo: 'textarea', obrigatorio: true }],
  },
  {
    chave: 'inteligencia.validador-tom',
    nome: 'Validador de Tom de Voz',
    descricao: 'Valida se um texto está alinhado com o tom de voz definido para o cliente.',
    time: 'Inteligência',
    timeNumero: 3,
    padrao: 'C',
    papeisPermitidos: ['socia', 'gestao', 'atendimento'],
    inputsSchema: [{ chave: 'texto', label: 'Texto a validar', tipo: 'textarea', obrigatorio: true }],
  },

  // ── Time 4: Planejamento ──────────────────────────────────────────────────
  {
    chave: 'planejamento.calendario',
    nome: 'Calendário Editorial',
    descricao: 'Gera o calendário editorial mensal com base nos parâmetros e brand system do cliente.',
    time: 'Planejamento',
    timeNumero: 4,
    padrao: 'A',
    tipoDemandaSlug: 'calendario-editorial',
    papeisPermitidos: ['socia', 'gestao', 'atendimento'],
    inputsSchema: [
      { chave: 'mes_referencia', label: 'Mês de referência', tipo: 'text', obrigatorio: true },
      { chave: 'temas_prioritarios', label: 'Temas e datas especiais', tipo: 'textarea', obrigatorio: false },
    ],
  },
  {
    chave: 'planejamento.pauta-reuniao',
    nome: 'Pauta de Reunião',
    descricao: 'Gera a pauta estruturada para reuniões de alinhamento com o cliente.',
    time: 'Planejamento',
    timeNumero: 4,
    padrao: 'C',
    papeisPermitidos: ['socia', 'gestao', 'atendimento'],
    inputsSchema: [
      { chave: 'tipo_reuniao', label: 'Tipo de reunião', tipo: 'text', obrigatorio: true },
      { chave: 'contexto', label: 'Contexto e pontos a discutir', tipo: 'textarea', obrigatorio: true },
    ],
  },

  // ── Time 5: Criativo ──────────────────────────────────────────────────────
  {
    chave: 'criativo.carrossel',
    nome: 'Copy de Carrossel',
    descricao: 'Escreve o copy completo de um carrossel: capa impactante, slides intermediários e CTA final.',
    time: 'Criativo',
    timeNumero: 5,
    padrao: 'A',
    tipoDemandaSlug: 'post-carrossel',
    papeisPermitidos: ['socia', 'gestao', 'atendimento'],
    inputsSchema: [
      { chave: 'tema', label: 'Tema do carrossel', tipo: 'text', obrigatorio: true },
      { chave: 'num_slides', label: 'Número de slides', tipo: 'number', obrigatorio: false },
    ],
  },
  {
    chave: 'criativo.reels-tiktok',
    nome: 'Roteiro de Reels/TikTok',
    descricao: 'Escreve o roteiro completo de um Reel ou TikTok com narração, direção de cena e copy.',
    time: 'Criativo',
    timeNumero: 5,
    padrao: 'A',
    tipoDemandaSlug: 'reel',
    papeisPermitidos: ['socia', 'gestao', 'atendimento'],
    inputsSchema: [
      { chave: 'conceito', label: 'Conceito do vídeo', tipo: 'textarea', obrigatorio: true },
      { chave: 'duracao', label: 'Duração (15s/30s/60s/90s)', tipo: 'text', obrigatorio: false },
    ],
  },
  {
    chave: 'criativo.post-estatico',
    nome: 'Post Estático',
    descricao: 'Cria o conceito e copy de um post estático para redes sociais.',
    time: 'Criativo',
    timeNumero: 5,
    padrao: 'A',
    tipoDemandaSlug: 'post-feed',
    papeisPermitidos: ['socia', 'gestao', 'atendimento'],
    inputsSchema: [
      { chave: 'tema', label: 'Tema do post', tipo: 'text', obrigatorio: true },
      { chave: 'canal', label: 'Canal (Instagram/LinkedIn)', tipo: 'text', obrigatorio: false },
    ],
  },
  {
    chave: 'criativo.post-foto-real',
    nome: 'Post Foto Real',
    descricao: 'Cria a direção criativa e copy para posts com fotografia real do cliente ou produto.',
    time: 'Criativo',
    timeNumero: 5,
    padrao: 'C',
    papeisPermitidos: ['socia', 'gestao', 'atendimento'],
    inputsSchema: [
      { chave: 'descricao_foto', label: 'Descrição da foto/produto', tipo: 'textarea', obrigatorio: true },
      { chave: 'objetivo', label: 'Objetivo do post', tipo: 'text', obrigatorio: false },
    ],
  },
  {
    chave: 'criativo.story-engajamento',
    nome: 'Story de Engajamento',
    descricao: 'Cria sequências de stories com gatilhos estratégicos de engajamento.',
    time: 'Criativo',
    timeNumero: 5,
    padrao: 'A',
    tipoDemandaSlug: 'story',
    papeisPermitidos: ['socia', 'gestao', 'atendimento'],
    inputsSchema: [
      { chave: 'objetivo', label: 'Objetivo do story', tipo: 'text', obrigatorio: true },
      { chave: 'num_frames', label: 'Número de frames', tipo: 'number', obrigatorio: false },
    ],
  },
  {
    chave: 'criativo.legenda-organica',
    nome: 'Legenda Orgânica',
    descricao: 'Escreve legendas orgânicas de alto impacto, alinhadas com o tom de voz da marca.',
    time: 'Criativo',
    timeNumero: 5,
    padrao: 'C',
    papeisPermitidos: ['socia', 'gestao', 'atendimento'],
    inputsSchema: [
      { chave: 'tema_post', label: 'Tema ou conceito do post', tipo: 'textarea', obrigatorio: true },
      { chave: 'canal', label: 'Canal (Instagram/LinkedIn/TikTok)', tipo: 'text', obrigatorio: false },
    ],
  },
  {
    chave: 'criativo.script-audio',
    nome: 'Script de Áudio',
    descricao: 'Cria scripts para podcasts, narração de vídeos, spots e conteúdos de áudio.',
    time: 'Criativo',
    timeNumero: 5,
    padrao: 'C',
    papeisPermitidos: ['socia', 'gestao', 'atendimento'],
    inputsSchema: [
      { chave: 'formato', label: 'Formato (podcast/narração/spot)', tipo: 'text', obrigatorio: true },
      { chave: 'tema', label: 'Tema e objetivo', tipo: 'textarea', obrigatorio: true },
      { chave: 'duracao', label: 'Duração em segundos', tipo: 'number', obrigatorio: false },
    ],
  },
  {
    chave: 'criativo.pauta-ugc',
    nome: 'Pauta UGC',
    descricao: 'Cria a pauta estruturada para conteúdo UGC com clientes ou criadores.',
    time: 'Criativo',
    timeNumero: 5,
    padrao: 'C',
    papeisPermitidos: ['socia', 'gestao', 'atendimento'],
    inputsSchema: [
      { chave: 'produto_servico', label: 'Produto ou serviço destacado', tipo: 'text', obrigatorio: true },
      { chave: 'perfil_criador', label: 'Perfil do criador de conteúdo', tipo: 'textarea', obrigatorio: false },
    ],
  },
  {
    chave: 'criativo.publicacao',
    nome: 'Revisão de Publicação',
    descricao: 'Revisa e formata o conteúdo final antes da publicação, garantindo qualidade e alinhamento.',
    time: 'Criativo',
    timeNumero: 5,
    padrao: 'C',
    papeisPermitidos: ['socia', 'gestao', 'atendimento'],
    inputsSchema: [
      { chave: 'conteudo_final', label: 'Conteúdo para revisar', tipo: 'textarea', obrigatorio: true },
      { chave: 'canal_plataforma', label: 'Plataforma de publicação', tipo: 'text', obrigatorio: true },
    ],
  },

  // ── Time 6: Tráfego Pago ──────────────────────────────────────────────────
  {
    chave: 'trafego.google',
    nome: 'Tráfego — Google Ads',
    descricao: 'Cria e otimiza campanhas de tráfego pago no Google Ads.',
    time: 'Tráfego Pago',
    timeNumero: 6,
    padrao: 'C',
    papeisPermitidos: ['socia', 'gestao'],
    inputsSchema: [
      { chave: 'objetivo_campanha', label: 'Objetivo da campanha', tipo: 'text', obrigatorio: true },
      { chave: 'publico_alvo', label: 'Público-alvo', tipo: 'textarea', obrigatorio: true },
      { chave: 'orcamento', label: 'Orçamento mensal', tipo: 'text', obrigatorio: false },
    ],
  },
  {
    chave: 'trafego.instagram',
    nome: 'Tráfego — Instagram/Meta Ads',
    descricao: 'Cria e otimiza campanhas de tráfego pago no Instagram e Facebook.',
    time: 'Tráfego Pago',
    timeNumero: 6,
    padrao: 'C',
    papeisPermitidos: ['socia', 'gestao'],
    inputsSchema: [
      { chave: 'objetivo', label: 'Objetivo (alcance/tráfego/conversão)', tipo: 'text', obrigatorio: true },
      { chave: 'publico', label: 'Público e interesses', tipo: 'textarea', obrigatorio: true },
    ],
  },
  {
    chave: 'trafego.linkedin',
    nome: 'Tráfego — LinkedIn Ads',
    descricao: 'Cria e otimiza campanhas de tráfego pago no LinkedIn.',
    time: 'Tráfego Pago',
    timeNumero: 6,
    padrao: 'C',
    papeisPermitidos: ['socia', 'gestao'],
    inputsSchema: [
      { chave: 'objetivo', label: 'Objetivo da campanha', tipo: 'text', obrigatorio: true },
      { chave: 'cargo_segmento', label: 'Cargos e setores do público', tipo: 'textarea', obrigatorio: true },
    ],
  },
  {
    chave: 'trafego.monitor-investimento',
    nome: 'Monitor de Investimento',
    descricao: 'Monitora e analisa os investimentos em tráfego pago por canal.',
    time: 'Tráfego Pago',
    timeNumero: 6,
    padrao: 'C',
    papeisPermitidos: ['socia', 'gestao', 'atendimento'],
    inputsSchema: [{ chave: 'dados_investimento', label: 'Dados de investimento e resultados', tipo: 'textarea', obrigatorio: true }],
  },
  {
    chave: 'trafego.otimizador',
    nome: 'Otimizador de Campanhas',
    descricao: 'Identifica oportunidades de otimização nas campanhas de tráfego pago ativas.',
    time: 'Tráfego Pago',
    timeNumero: 6,
    padrao: 'C',
    papeisPermitidos: ['socia', 'gestao'],
    inputsSchema: [{ chave: 'dados_campanhas', label: 'Dados das campanhas ativas', tipo: 'textarea', obrigatorio: true }],
  },
  {
    chave: 'trafego.relatorio-trafego',
    nome: 'Relatório de Tráfego',
    descricao: 'Gera relatório completo de performance das campanhas de tráfego pago.',
    time: 'Tráfego Pago',
    timeNumero: 6,
    padrao: 'C',
    papeisPermitidos: ['socia', 'gestao', 'atendimento'],
    inputsSchema: [
      { chave: 'periodo', label: 'Período do relatório', tipo: 'text', obrigatorio: true },
      { chave: 'dados_campanhas', label: 'Dados de performance das campanhas', tipo: 'textarea', obrigatorio: true },
    ],
  },

  // ── Time 7: Monitoramento ─────────────────────────────────────────────────
  {
    chave: 'monitoramento.radar-tendencias',
    nome: 'Radar de Tendências',
    descricao: 'Identifica e analisa tendências relevantes para o cliente, gerando oportunidades de conteúdo.',
    time: 'Monitoramento',
    timeNumero: 7,
    padrao: 'B',
    papeisPermitidos: ['socia', 'gestao', 'atendimento'],
    inputsSchema: [
      { chave: 'tendencias_observadas', label: 'Tendências observadas no período', tipo: 'textarea', obrigatorio: true },
      { chave: 'setor_cliente', label: 'Setor de atuação do cliente', tipo: 'text', obrigatorio: false },
    ],
  },
  {
    chave: 'monitoramento.monitor-virais',
    nome: 'Monitor de Virais',
    descricao: 'Analisa conteúdos virais e propõe adaptações estratégicas para o cliente.',
    time: 'Monitoramento',
    timeNumero: 7,
    padrao: 'B',
    papeisPermitidos: ['socia', 'gestao', 'atendimento'],
    inputsSchema: [{ chave: 'virais_identificados', label: 'Virais identificados (links ou descrições)', tipo: 'textarea', obrigatorio: true }],
  },
  {
    chave: 'monitoramento.performance',
    nome: 'Análise de Performance',
    descricao: 'Analisa a performance dos conteúdos publicados e identifica padrões de sucesso.',
    time: 'Monitoramento',
    timeNumero: 7,
    padrao: 'C',
    papeisPermitidos: ['socia', 'gestao', 'atendimento'],
    inputsSchema: [{ chave: 'dados_performance', label: 'Dados de performance do período', tipo: 'textarea', obrigatorio: true }],
  },
  {
    chave: 'monitoramento.relatorio-mensal',
    nome: 'Relatório Mensal',
    descricao: 'Gera o relatório mensal completo de performance para o cliente com análise e plano.',
    time: 'Monitoramento',
    timeNumero: 7,
    padrao: 'A',
    tipoDemandaSlug: 'relatorio-mensal',
    papeisPermitidos: ['socia', 'gestao', 'atendimento'],
    inputsSchema: [
      { chave: 'periodo_referencia', label: 'Mês de referência', tipo: 'text', obrigatorio: true },
      { chave: 'dados_organico', label: 'Dados de orgânico', tipo: 'textarea', obrigatorio: false },
      { chave: 'dados_pago', label: 'Dados de tráfego pago', tipo: 'textarea', obrigatorio: false },
    ],
  },

  // ── Time 8: Comercial ─────────────────────────────────────────────────────
  {
    chave: 'comercial.qualificador-lead',
    nome: 'Qualificador de Lead',
    descricao: 'Qualifica leads com base em fit, urgência e potencial de conversão.',
    time: 'Comercial',
    timeNumero: 8,
    padrao: 'C',
    papeisPermitidos: ['socia'],
    inputsSchema: [{ chave: 'dados_lead', label: 'Dados do lead (empresa, contato, contexto)', tipo: 'textarea', obrigatorio: true }],
  },
  {
    chave: 'comercial.arquiteto-solucao',
    nome: 'Arquiteto de Solução',
    descricao: 'Estrutura a solução ideal para o prospect com base no diagnóstico e objetivos.',
    time: 'Comercial',
    timeNumero: 8,
    padrao: 'C',
    papeisPermitidos: ['socia'],
    inputsSchema: [{ chave: 'briefing_lead', label: 'Briefing do lead e objetivos', tipo: 'textarea', obrigatorio: true }],
  },
  {
    chave: 'comercial.calculadora-precificacao',
    nome: 'Calculadora de Precificação',
    descricao: 'Calcula o preço da solução com base no escopo e perfil do cliente.',
    time: 'Comercial',
    timeNumero: 8,
    padrao: 'C',
    papeisPermitidos: ['socia'],
    inputsSchema: [{ chave: 'escopo_servicos', label: 'Escopo de serviços definido', tipo: 'textarea', obrigatorio: true }],
  },
  {
    chave: 'comercial.gerador-proposta',
    nome: 'Gerador de Proposta',
    descricao: 'Gera proposta comercial completa, personalizada e orientada a valor.',
    time: 'Comercial',
    timeNumero: 8,
    padrao: 'C',
    papeisPermitidos: ['socia'],
    inputsSchema: [
      { chave: 'lead_nome', label: 'Nome do lead/empresa', tipo: 'text', obrigatorio: true },
      { chave: 'solucao', label: 'Solução e precificação definidas', tipo: 'textarea', obrigatorio: true },
    ],
  },
  {
    chave: 'comercial.gerador-mensagem-prospeccao',
    nome: 'Mensagem de Prospecção',
    descricao: 'Cria mensagens de prospecção personalizadas para LinkedIn, e-mail ou WhatsApp.',
    time: 'Comercial',
    timeNumero: 8,
    padrao: 'C',
    papeisPermitidos: ['socia', 'gestao'],
    inputsSchema: [
      { chave: 'canal', label: 'Canal (LinkedIn/e-mail/WhatsApp)', tipo: 'text', obrigatorio: true },
      { chave: 'perfil_prospect', label: 'Perfil do prospect', tipo: 'textarea', obrigatorio: true },
    ],
  },
  {
    chave: 'comercial.gerador-contrato',
    nome: 'Gerador de Contrato',
    descricao: 'Gera minutas de contrato de prestação de serviços alinhadas com a solução vendida.',
    time: 'Comercial',
    timeNumero: 8,
    padrao: 'C',
    papeisPermitidos: ['socia'],
    inputsSchema: [
      { chave: 'cliente_nome', label: 'Nome do cliente', tipo: 'text', obrigatorio: true },
      { chave: 'servicos_acordados', label: 'Serviços e condições acordadas', tipo: 'textarea', obrigatorio: true },
    ],
  },
  {
    chave: 'comercial.estrategista-geracao-leads',
    nome: 'Estrategista de Geração de Leads',
    descricao: 'Cria estratégias de geração de leads qualificados.',
    time: 'Comercial',
    timeNumero: 8,
    padrao: 'C',
    papeisPermitidos: ['socia'],
    inputsSchema: [
      { chave: 'publico_alvo', label: 'Público-alvo e perfil desejado', tipo: 'textarea', obrigatorio: true },
      { chave: 'orcamento_disponivel', label: 'Orçamento disponível', tipo: 'text', obrigatorio: false },
    ],
  },
  {
    chave: 'comercial.sequencia-followup',
    nome: 'Sequência de Follow-up',
    descricao: 'Cria sequência de follow-up multicanal para leads que não converteram.',
    time: 'Comercial',
    timeNumero: 8,
    padrao: 'C',
    papeisPermitidos: ['socia', 'gestao'],
    inputsSchema: [{ chave: 'contexto_lead', label: 'Contexto do lead e último contato', tipo: 'textarea', obrigatorio: true }],
  },

  // ── Time 9: Personas ──────────────────────────────────────────────────────
  {
    chave: 'personas.personas',
    nome: 'Criador de Personas',
    descricao: 'Cria e aprofunda as personas do cliente com base em dados, briefing e pesquisa.',
    time: 'Personas',
    timeNumero: 9,
    padrao: 'C',
    papeisPermitidos: ['socia', 'gestao'],
    inputsSchema: [{ chave: 'dados_cliente', label: 'Dados do cliente (produto, mercado, público)', tipo: 'textarea', obrigatorio: true }],
  },

  // ── Time 10: Gestão Interna ────────────────────────────────────────────────
  {
    chave: 'gestao-interna.assistente-financeiro',
    nome: 'Assistente Financeiro',
    descricao: 'Analisa dados financeiros da Simplizzia e gera insights de gestão.',
    time: 'Gestão Interna',
    timeNumero: 10,
    padrao: 'C',
    papeisPermitidos: ['socia'],
    inputsSchema: [{ chave: 'dados_financeiros', label: 'Dados financeiros do período', tipo: 'textarea', obrigatorio: true }],
  },
  {
    chave: 'gestao-interna.gerador-nda',
    nome: 'Gerador de NDA',
    descricao: 'Gera acordos de confidencialidade para projetos e parcerias.',
    time: 'Gestão Interna',
    timeNumero: 10,
    padrao: 'C',
    papeisPermitidos: ['socia'],
    inputsSchema: [
      { chave: 'parte_nome', label: 'Nome da outra parte', tipo: 'text', obrigatorio: true },
      { chave: 'contexto_projeto', label: 'Contexto do projeto/parceria', tipo: 'textarea', obrigatorio: true },
    ],
  },
  {
    chave: 'gestao-interna.gestor-projetos',
    nome: 'Gestor de Projetos',
    descricao: 'Organiza e prioriza projetos internos com metodologia e critérios estratégicos.',
    time: 'Gestão Interna',
    timeNumero: 10,
    padrao: 'C',
    papeisPermitidos: ['socia', 'gestao'],
    inputsSchema: [{ chave: 'projetos_ativos', label: 'Projetos ativos e contexto', tipo: 'textarea', obrigatorio: true }],
  },

  // ── Time 11: Qualidade ────────────────────────────────────────────────────
  {
    chave: 'qualidade.auditor-processos',
    nome: 'Auditor de Processos',
    descricao: 'Audita processos operacionais e identifica gargalos e oportunidades de melhoria.',
    time: 'Qualidade',
    timeNumero: 11,
    padrao: 'C',
    papeisPermitidos: ['socia'],
    inputsSchema: [{ chave: 'processo_descricao', label: 'Descrição do processo a auditar', tipo: 'textarea', obrigatorio: true }],
  },
  {
    chave: 'qualidade.escala-simplizzia',
    nome: 'Escala — Simplizzia',
    descricao: 'Cria planos de escala operacional para novas contas ou expansão de serviços.',
    time: 'Qualidade',
    timeNumero: 11,
    padrao: 'C',
    papeisPermitidos: ['socia'],
    inputsSchema: [{ chave: 'contexto_escala', label: 'Contexto e objetivos de escala', tipo: 'textarea', obrigatorio: true }],
  },
  {
    chave: 'qualidade.gestor-feedbacks',
    nome: 'Gestor de Feedbacks',
    descricao: 'Organiza e analisa feedbacks de clientes e equipe para melhoria contínua.',
    time: 'Qualidade',
    timeNumero: 11,
    padrao: 'C',
    papeisPermitidos: ['socia', 'gestao'],
    inputsSchema: [{ chave: 'feedbacks', label: 'Feedbacks coletados', tipo: 'textarea', obrigatorio: true }],
  },

  // ── Time 12: LGPD / Conformidade ──────────────────────────────────────────
  {
    chave: 'conformidade.auditor-dados',
    nome: 'Auditor de Dados — LGPD',
    descricao: 'Audita o tratamento de dados pessoais para conformidade com a LGPD.',
    time: 'LGPD / Conformidade',
    timeNumero: 12,
    padrao: 'C',
    papeisPermitidos: ['socia'],
    inputsSchema: [{ chave: 'escopo_auditoria', label: 'Escopo da auditoria', tipo: 'textarea', obrigatorio: true }],
  },
  {
    chave: 'conformidade.consultor-lgpd',
    nome: 'Consultor LGPD',
    descricao: 'Orienta sobre adequação à LGPD, bases legais e boas práticas de privacidade.',
    time: 'LGPD / Conformidade',
    timeNumero: 12,
    padrao: 'C',
    papeisPermitidos: ['socia', 'gestao'],
    inputsSchema: [{ chave: 'duvida_situacao', label: 'Dúvida ou situação a analisar', tipo: 'textarea', obrigatorio: true }],
  },
  {
    chave: 'conformidade.gestor-incidentes',
    nome: 'Gestor de Incidentes de Dados',
    descricao: 'Gerencia incidentes de segurança de dados conforme a LGPD.',
    time: 'LGPD / Conformidade',
    timeNumero: 12,
    padrao: 'C',
    papeisPermitidos: ['socia'],
    inputsSchema: [{ chave: 'descricao_incidente', label: 'Descrição do incidente', tipo: 'textarea', obrigatorio: true }],
  },

  // ── Time 13: LinkedIn ─────────────────────────────────────────────────────
  {
    chave: 'linkedin.parametrizador',
    nome: 'Parametrizador — LinkedIn',
    descricao: 'Define os parâmetros estratégicos de conteúdo para o LinkedIn do cliente.',
    time: 'LinkedIn',
    timeNumero: 13,
    padrao: 'C',
    papeisPermitidos: ['socia', 'gestao', 'atendimento'],
    inputsSchema: [{ chave: 'perfil_cliente', label: 'Perfil e objetivos no LinkedIn', tipo: 'textarea', obrigatorio: true }],
  },
  {
    chave: 'linkedin.calendario',
    nome: 'Calendário — LinkedIn',
    descricao: 'Cria o calendário editorial mensal para o LinkedIn do cliente.',
    time: 'LinkedIn',
    timeNumero: 13,
    padrao: 'C',
    papeisPermitidos: ['socia', 'gestao', 'atendimento'],
    inputsSchema: [
      { chave: 'mes_referencia', label: 'Mês de referência', tipo: 'text', obrigatorio: true },
      { chave: 'objetivos_mes', label: 'Objetivos do mês', tipo: 'textarea', obrigatorio: false },
    ],
  },
  {
    chave: 'linkedin.conteudo',
    nome: 'Conteúdo — LinkedIn',
    descricao: 'Cria conteúdo original e estratégico para o LinkedIn.',
    time: 'LinkedIn',
    timeNumero: 13,
    padrao: 'C',
    papeisPermitidos: ['socia', 'gestao', 'atendimento'],
    inputsSchema: [
      { chave: 'tema', label: 'Tema e objetivo do conteúdo', tipo: 'textarea', obrigatorio: true },
      { chave: 'formato', label: 'Formato (texto/carrossel/artigo)', tipo: 'text', obrigatorio: false },
    ],
  },
  {
    chave: 'linkedin.comentarios',
    nome: 'Estratégia de Comentários',
    descricao: 'Cria estratégia de comentários para ampliar alcance e autoridade no LinkedIn.',
    time: 'LinkedIn',
    timeNumero: 13,
    padrao: 'C',
    papeisPermitidos: ['socia', 'gestao', 'atendimento'],
    inputsSchema: [{ chave: 'perfis_alvo', label: 'Perfis ou nichos onde comentar', tipo: 'textarea', obrigatorio: true }],
  },
  {
    chave: 'linkedin.conexao-prospeccao',
    nome: 'Conexão & Prospecção — LinkedIn',
    descricao: 'Cria estratégia de conexões e mensagens de prospecção no LinkedIn.',
    time: 'LinkedIn',
    timeNumero: 13,
    padrao: 'C',
    papeisPermitidos: ['socia', 'gestao'],
    inputsSchema: [{ chave: 'perfil_prospect', label: 'Perfil do prospect ideal', tipo: 'textarea', obrigatorio: true }],
  },
  {
    chave: 'linkedin.otimizacao-perfil',
    nome: 'Otimização de Perfil — LinkedIn',
    descricao: 'Otimiza o perfil do LinkedIn do cliente para máxima conversão e autoridade.',
    time: 'LinkedIn',
    timeNumero: 13,
    padrao: 'C',
    papeisPermitidos: ['socia', 'gestao', 'atendimento'],
    inputsSchema: [{ chave: 'situacao_atual', label: 'Situação atual do perfil', tipo: 'textarea', obrigatorio: true }],
  },
  {
    chave: 'linkedin.relatorio',
    nome: 'Relatório — LinkedIn',
    descricao: 'Gera relatório de performance do LinkedIn com insights e recomendações.',
    time: 'LinkedIn',
    timeNumero: 13,
    padrao: 'C',
    papeisPermitidos: ['socia', 'gestao', 'atendimento'],
    inputsSchema: [
      { chave: 'dados_linkedin', label: 'Dados de performance do LinkedIn', tipo: 'textarea', obrigatorio: true },
      { chave: 'periodo', label: 'Período', tipo: 'text', obrigatorio: true },
    ],
  },

  // ── Time 14: Pessoas & Cultura ────────────────────────────────────────────
  {
    chave: 'pessoas-cultura.onboarding-colaborador',
    nome: 'Onboarding de Colaborador',
    descricao: 'Estrutura o processo de onboarding de novos colaboradores da Simplizzia.',
    time: 'Pessoas & Cultura',
    timeNumero: 14,
    padrao: 'C',
    papeisPermitidos: ['socia'],
    inputsSchema: [
      { chave: 'cargo_area', label: 'Cargo e área do novo colaborador', tipo: 'text', obrigatorio: true },
      { chave: 'contexto', label: 'Contexto adicional', tipo: 'textarea', obrigatorio: false },
    ],
  },
  {
    chave: 'pessoas-cultura.gestor-beneficios',
    nome: 'Gestor de Benefícios',
    descricao: 'Analisa e otimiza o pacote de benefícios para a equipe.',
    time: 'Pessoas & Cultura',
    timeNumero: 14,
    padrao: 'C',
    papeisPermitidos: ['socia'],
    inputsSchema: [{ chave: 'situacao_atual', label: 'Pacote de benefícios atual', tipo: 'textarea', obrigatorio: true }],
  },
  {
    chave: 'pessoas-cultura.gestor-parceiros',
    nome: 'Gestor de Parceiros',
    descricao: 'Gerencia relacionamentos com parceiros estratégicos da Simplizzia.',
    time: 'Pessoas & Cultura',
    timeNumero: 14,
    padrao: 'C',
    papeisPermitidos: ['socia'],
    inputsSchema: [{ chave: 'parceiros_ativos', label: 'Parceiros ativos e contexto', tipo: 'textarea', obrigatorio: true }],
  },
  {
    chave: 'pessoas-cultura.criador-acoes',
    nome: 'Criador de Ações de Cultura',
    descricao: 'Cria ações de engajamento, cultura organizacional e reconhecimento.',
    time: 'Pessoas & Cultura',
    timeNumero: 14,
    padrao: 'C',
    papeisPermitidos: ['socia'],
    inputsSchema: [
      { chave: 'objetivo_acao', label: 'Objetivo da ação', tipo: 'text', obrigatorio: true },
      { chave: 'contexto_equipe', label: 'Contexto atual da equipe', tipo: 'textarea', obrigatorio: false },
    ],
  },
  {
    chave: 'pessoas-cultura.planejador-datas',
    nome: 'Planejador de Datas Internas',
    descricao: 'Planeja datas comemorativas, eventos e marcos internos da equipe.',
    time: 'Pessoas & Cultura',
    timeNumero: 14,
    padrao: 'C',
    papeisPermitidos: ['socia'],
    inputsSchema: [{ chave: 'periodo', label: 'Período a planejar', tipo: 'text', obrigatorio: true }],
  },
  {
    chave: 'pessoas-cultura.planejador-atividades',
    nome: 'Planejador de Atividades',
    descricao: 'Sugere atividades, mimos e ações de cultura personalizadas com base nos perfis dos parceiros coletados no onboarding.',
    time: 'Pessoas & Cultura',
    timeNumero: 14,
    padrao: 'C',
    papeisPermitidos: ['socia'],
    inputsSchema: [
      { chave: 'contexto', label: 'Contexto ou restrição (ex: orçamento, data especial)', tipo: 'text', obrigatorio: false },
    ],
  },

  // ── Time 15: Análise de Concorrência ─────────────────────────────────────
  {
    chave: 'analise-concorrencia.analise',
    nome: 'Análise de Concorrência',
    descricao: 'Analisa concorrentes do cliente: posicionamento, conteúdo, estratégias e gaps.',
    time: 'Análise de Concorrência',
    timeNumero: 15,
    padrao: 'C',
    papeisPermitidos: ['socia', 'gestao'],
    inputsSchema: [
      { chave: 'concorrentes', label: 'Concorrentes a analisar', tipo: 'textarea', obrigatorio: true },
      { chave: 'criterios', label: 'Critérios de análise prioritários', tipo: 'textarea', obrigatorio: false },
    ],
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Lookup by chave — O(n) but catalog is small (62 items) */
export function getAgente(chave: string): AgenteDef | undefined {
  return AGENTES.find((a) => a.chave === chave)
}

/** Get agent chave for a given tipo_demanda slug */
export function getAgenteByTipoDemanda(slug: string): AgenteDef | undefined {
  return AGENTES.find((a) => a.tipoDemandaSlug === slug)
}

/** Group agents by time */
export function agentesPorTime(): Map<string, AgenteDef[]> {
  const map = new Map<string, AgenteDef[]>()
  for (const agente of AGENTES) {
    const lista = map.get(agente.time) ?? []
    lista.push(agente)
    map.set(agente.time, lista)
  }
  return map
}

/** Label for padrao */
export const PADRAO_LABELS: Record<PadraoAgente, string> = {
  A: 'Automático (card)',
  B: 'Agendado (cron)',
  C: 'Manual',
}
