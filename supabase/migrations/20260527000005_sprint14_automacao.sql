-- =============================================================================
-- Fluxo App — Sprint 1.4: Motor de Automação
-- 2026-05-27
--
-- Entregáveis:
--   1. UNIQUE constraint em automation_rules(organization_id, gatilho)
--   2. Seed das 11 regras padrão para cada organização existente
--   3. Índices para queries dos crons de automação
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. UNIQUE constraint — evita regras duplicadas por gatilho/org
-- ---------------------------------------------------------------------------

ALTER TABLE automation_rules
  ADD CONSTRAINT uq_automation_rules_org_gatilho
  UNIQUE (organization_id, gatilho);

-- ---------------------------------------------------------------------------
-- 2. Índices de desempenho para os crons
-- ---------------------------------------------------------------------------

-- Cards em andamento sem atualização (Regra 2)
CREATE INDEX IF NOT EXISTS idx_cards_em_andamento_updated
  ON cards(organization_id, updated_at)
  WHERE status = 'em_andamento';

-- Cards necessita_ajustes sem nova versão (Regra 6)
CREATE INDEX IF NOT EXISTS idx_cards_necessita_ajustes_updated
  ON cards(organization_id, updated_at)
  WHERE status = 'necessita_ajustes';

-- Planos com renovação próxima (Regra 10)
CREATE INDEX IF NOT EXISTS idx_planos_data_renovacao
  ON planos_cliente(organization_id, data_renovacao);

-- Automation logs para o painel admin
CREATE INDEX IF NOT EXISTS idx_automation_logs_org_data
  ON automation_logs(organization_id, executado_em DESC);

CREATE INDEX IF NOT EXISTS idx_automation_logs_rule_data
  ON automation_logs(rule_id, executado_em DESC);

-- ---------------------------------------------------------------------------
-- 3. Seed — 11 regras padrão para cada organização existente
-- ---------------------------------------------------------------------------

INSERT INTO automation_rules
  (organization_id, nome, descricao, gatilho, condicoes, acoes, ativa)
SELECT
  o.id,
  r.nome,
  r.descricao,
  r.gatilho,
  r.condicoes,
  r.acoes,
  true
FROM organizacoes o
CROSS JOIN (VALUES
  (
    'Lembrete: Aguardando informações',
    'Card em "Aguardando informações" há 48h+ → notifica atendimento e envia lembrete ao responsável do cliente',
    'aguardando_info_48h',
    '{"horas_limite": 48, "anti_spam_horas": 24}'::jsonb,
    '["email.atendimento", "email.responsavel_cliente"]'::jsonb
  ),
  (
    'Alerta: Card em andamento parado',
    'Card em "Em andamento" sem atualização há 72h → alerta para gestão',
    'em_andamento_72h',
    '{"horas_limite": 72, "anti_spam_horas": 24}'::jsonb,
    '["email.gestao", "email.socia", "email.atendimento"]'::jsonb
  ),
  (
    'Notificação: Card enviado para aprovação',
    'Card vai para "Para aprovação" → e-mail automático ao responsável do cliente com link de aprovação',
    'para_aprovacao_email',
    '{}'::jsonb,
    '["email.responsavel_cliente"]'::jsonb
  ),
  (
    'Ação: Cliente aprova conteúdo',
    'Cliente aprova → card vai para "Concluído" + incrementa uso do plano automaticamente',
    'cliente_aprova',
    '{}'::jsonb,
    '["status.concluido", "plano.incrementar"]'::jsonb
  ),
  (
    'Ação: Cliente reprova conteúdo',
    'Cliente reprova → card vai para "Necessita de ajustes" + feedback do cliente copiado como comentário',
    'cliente_reprova',
    '{}'::jsonb,
    '["status.necessita_ajustes", "comentario.copiar"]'::jsonb
  ),
  (
    'Lembrete: Ajustes pendentes',
    'Card em "Necessita de ajustes" há 24h sem nova versão → lembrete ao responsável pela execução',
    'necessita_ajustes_24h',
    '{"horas_limite": 24, "anti_spam_horas": 24}'::jsonb,
    '["email.responsavel"]'::jsonb
  ),
  (
    'Alerta: Plano em 80%',
    'Uso do plano atinge 80% do limite mensal → notificação para gestão e sócia',
    'plano_80_pct',
    '{"porcentagem": 80}'::jsonb,
    '["email.socia", "email.atendimento"]'::jsonb
  ),
  (
    'Alerta: Plano em 100%',
    'Uso do plano atinge 100% do limite mensal → alerta urgente para sócia',
    'plano_100_pct',
    '{"porcentagem": 100}'::jsonb,
    '["email.socia", "email.atendimento"]'::jsonb
  ),
  (
    'Ciclo: Relatório mensal',
    'Dia 25 de cada mês → disparo automático do ciclo de relatório mensal por cliente',
    'relatorio_mensal_dia25',
    '{"dia": 25}'::jsonb,
    '["relatorio.gerar"]'::jsonb
  ),
  (
    'Alerta: Plano expirando',
    'Plano/contrato do cliente expira em 45 dias → alerta para sócia renovar ou contatar o cliente',
    'contrato_expirando_30d',
    '{"dias_aviso": 45, "anti_spam_dias": 7}'::jsonb,
    '["email.socia"]'::jsonb
  ),
  (
    'Ciclo: NPS mensal',
    'Dia 5 de cada mês → disparar pesquisa NPS para responsáveis de clientes ativos',
    'nps_mensal',
    '{"dia": 5}'::jsonb,
    '["email.responsavel_cliente", "avaliacao.criar"]'::jsonb
  )
) AS r(nome, descricao, gatilho, condicoes, acoes)
ON CONFLICT (organization_id, gatilho) DO NOTHING;
