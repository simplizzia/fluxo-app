-- ============================================================================
-- Sprint 6.4 — Marca como entidade: escopo por marca no pipeline e universo
-- 2026-06-04
-- ============================================================================
-- A entidade "marca" é a linha em onboarding_marcas (id estável, nome, público).
-- marca_id NULL = documento de nível cliente (ex: Briefing Geral, Prep de Reunião).

-- ---------------------------------------------------------------------------
-- universo_marca: escopo opcional por marca
-- ---------------------------------------------------------------------------

ALTER TABLE universo_marca
  ADD COLUMN IF NOT EXISTS marca_id uuid REFERENCES onboarding_marcas(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_universo_marca_marca
  ON universo_marca(cliente_id, marca_id);

-- ---------------------------------------------------------------------------
-- onboarding_pipeline: agora uma sequência por marca
-- ---------------------------------------------------------------------------

-- Limpa linhas de teste (todas eram de nível cliente, sem marca)
TRUNCATE onboarding_pipeline;

ALTER TABLE onboarding_pipeline
  ADD COLUMN IF NOT EXISTS marca_id uuid REFERENCES onboarding_marcas(id) ON DELETE CASCADE;

-- Troca a unicidade: (cliente, marca, etapa)
ALTER TABLE onboarding_pipeline
  DROP CONSTRAINT IF EXISTS onboarding_pipeline_cliente_id_etapa_key;

ALTER TABLE onboarding_pipeline
  ADD CONSTRAINT onboarding_pipeline_cliente_marca_etapa_key
  UNIQUE (cliente_id, marca_id, etapa);
