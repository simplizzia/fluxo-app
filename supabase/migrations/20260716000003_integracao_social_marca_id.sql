-- ============================================================================
-- integracao_social.marca_id
-- 2026-07-16
--
-- A Trevo precisa de 2 contas de Instagram simultâneas (Trevo e Ehrmann) sob
-- o mesmo cliente. A tabela hoje só suporta 1 conta por plataforma por
-- cliente (índices únicos parciais de 20260608000003_integracao_social_multi_cliente.sql).
-- Adiciona marca_id e reorganiza os índices únicos em 2 casos:
--   - cliente com marca_id NULL: unicidade por (org, plataforma, cliente) — comportamento atual preservado.
--   - cliente com marca_id definido: unicidade por (org, plataforma, cliente, marca) — permite Trevo + Ehrmann convivendo.
-- ============================================================================

ALTER TABLE integracao_social
  ADD COLUMN IF NOT EXISTS marca_id uuid REFERENCES onboarding_marcas(id) ON DELETE SET NULL;

DROP INDEX IF EXISTS uidx_integracao_org_plat_cliente;

CREATE UNIQUE INDEX uidx_integracao_org_plat_cliente_sem_marca
  ON integracao_social(organization_id, plataforma, cliente_id)
  WHERE cliente_id IS NOT NULL AND marca_id IS NULL;

CREATE UNIQUE INDEX uidx_integracao_org_plat_cliente_marca
  ON integracao_social(organization_id, plataforma, cliente_id, marca_id)
  WHERE cliente_id IS NOT NULL AND marca_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_integracao_social_marca
  ON integracao_social(organization_id, marca_id)
  WHERE marca_id IS NOT NULL;

COMMENT ON COLUMN integracao_social.marca_id IS
  'Marca (onboarding_marcas) à qual esta conta/token pertence. NULL = conta única do cliente (sem hierarquia de marcas) ou conta própria da agência. Necessário para clientes multi-marca com contas separadas por marca na mesma plataforma (ex: Trevo tem Instagram Trevo + Instagram Ehrmann).';
