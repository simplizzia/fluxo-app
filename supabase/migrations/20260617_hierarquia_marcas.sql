-- ============================================================================
-- Hierarquia de Marcas
-- 2026-06-17
--
-- Adiciona suporte a marca mãe / sub-marcas em onboarding_marcas.
-- Nenhuma linha existente quebra: defaults garantem compatibilidade total.
-- ============================================================================

ALTER TABLE onboarding_marcas
  ADD COLUMN IF NOT EXISTS marca_pai_id uuid REFERENCES onboarding_marcas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS nivel       text NOT NULL DEFAULT 'standalone';

-- nivel: 'mae' | 'sub' | 'standalone'
-- 'standalone' = marca sem hierarquia explícita (padrão para registros existentes)

COMMENT ON COLUMN onboarding_marcas.marca_pai_id IS
  'Referência à marca mãe (onboarding_marcas.id). NULL = marca raiz ou standalone.';

COMMENT ON COLUMN onboarding_marcas.nivel IS
  'Posição na hierarquia: mae (grupo/B2B), sub (sub-marca B2C), standalone (sem hierarquia).';

-- Índice para navegação pai → filhas
CREATE INDEX IF NOT EXISTS idx_onboarding_marcas_pai
  ON onboarding_marcas(marca_pai_id)
  WHERE marca_pai_id IS NOT NULL;

-- Constraint: sub-marcas devem ter marca_pai_id preenchida; marcas mãe não
ALTER TABLE onboarding_marcas
  ADD CONSTRAINT chk_hierarquia_consistente CHECK (
    (nivel = 'sub' AND marca_pai_id IS NOT NULL) OR
    (nivel IN ('mae', 'standalone') AND marca_pai_id IS NULL)
  );

-- Tipos de database.ts serão regerados via: npm run db:types
