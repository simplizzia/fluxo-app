-- =============================================================================
-- Fluxo App — Seed Sprint 1.1: Tipos de Demanda + Cliente de Desenvolvimento
-- Sprint 1.1 | 2026-05-26
--
-- TIPOS DE DEMANDA: seeds iniciais dos principais serviços da Simplizzia.
--   Podem ser criados/editados via interface de administração após o deploy.
--
-- CLIENTE DE TESTE: "Tonoli Sushi" — apenas para desenvolvimento local.
--   Pode ser removido antes de ir a produção.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TIPOS DE DEMANDA — seeds iniciais
-- ---------------------------------------------------------------------------

-- Redes Sociais: Post Feed
INSERT INTO tipos_demanda (organization_id, nome, slug, categoria, tem_publicacao, campos_formulario, agente_slug) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Post Feed (Imagem)',
  'post-feed',
  'redes_sociais',
  true,
  '[
    {"nome":"tema","rotulo":"Tema do post","tipo":"text","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"Qual o tema ou assunto principal?"},
    {"nome":"referencias","rotulo":"Referências visuais","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Links ou descrição de referências (opcional)"},
    {"nome":"cta","rotulo":"Call to action","tipo":"text","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Ex: Acesse o link na bio"},
    {"nome":"legenda_sugerida","rotulo":"Sugestão de legenda","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Sugestão de texto para a legenda (opcional)"},
    {"nome":"horas_estimadas","rotulo":"Horas estimadas","tipo":"number","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"0"},
    {"nome":"obs_internas","rotulo":"Observações internas","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Notas da equipe"}
  ]'::jsonb,
  'time5-criativo-post'
) ON CONFLICT (organization_id, slug) DO NOTHING;

-- Redes Sociais: Post Carrossel
INSERT INTO tipos_demanda (organization_id, nome, slug, categoria, tem_publicacao, campos_formulario, agente_slug) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Post Carrossel',
  'post-carrossel',
  'redes_sociais',
  true,
  '[
    {"nome":"tema","rotulo":"Tema do carrossel","tipo":"text","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"Qual o tema ou assunto principal?"},
    {"nome":"num_slides","rotulo":"Número de slides","tipo":"number","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"Ex: 5"},
    {"nome":"referencias","rotulo":"Referências visuais","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Links ou descrição de referências"},
    {"nome":"cta","rotulo":"Call to action","tipo":"text","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Ex: Salve para usar depois"},
    {"nome":"legenda_sugerida","rotulo":"Sugestão de legenda","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Sugestão de texto para a legenda (opcional)"},
    {"nome":"horas_estimadas","rotulo":"Horas estimadas","tipo":"number","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"0"},
    {"nome":"obs_internas","rotulo":"Observações internas","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Notas da equipe"}
  ]'::jsonb,
  'time5-criativo-carrossel'
) ON CONFLICT (organization_id, slug) DO NOTHING;

-- Redes Sociais: Reel
INSERT INTO tipos_demanda (organization_id, nome, slug, categoria, tem_publicacao, campos_formulario, agente_slug) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Reel',
  'reel',
  'redes_sociais',
  true,
  '[
    {"nome":"conceito","rotulo":"Conceito do reel","tipo":"textarea","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"Descreva a ideia principal do vídeo"},
    {"nome":"duracao_segundos","rotulo":"Duração (segundos)","tipo":"number","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"Ex: 30"},
    {"nome":"referencias","rotulo":"Referências de vídeo","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Links de reels que inspiram (Instagram, TikTok...)"},
    {"nome":"musica","rotulo":"Sugestão de música","tipo":"text","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Artista ou nome da música (opcional)"},
    {"nome":"roteiro","rotulo":"Roteiro gerado","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Preenchido pelo agente de IA"},
    {"nome":"horas_estimadas","rotulo":"Horas estimadas","tipo":"number","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"0"}
  ]'::jsonb,
  'time5-criativo-roteiro'
) ON CONFLICT (organization_id, slug) DO NOTHING;

-- Redes Sociais: Story
INSERT INTO tipos_demanda (organization_id, nome, slug, categoria, tem_publicacao, campos_formulario, agente_slug) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Story',
  'story',
  'redes_sociais',
  true,
  '[
    {"nome":"objetivo","rotulo":"Objetivo do story","tipo":"select","obrigatorio":true,"visivel_para_cliente":true,"opcoes":["Engajamento","CTA / Tráfego","Informativo","Bastidor","Promoção"]},
    {"nome":"referencias","rotulo":"Referências","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Links ou descrição de referências"},
    {"nome":"copy","rotulo":"Copy / texto","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Texto principal do story (opcional)"},
    {"nome":"obs_internas","rotulo":"Observações internas","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Notas da equipe"}
  ]'::jsonb,
  'time5-criativo-story'
) ON CONFLICT (organization_id, slug) DO NOTHING;

