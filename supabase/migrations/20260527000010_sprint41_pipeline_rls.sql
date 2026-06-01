-- ============================================================
-- Sprint 4.1 — Pipeline CRM: RLS policies + índices
-- Tabelas: prospects, interacoes_prospect
-- Acesso: exclusivo para papel 'socia'
-- ============================================================

-- ------------------------------------------------------------
-- Índices
-- ------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_prospects_org
  ON prospects(organization_id);
CREATE INDEX IF NOT EXISTS idx_prospects_stage
  ON prospects(organization_id, stage);
CREATE INDEX IF NOT EXISTS idx_prospects_responsavel
  ON prospects(organization_id, responsavel_id);
CREATE INDEX IF NOT EXISTS idx_interacoes_prospect
  ON interacoes_prospect(prospect_id, created_at DESC);

-- Busca full-text em prospects
CREATE INDEX IF NOT EXISTS idx_prospects_nome_fts
  ON prospects USING gin(to_tsvector('portuguese', nome));

-- ------------------------------------------------------------
-- RLS — prospects (socia apenas)
-- ------------------------------------------------------------

CREATE POLICY "prospects_select" ON prospects
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND is_socia()
  );

CREATE POLICY "prospects_insert" ON prospects
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = auth_organization_id()
    AND is_socia()
  );

CREATE POLICY "prospects_update" ON prospects
  FOR UPDATE TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND is_socia()
  )
  WITH CHECK (
    organization_id = auth_organization_id()
    AND is_socia()
  );

CREATE POLICY "prospects_delete" ON prospects
  FOR DELETE TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND is_socia()
  );

-- ------------------------------------------------------------
-- RLS — interacoes_prospect (socia apenas; já existia policy
-- placeholder — recriando corretamente)
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "interacoes_select" ON interacoes_prospect;
DROP POLICY IF EXISTS "interacoes_insert" ON interacoes_prospect;
DROP POLICY IF EXISTS "interacoes_delete" ON interacoes_prospect;

CREATE POLICY "interacoes_select" ON interacoes_prospect
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND is_socia()
  );

CREATE POLICY "interacoes_insert" ON interacoes_prospect
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = auth_organization_id()
    AND is_socia()
  );

CREATE POLICY "interacoes_delete" ON interacoes_prospect
  FOR DELETE TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND is_socia()
  );

-- ------------------------------------------------------------
-- Tabela de propostas geradas por IA
-- (geradas pelo Claude a partir dos dados do prospect)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS propostas (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  prospect_id     uuid        NOT NULL REFERENCES prospects(id)    ON DELETE CASCADE,
  criado_por      uuid        NOT NULL REFERENCES profiles(id),
  versao          int         NOT NULL DEFAULT 1,
  conteudo        text        NOT NULL,   -- markdown gerado pelo Claude
  tokens_input    int,
  tokens_output   int,
  enviada         boolean     NOT NULL DEFAULT false,
  enviada_em      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_propostas_prospect ON propostas(prospect_id, versao DESC);

ALTER TABLE propostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "propostas_select" ON propostas
  FOR SELECT TO authenticated
  USING (organization_id = auth_organization_id() AND is_socia());

CREATE POLICY "propostas_insert" ON propostas
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = auth_organization_id() AND is_socia());

CREATE POLICY "propostas_update" ON propostas
  FOR UPDATE TO authenticated
  USING (organization_id = auth_organization_id() AND is_socia())
  WITH CHECK (organization_id = auth_organization_id() AND is_socia());
