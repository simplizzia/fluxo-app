-- =============================================================================
-- Fluxo App — Sprint 2.3: Customer Success — Health Score + Alertas
-- =============================================================================

-- Habilita Realtime para health_scores (para futuras atualizações ao vivo)
ALTER TABLE health_scores REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE health_scores;

-- Índice para busca eficiente das últimas N scores por cliente
-- (substituí o existente idx_health_scores_cliente_data com o mesmo padrão)
-- Já existe: idx_health_scores_cliente_data ON health_scores(organization_id, cliente_id, calculado_em DESC)

-- Índice para buscar cards para_aprovacao antigos (alerta de aprovação atrasada)
CREATE INDEX IF NOT EXISTS idx_cards_para_aprovacao_updated
  ON cards(organization_id, cliente_id, updated_at)
  WHERE status = 'para_aprovacao';

-- Índice para contagem de cards por cliente no mês (uso do plano no cron)
CREATE INDEX IF NOT EXISTS idx_cards_created_cliente_mes
  ON cards(organization_id, cliente_id, created_at)
  WHERE status != 'cancelado';
