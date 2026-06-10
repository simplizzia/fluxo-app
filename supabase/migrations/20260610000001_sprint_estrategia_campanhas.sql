-- =============================================================================
-- Sprint Estratégia & Campanhas
-- 2026-06-10
--
-- 1. Novo valor 'campanhas' no enum categoria_universo
--    (expõe o planejamento de campanhas como seção do universo de marca)
-- 2. Tipos de demanda para trabalho estratégico:
--    diagnóstico, personas, parametrização, estratégia de canais,
--    conceito de campanha, SEO/AIO, influenciadores, Meta Ads,
--    Google Ads e gestão de perfil LinkedIn.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ENUM: adiciona 'campanhas' ao universo da marca
-- ---------------------------------------------------------------------------

ALTER TYPE categoria_universo ADD VALUE IF NOT EXISTS 'campanhas' BEFORE 'outros';

-- ---------------------------------------------------------------------------
-- 2. TIPOS DE DEMANDA ESTRATÉGICOS
-- ---------------------------------------------------------------------------

-- Diagnóstico de Marca
INSERT INTO tipos_demanda (organization_id, nome, slug, categoria, tem_publicacao, campos_formulario, agente_slug) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Diagnóstico de Marca',
  'diagnostico-marca',
  'estrategia',
  false,
  '[
    {"nome":"marca","rotulo":"Marca a diagnosticar","tipo":"text","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"Nome da marca"},
    {"nome":"canais_digitais","rotulo":"Canais digitais ativos","tipo":"textarea","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"Instagram, LinkedIn, site, YouTube... inclua as URLs se disponíveis"},
    {"nome":"concorrentes","rotulo":"Concorrentes a analisar","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Liste 3-5 concorrentes diretos ou marcas de referência"},
    {"nome":"periodo_analise","rotulo":"Período de análise","tipo":"text","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Ex: Últimos 6 meses"},
    {"nome":"diagnostico_gerado","rotulo":"Diagnóstico gerado","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Preenchido pelo agente"},
    {"nome":"oportunidades","rotulo":"Oportunidades identificadas","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Gaps e oportunidades de posicionamento"},
    {"nome":"obs_internas","rotulo":"Observações internas","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Notas da equipe"}
  ]'::jsonb,
  'diagnostico.digital'
) ON CONFLICT (organization_id, slug) DO NOTHING;

-- Definição de Personas
INSERT INTO tipos_demanda (organization_id, nome, slug, categoria, tem_publicacao, campos_formulario, agente_slug) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Definição de Personas',
  'personas',
  'estrategia',
  false,
  '[
    {"nome":"marca","rotulo":"Marca","tipo":"text","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"Nome da marca"},
    {"nome":"dados_base","rotulo":"Dados disponíveis sobre o público","tipo":"textarea","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"Pesquisas, feedback de clientes, dados de venda, analytics, observações do time comercial..."},
    {"nome":"num_personas","rotulo":"Número de personas","tipo":"number","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Ex: 2"},
    {"nome":"personas_geradas","rotulo":"Personas geradas","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Preenchido pelo agente"},
    {"nome":"obs_internas","rotulo":"Observações internas","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Notas da equipe"}
  ]'::jsonb,
  'personas.personas'
) ON CONFLICT (organization_id, slug) DO NOTHING;

-- Parametrização de Conteúdo
INSERT INTO tipos_demanda (organization_id, nome, slug, categoria, tem_publicacao, campos_formulario, agente_slug) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Parametrização de Conteúdo',
  'parametrizacao',
  'estrategia',
  false,
  '[
    {"nome":"marca","rotulo":"Marca","tipo":"text","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"Nome da marca"},
    {"nome":"canal","rotulo":"Canal","tipo":"select","obrigatorio":true,"visivel_para_cliente":true,"opcoes":["Instagram","LinkedIn","Multi-canal"]},
    {"nome":"pilares","rotulo":"Pilares de conteúdo","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"3-5 pilares temáticos que sustentam a comunicação"},
    {"nome":"tom_de_voz","rotulo":"Tom de voz","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Como a marca fala? Palavras que usa e evita, estilo..."},
    {"nome":"formatos_frequencia","rotulo":"Formatos e frequência","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Quais formatos (feed, reel, carrossel...) e com qual frequência"},
    {"nome":"parametros_gerados","rotulo":"Parametrização gerada","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Preenchido pelo agente"},
    {"nome":"obs_internas","rotulo":"Observações internas","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Notas da equipe"}
  ]'::jsonb,
  'inteligencia.parametrizador'
) ON CONFLICT (organization_id, slug) DO NOTHING;