-- LinkedIn: Post
INSERT INTO tipos_demanda (organization_id, nome, slug, categoria, tem_publicacao, campos_formulario, agente_slug) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Post LinkedIn',
  'post-linkedin',
  'linkedin',
  true,
  '[
    {"nome":"tema","rotulo":"Tema do post","tipo":"text","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"Qual o tema ou assunto?"},
    {"nome":"tom","rotulo":"Tom desejado","tipo":"select","obrigatorio":true,"visivel_para_cliente":true,"opcoes":["Profissional","Pessoal","Thought Leadership","Storytelling"]},
    {"nome":"cta","rotulo":"Call to action","tipo":"text","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Ex: Deixe seu comentário"},
    {"nome":"copy_gerado","rotulo":"Copy gerado","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Preenchido pelo agente de IA"}
  ]'::jsonb,
  'time13-linkedin-post'
) ON CONFLICT (organization_id, slug) DO NOTHING;

-- Estratégia: Calendário Editorial
INSERT INTO tipos_demanda (organization_id, nome, slug, categoria, tem_publicacao, campos_formulario, agente_slug) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Calendário Editorial',
  'calendario-editorial',
  'estrategia',
  false,
  '[
    {"nome":"mes_referencia","rotulo":"Mês de referência","tipo":"month","obrigatorio":true,"visivel_para_cliente":true,"placeholder":""},
    {"nome":"temas_prioritarios","rotulo":"Temas prioritários","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Ex: lançamento de produto, datas comemorativas..."},
    {"nome":"datas_especiais","rotulo":"Datas especiais do mês","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Ex: aniversário da empresa, promoção especial..."},
    {"nome":"calendario_gerado","rotulo":"Calendário gerado","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Preenchido pelo agente de planejamento"}
  ]'::jsonb,
  'time4-planejamento-calendario'
) ON CONFLICT (organization_id, slug) DO NOTHING;

-- Embalagem: Desenvolvimento
INSERT INTO tipos_demanda (organization_id, nome, slug, categoria, tem_publicacao, fluxo_aprovacao_duplo, campos_formulario) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Desenvolvimento de Embalagem',
  'embalagem-desenvolvimento',
  'embalagem',
  false,
  true,
  '[
    {"nome":"produto","rotulo":"Produto a embalar","tipo":"text","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"Descreva o produto"},
    {"nome":"tipo_embalagem","rotulo":"Tipo de embalagem","tipo":"select","obrigatorio":true,"visivel_para_cliente":true,"opcoes":["Caixa","Sachê","Rótulo","Blister","Frasco","Bolsa","Outro"]},
    {"nome":"referencias","rotulo":"Referências visuais","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Links ou descrição de referências"},
    {"nome":"copy_embalagem","rotulo":"Copy obrigatório","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Nome do produto, slogan, ingredientes, informações legais..."},
    {"nome":"dimensoes","rotulo":"Dimensões (L × A × P mm)","tipo":"text","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Ex: 100 × 150 × 30 mm (se já definido com gráfica)"},
    {"nome":"tecnica_impressao","rotulo":"Técnica de impressão","tipo":"select","obrigatorio":false,"visivel_para_cliente":false,"opcoes":["Offset","Flexografia","Digital","Serigrafia","A definir"]},
    {"nome":"material","rotulo":"Material / substrato","tipo":"text","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Ex: papelão kraft 350g"},
    {"nome":"acabamentos","rotulo":"Acabamentos","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Laminação, verniz UV, hot stamping..."},
    {"nome":"normas","rotulo":"Normas aplicáveis","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"ANVISA, rotulagem nutricional, INMETRO..."},
    {"nome":"obs_tecnicas","rotulo":"Observações técnicas","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Especificações para arte final, sangria, área segura..."}
  ]'::jsonb
) ON CONFLICT (organization_id, slug) DO NOTHING;

