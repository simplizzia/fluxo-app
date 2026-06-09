-- =============================================================================
-- integracao_social: suporte multi-cliente
-- Cada cliente pode ter suas próprias credenciais por plataforma.
-- cliente_id IS NULL = conta própria da agência.
-- =============================================================================

ALTER TABLE integracao_social
  ADD COLUMN cliente_id uuid REFERENCES clientes(id) ON DELETE CASCADE;

-- Remove o UNIQUE constraint original (só cobria org + plataforma)
ALTER TABLE integracao_social
  DROP CONSTRAINT integracao_social_organization_id_plataforma_key;

-- Índice único para contas da agência (cliente_id IS NULL)
CREATE UNIQUE INDEX uidx_integracao_org_plat_agencia
  ON integracao_social(organization_id, plataforma)
  WHERE cliente_id IS NULL;

-- Índice único para contas de clientes
CREATE UNIQUE INDEX uidx_integracao_org_plat_cliente
  ON integracao_social(organization_id, plataforma, cliente_id)
  WHERE cliente_id IS NOT NULL;

-- Índice de lookup por cliente
CREATE INDEX idx_integracao_social_cliente
  ON integracao_social(organization_id, cliente_id)
  WHERE cliente_id IS NOT NULL;
