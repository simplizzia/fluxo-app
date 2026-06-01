-- =============================================================================
-- Integração Google Calendar
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tokens OAuth2 do Google por usuário
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  usuario_id      uuid        NOT NULL REFERENCES profiles(id)     ON DELETE CASCADE UNIQUE,
  access_token    text        NOT NULL,
  refresh_token   text        NOT NULL,
  token_expiry    timestamptz NOT NULL,
  google_email    text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_google_tokens_usuario
  ON google_calendar_tokens(usuario_id);

CREATE INDEX IF NOT EXISTS idx_google_tokens_org
  ON google_calendar_tokens(organization_id);

-- RLS: cada usuário vê apenas seus próprios tokens
ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "google_tokens_select_own" ON google_calendar_tokens
  FOR SELECT USING (
    usuario_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Service role cuida dos writes (callback OAuth + refresh automático)
-- Usuário comum não tem INSERT/UPDATE/DELETE direto.

-- ---------------------------------------------------------------------------
-- 2. ID do evento Google Calendar na tabela de reuniões
-- ---------------------------------------------------------------------------

ALTER TABLE reunioes
  ADD COLUMN IF NOT EXISTS google_event_id text;

COMMENT ON COLUMN reunioes.google_event_id IS
  'ID do evento criado no Google Calendar do criador da reunião. '
  'Null se o criador não tiver Google Calendar conectado.';