-- Estratégia de Canais
INSERT INTO tipos_demanda (organization_id, nome, slug, categoria, tem_publicacao, campos_formulario) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Estratégia de Canais',
  'estrategia-canais',
  'estrategia',
  false,
  '[
    {"nome":"marca","rotulo":"Marca","tipo":"text","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"Nome da marca"},
    {"nome":"canal","rotulo":"Canal principal","tipo":"select","obrigatorio":true,"visivel_para_cliente":true,"opcoes":["Instagram","LinkedIn","Instagram + LinkedIn","Multi-canal"]},
    {"nome":"objetivo","rotulo":"Objetivo estratégico","tipo":"textarea","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"O que a marca precisa alcançar com esse canal?"},
    {"nome":"publico_alvo","rotulo":"Público-alvo no canal","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Quem a marca quer alcançar especificamente neste canal"},
    {"nome":"estrategia_gerada","rotulo":"Estratégia gerada","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Documentação da estratégia de canal"},
    {"nome":"kpis","rotulo":"KPIs e metas","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Indicadores e metas para esse canal"},
    {"nome":"obs_internas","rotulo":"Observações internas","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Notas da equipe"}
  ]'::jsonb
) ON CONFLICT (organization_id, slug) DO NOTHING;

-- Conceito de Campanha
INSERT INTO tipos_demanda (organization_id, nome, slug, categoria, tem_publicacao, campos_formulario, agente_slug) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Conceito de Campanha',
  'conceito-de-campanha',
  'estrategia',
  false,
  '[
    {"nome":"marca","rotulo":"Marca","tipo":"text","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"Nome da marca"},
    {"nome":"periodo","rotulo":"Período da campanha","tipo":"text","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"Ex: Julho 2026 — Janeiro 2027"},
    {"nome":"brand_platform","rotulo":"Plataforma de marca","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"O território que a marca quer possuir no imaginário (ex: Dove = beleza real)"},
    {"nome":"nome_campanha","rotulo":"Nome da campanha","tipo":"text","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Nome ou título da campanha mestre"},
    {"nome":"key_message","rotulo":"Key message","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"A 1 coisa que o público deve acreditar ou sentir após ver o conteúdo"},
    {"nome":"hero_hub_help","rotulo":"Estrutura Hero / Hub / Help","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Hero (1-2x/mês): ...\nHub (1-2x/semana — série recorrente): ...\nHelp (frequente — utilitário): ..."},
    {"nome":"ativacoes_planejadas","rotulo":"Ativações do período","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Momentos-chave do calendário: datas, lançamentos, sazonalidades"},
    {"nome":"conceito_gerado","rotulo":"Conceito gerado","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Preenchido pelo agente"},
    {"nome":"obs_internas","rotulo":"Observações internas","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Notas da equipe"}
  ]'::jsonb,
  'brand-system.campanhas'
) ON CONFLICT (organization_id, slug) DO NOTHING;

-- Estratégia SEO/AIO
INSERT INTO tipos_demanda (organization_id, nome, slug, categoria, tem_publicacao, campos_formulario) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Estratégia SEO/AIO',
  'seo-aio',
  'estrategia',
  false,
  '[
    {"nome":"site_url","rotulo":"URL do site","tipo":"text","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"https://"},
    {"nome":"objetivo","rotulo":"Objetivo","tipo":"textarea","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"O que a marca quer alcançar com SEO/AIO? (leads, tráfego, autoridade, visibilidade em IA...)"},
    {"nome":"publico","rotulo":"Público-alvo na busca","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Quem busca pelos produtos/serviços e como?"},
    {"nome":"palavras_chave","rotulo":"Palavras-chave prioritárias","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Lista de palavras-chave e clusters temáticos"},
    {"nome":"pautas_sugeridas","rotulo":"Pautas de conteúdo sugeridas","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Temas com potencial de rankeamento + resposta a busca por IA"},
    {"nome":"analise_concorrencia_seo","rotulo":"Análise de concorrência orgânica","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Quem ranqueia para os termos-alvo e com que conteúdo"},
    {"nome":"obs_internas","rotulo":"Observações internas","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Notas da equipe"}
  ]'::jsonb
) ON CONFLICT (organization_id, slug) DO NOTHING;

-- Cronograma de Influenciadores
INSERT INTO tipos_demanda (organization_id, nome, slug, categoria, tem_publicacao, campos_formulario) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Cronograma de Influenciadores',
  'cronograma-influenciadores',
  'redes_sociais',
  false,
  '[
    {"nome":"marca","rotulo":"Marca","tipo":"text","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"Nome da marca"},
    {"nome":"nicho","rotulo":"Nicho / categoria","tipo":"text","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"Ex: gastronomia, saúde, lifestyle, família..."},
    {"nome":"tipo_influenciador","rotulo":"Porte dos influenciadores","tipo":"select","obrigatorio":true,"visivel_para_cliente":true,"opcoes":["Nano (1k-10k)","Micro (10k-100k)","Macro (100k+)","Mix de portes"]},
    {"nome":"objetivo","rotulo":"Objetivo da parceria","tipo":"textarea","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"Awareness, conversão, conteúdo de produto, campanha sazonal..."},
    {"nome":"orcamento_mensal","rotulo":"Orçamento mensal","tipo":"text","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"R$ por mês (permuta, fee ou mix)"},
    {"nome":"lista_influenciadores","rotulo":"Lista de influenciadores mapeados","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"@perfil — seguidores — nicho — proposta"},
    {"nome":"briefing_padrao","rotulo":"Briefing padrão da campanha","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"O que o criador deve mostrar, como deve mostrar e o que NÃO deve fazer"},
    {"nome":"obs_internas","rotulo":"Observações internas","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Notas da equipe"}
  ]'::jsonb
) ON CONFLICT (organization_id, slug) DO NOTHING;

-- Estratégia Meta Ads
INSERT INTO tipos_demanda (organization_id, nome, slug, categoria, tem_publicacao, campos_formulario) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Estratégia Meta Ads',
  'estrategia-meta-ads',
  'trafego',
  false,
  '[
    {"nome":"marca","rotulo":"Marca","tipo":"text","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"Nome da marca"},
    {"nome":"objetivo","rotulo":"Objetivo de campanha","tipo":"select","obrigatorio":true,"visivel_para_cliente":true,"opcoes":["Awareness (alcance e lembrança)","Consideração (tráfego, engajamento, cadastros)","Conversão (vendas, leads qualificados)","Retenção (reengajamento de base)"]},
    {"nome":"publico_primario","rotulo":"Público-alvo primário","tipo":"textarea","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"Dados demográficos, interesses, comportamentos e geo"},
    {"nome":"orcamento_mensal","rotulo":"Orçamento mensal","tipo":"text","obrigatorio":true,"visivel_para_cliente":false,"placeholder":"R$ por mês"},
    {"nome":"estrutura_campanha","rotulo":"Estrutura de campanha","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Campanhas > Conjuntos > Anúncios planejados"},
    {"nome":"copies_anuncios","rotulo":"Copies dos anúncios","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Copy primário, título e descrição para cada variação"},
    {"nome":"historico_conta","rotulo":"Histórico da conta","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"ROAS atual, CPL, campanhas ativas..."},
    {"nome":"obs_internas","rotulo":"Observações internas","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Notas da equipe"}
  ]'::jsonb
) ON CONFLICT (organization_id, slug) DO NOTHING;

-- Estratégia Google Ads
INSERT INTO tipos_demanda (organization_id, nome, slug, categoria, tem_publicacao, campos_formulario) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Estratégia Google Ads',
  'estrategia-google-ads',
  'trafego',
  false,
  '[
    {"nome":"marca","rotulo":"Marca","tipo":"text","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"Nome da marca"},
    {"nome":"tipo_campanha","rotulo":"Tipo de campanha","tipo":"select","obrigatorio":true,"visivel_para_cliente":true,"opcoes":["Search (busca paga)","Display (rede de display)","Shopping","Performance Max","YouTube","Mix"]},
    {"nome":"objetivo","rotulo":"Objetivo","tipo":"textarea","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"O que a campanha precisa gerar? (leads, vendas, tráfego qualificado...)"},
    {"nome":"palavras_chave_foco","rotulo":"Palavras-chave de foco","tipo":"textarea","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"Termos prioritários para licitar"},
    {"nome":"orcamento_mensal","rotulo":"Orçamento mensal","tipo":"text","obrigatorio":true,"visivel_para_cliente":false,"placeholder":"R$ por mês"},
    {"nome":"estrutura_campanha","rotulo":"Estrutura de campanha","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Campanhas > Grupos > Anúncios planejados"},
    {"nome":"negativos","rotulo":"Palavras-chave negativas","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Termos que NÃO devem acionar os anúncios"},
    {"nome":"obs_internas","rotulo":"Observações internas","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Notas da equipe"}
  ]'::jsonb
) ON CONFLICT (organization_id, slug) DO NOTHING;

-- Gestão de Perfil LinkedIn
INSERT INTO tipos_demanda (organization_id, nome, slug, categoria, tem_publicacao, campos_formulario, agente_slug) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Gestão de Perfil LinkedIn',
  'gestao-perfil-linkedin',
  'linkedin',
  false,
  '[
    {"nome":"url_company_page","rotulo":"URL do Company Page","tipo":"text","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"https://www.linkedin.com/company/..."},
    {"nome":"objetivo","rotulo":"Objetivo no LinkedIn","tipo":"textarea","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"O que a marca quer alcançar? (autoridade, geração de leads B2B, employer branding...)"},
    {"nome":"publico_alvo_b2b","rotulo":"Público-alvo B2B","tipo":"textarea","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"Cargo, setor, porte da empresa, região do decisor ideal"},
    {"nome":"situacao_atual","rotulo":"Situação atual da página","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Seguidores, última publicação, bio atual, pontos de melhoria observados"},
    {"nome":"otimizacoes_sugeridas","rotulo":"Otimizações sugeridas","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Melhorias de bio, banner, URL, featured content..."},
    {"nome":"estrategia_conteudo_linkedin","rotulo":"Estratégia de conteúdo","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Tipos de post, série Hub, frequência, thought leadership..."},
    {"nome":"obs_internas","rotulo":"Observações internas","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Notas da equipe"}
  ]'::jsonb,
  'linkedin.otimizacao-perfil'
) ON CONFLICT (organization_id, slug) DO NOTHING;
