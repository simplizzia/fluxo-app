-- ============================================================================
-- Campo "assunto" nas reuniões — título livre para reuniões do dia a dia
-- 2026-06-02
-- ============================================================================

ALTER TABLE reunioes ADD COLUMN IF NOT EXISTS assunto text;
