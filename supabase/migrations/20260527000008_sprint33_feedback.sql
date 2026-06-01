-- ============================================================================
-- Sprint 3.3 — Loop de Aprendizado
-- 2026-05-27
-- ============================================================================

-- ---------------------------------------------------------------------------
-- agent_feedback — avaliação de cada execução (thumbs up/down + comentário)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS agent_feedback (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  run_id          uuid NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  agent_id        uuid NOT NULL REFERENCES agent_catalog(id),
  cliente_id      uuid REFERENCES clientes(id) ON DELETE SET NULL,
  avaliado_por    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  avaliacao       text NOT NULL CHECK (avaliacao IN ('bom','ruim')),
  comentario      text,
  criado_em       timestamptz NOT NULL DEFAULT now(),

  UNIQUE (run_id)   -- um feedback por execução
);

-- ---------------------------------------------------------------------------
-- agent_insights — padrões extraídos via Claude por agente+cliente
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS agent_insights (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  agent_id          uuid NOT NULL REFERENCES agent_catalog(id),
  cliente_id        uuid REFERENCES clientes(id) ON DELETE SET NULL,
  resumo            text NOT NULL DEFAULT '',
  taxa_aprovacao    numeric(5,2),        -- 0–100
  total_feedbacks   integer NOT NULL DEFAULT 0,
  padroes_positivos jsonb NOT NULL DEFAULT '[]',
  padroes_negativos jsonb NOT NULL DEFAULT '[]',
  sugestoes         jsonb NOT NULL DEFAULT '[]',
  atualizado_em     timestamptz NOT NULL DEFAULT now(),

  UNIQUE (organization_id, agent_id, cliente_id)
);

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_feedback_run         ON agent_feedback(run_id);
CREATE INDEX IF NOT EXISTS idx_feedback_org_agent   ON agent_feedback(organization_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_feedback_cliente     ON agent_feedback(organization_id, agent_id, cliente_id)
  WHERE cliente_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feedback_criado      ON agent_feedback(organization_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_insights_org_agent   ON agent_insights(organization_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_insights_cliente     ON agent_insights(organization_id, cliente_id)
  WHERE cliente_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE agent_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_insights ENABLE ROW LEVEL SECURITY;

-- Feedback: equipe pode ler/inserir/atualizar
CREATE POLICY "agent_feedback_select" ON agent_feedback
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia','gestao','atendimento')
  );

CREATE POLICY "agent_feedback_insert" ON agent_feedback
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia','gestao','atendimento')
  );

CREATE POLICY "agent_feedback_update" ON agent_feedback
  FOR UPDATE TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND avaliado_por = auth.uid()
  );

-- Insights: equipe lê
CREATE POLICY "agent_insights_select" ON agent_insights
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia','gestao','atendimento')
  );

-- Service role insere/atualiza (via action do servidor)
CREATE POLICY "agent_insights_upsert" ON agent_insights
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
