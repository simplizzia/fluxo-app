-- ============================================================================
-- Email do contato do cliente — usado para auto-preencher convites de reunião
-- 2026-06-02
-- ============================================================================

ALTER TABLE onboarding_clientes ADD COLUMN IF NOT EXISTS email_contato text;
