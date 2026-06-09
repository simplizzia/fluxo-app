-- =============================================================================
-- Social: tentativas de retry, rótulo de IA, notificação de falha
-- =============================================================================

ALTER TABLE publicacoes_agendadas
  ADD COLUMN IF NOT EXISTS tentativas int     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rotulo_ia  boolean NOT NULL DEFAULT false;

-- Novo tipo de notificação para falha de publicação
ALTER TYPE tipo_notificacao ADD VALUE IF NOT EXISTS 'publicacao_falhou';
