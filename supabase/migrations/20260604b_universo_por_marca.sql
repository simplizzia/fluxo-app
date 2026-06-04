-- ============================================================================
-- Sprint 6.4b — Universo da Marca por marca (identidade visual + moodboard)
-- 2026-06-04
-- ============================================================================

-- marca_id em ativos de identidade visual e moodboard (null = nível cliente)
ALTER TABLE identidade_visual_ativos
  ADD COLUMN IF NOT EXISTS marca_id uuid REFERENCES onboarding_marcas(id) ON DELETE CASCADE;

ALTER TABLE moodboard_items
  ADD COLUMN IF NOT EXISTS marca_id uuid REFERENCES onboarding_marcas(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_ativos_marca ON identidade_visual_ativos(cliente_id, marca_id);
CREATE INDEX IF NOT EXISTS idx_moodboard_marca ON moodboard_items(cliente_id, marca_id);

-- ---------------------------------------------------------------------------
-- Limpeza: no novo modelo, os únicos documentos de NÍVEL CLIENTE em
-- universo_marca são os da Izzi (Prep de Reunião / Briefing Geral). Qualquer
-- outro doc client-level (marca_id NULL) é resíduo de testes anteriores
-- (ex.: Personas misturando as marcas) e deve ser removido.
-- ---------------------------------------------------------------------------

DELETE FROM universo_marca
WHERE marca_id IS NULL
  AND COALESCE(subcategoria, '') NOT IN ('prep_reuniao', 'briefing_completo');
