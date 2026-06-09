-- =============================================================================
-- MRR Histórico — snapshot mensal calculado por cron
-- =============================================================================

CREATE TABLE mrr_historico (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  mes             date        NOT NULL,  -- primeiro dia do mês (ex: 2026-06-01)
  mrr             numeric(12, 2) NOT NULL DEFAULT 0,
  clientes_ativos int         NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE mrr_historico IS
  'Snapshot mensal de MRR por organização. Populado pelo cron /api/cron/snapshot-mrr.';

CREATE UNIQUE INDEX uidx_mrr_historico_org_mes ON mrr_historico(organization_id, mes);

-- RLS
ALTER TABLE mrr_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY mrr_historico_socia ON mrr_historico
  FOR ALL
  USING (organization_id = auth_organization_id() AND is_socia());