-- Vídeo: Motion Graphics
INSERT INTO tipos_demanda (organization_id, nome, slug, categoria, tem_publicacao, campos_formulario) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Motion Graphics',
  'motion-graphics',
  'video',
  false,
  '[
    {"nome":"o_que_animar","rotulo":"O que animar","tipo":"textarea","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"Descreva o que deve ser animado"},
    {"nome":"duracao_segundos","rotulo":"Duração (segundos)","tipo":"number","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"Ex: 15"},
    {"nome":"referencias","rotulo":"Referências de movimento","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Links de animações de referência"},
    {"nome":"storyboard","rotulo":"Storyboard","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Descrição cena a cena (equipe)"}
  ]'::jsonb
) ON CONFLICT (organization_id, slug) DO NOTHING;

-- Relatório: Mensal de Produtividade
INSERT INTO tipos_demanda (organization_id, nome, slug, categoria, tem_publicacao, campos_formulario, agente_slug) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Relatório Mensal',
  'relatorio-mensal',
  'relatorio',
  false,
  '[
    {"nome":"periodo","rotulo":"Período de referência","tipo":"month","obrigatorio":true,"visivel_para_cliente":true,"placeholder":""},
    {"nome":"metricas_desejadas","rotulo":"Métricas prioritárias","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Ex: alcance, engajamento, taxa de conversão..."},
    {"nome":"dados_coletados","rotulo":"Dados coletados","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Preenchido automaticamente pelo sistema"},
    {"nome":"sugestoes_ia","rotulo":"Sugestões geradas","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Preenchido pelo agente de relatório"}
  ]'::jsonb,
  'time7-relatorio-mensal'
) ON CONFLICT (organization_id, slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- CLIENTE DE TESTE — desenvolvimento local
-- Remova antes de ir a produção, ou deixe para a sócia excluir via interface.
-- ---------------------------------------------------------------------------

INSERT INTO clientes (id, organization_id, nome, slug, status)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000001',
  'Tonoli Sushi',
  'tonoli-sushi',
  'ativo'
) ON CONFLICT (organization_id, slug) DO NOTHING;

INSERT INTO planos_cliente (organization_id, cliente_id, limite_demandas_mes, tipo_plano, data_inicio, data_renovacao, valor_mensal)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  20,
  'Pro',
  '2026-05-01',
  '2026-06-01',
  2500.00
) ON CONFLICT (cliente_id) DO NOTHING;

-- Cliente 2 para testar com múltiplos
INSERT INTO clientes (id, organization_id, nome, slug, status)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '00000000-0000-0000-0000-000000000001',
  'Studio Bloom',
  'studio-bloom',
  'ativo'
) ON CONFLICT (organization_id, slug) DO NOTHING;

INSERT INTO planos_cliente (organization_id, cliente_id, limite_demandas_mes, tipo_plano, data_inicio, data_renovacao, valor_mensal)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '22222222-2222-2222-2222-222222222222',
  10,
  'Starter',
  '2026-04-01',
  '2026-07-01',
  1500.00
) ON CONFLICT (cliente_id) DO NOTHING;
