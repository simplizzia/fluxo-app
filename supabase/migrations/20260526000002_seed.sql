-- =============================================================================
-- Fluxo App — Seed inicial
-- Sprint 0.1 | 2026-05-26
--
-- Cria a organização Simplizzia como primeiro tenant.
-- Os usuários (sócias, equipe) serão criados via convite no Sprint 0.2.
-- =============================================================================

-- Organização Simplizzia
INSERT INTO organizacoes (
  id,
  nome,
  slug,
  assistente_nome,
  plano_saas
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Simplizzia',
  'simplizzia',
  'Izzi',
  'interno'
);

-- ---------------------------------------------------------------------------
-- Tipos de demanda iniciais (baseados em tipos-demanda.md)
-- Os campos_formulario serão populados via interface de administração.
-- Aqui apenas os registros base para o sistema funcionar.
-- ---------------------------------------------------------------------------

-- Redes Sociais
INSERT INTO tipos_demanda (organization_id, nome, slug, categoria, tem_publicacao, campos_formulario) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Post Feed', 'post-feed', 'redes_sociais', true,
    '[{"nome":"tema","tipo":"text","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"Sobre o que é o post?"},
      {"nome":"referencias_visuais","tipo":"files","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Referências de estilo, cores, etc."},
      {"nome":"cta","tipo":"text","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Call to action desejado"},
      {"nome":"legenda_desejada","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Sugestão de legenda (opcional)"}]'),

  ('00000000-0000-0000-0000-000000000001', 'Post Carrossel', 'post-carrossel', 'redes_sociais', true,
    '[{"nome":"tema","tipo":"text","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"Tema do carrossel"},
      {"nome":"num_slides","tipo":"number","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"Número de slides (sugerido)"},
      {"nome":"referencias_visuais","tipo":"files","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Referências visuais"},
      {"nome":"cta","tipo":"text","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Call to action do último slide"}]'),

  ('00000000-0000-0000-0000-000000000001', 'Reel', 'reel', 'redes_sociais', true,
    '[{"nome":"conceito","tipo":"textarea","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"Ideia ou conceito do vídeo"},
      {"nome":"duracao","tipo":"text","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Duração desejada (ex: 30s, 60s)"},
      {"nome":"referencias_video","tipo":"files","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Referências de vídeos similares"},
      {"nome":"musica","tipo":"text","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Sugestão de música ou estilo"}]'),

  ('00000000-0000-0000-0000-000000000001', 'Story', 'story', 'redes_sociais', true,
    '[{"nome":"objetivo","tipo":"select","obrigatorio":true,"visivel_para_cliente":true,"opcoes":["engajamento","cta","informativo","bastidor"]},
      {"nome":"referencias","tipo":"files","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Referências visuais"}]');

-- Estratégia e Marca
INSERT INTO tipos_demanda (organization_id, nome, slug, categoria, campos_formulario) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Brand System', 'brand-system', 'estrategia',
    '[{"nome":"objetivos_marca","tipo":"textarea","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"O que você quer que as pessoas sintam ao ver sua marca?"},
      {"nome":"referencias_visuais","tipo":"files","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Marcas que você admira"},
      {"nome":"anti_referencias","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"O que definitivamente NÃO quer"}]'),

  ('00000000-0000-0000-0000-000000000001', 'Calendário Editorial', 'calendario-editorial', 'estrategia',
    '[{"nome":"mes_referencia","tipo":"month","obrigatorio":true,"visivel_para_cliente":true},
      {"nome":"temas_prioritarios","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Temas ou datas importantes do mês"},
      {"nome":"datas_especiais","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Lançamentos, eventos, promoções"}]');

-- Embalagens (fluxo_aprovacao_duplo = true)
INSERT INTO tipos_demanda (organization_id, nome, slug, categoria, fluxo_aprovacao_duplo, campos_formulario) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Desenvolvimento de Embalagem', 'embalagem-desenvolvimento', 'embalagem', true,
    '[{"nome":"produto","tipo":"text","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"O que será embalado?"},
      {"nome":"tipo_embalagem","tipo":"select","obrigatorio":true,"visivel_para_cliente":true,"opcoes":["caixa","sachet","rotulo","blister","frasco","bolsa","outro"]},
      {"nome":"referencias_visuais","tipo":"files","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Referências de embalagens que você gosta"},
      {"nome":"copy_obrigatorio","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Textos obrigatórios: ingredientes, informações legais, slogan"},
      {"nome":"dimensoes","tipo":"text","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"L × A × P em mm (se já definido com o fornecedor gráfico)"},
      {"nome":"tecnica_impressao","tipo":"select","obrigatorio":false,"visivel_para_cliente":true,"opcoes":["offset","flexografia","digital","serigrafia","ainda_nao_sei"]}]');

-- Relatório Mensal
INSERT INTO tipos_demanda (organization_id, nome, slug, categoria, campos_formulario) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Relatório Mensal', 'relatorio-mensal', 'relatorio',
    '[{"nome":"periodo_referencia","tipo":"month","obrigatorio":true,"visivel_para_cliente":true},
      {"nome":"metricas_desejadas","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Métricas específicas que quer destacar"}]');
