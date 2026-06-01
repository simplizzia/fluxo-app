-- ============================================================
-- Sprint 3.4 — Izzi: chat + onboarding
-- Tables: izzi_conversas, izzi_mensagens
-- Profiles: onboarding_concluido, onboarding_passo
-- ============================================================

-- ------------------------------------------------------------
-- 1. Onboarding columns on profiles
-- ------------------------------------------------------------

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_concluido boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_passo int NOT NULL DEFAULT 0;

-- ------------------------------------------------------------
-- 2. izzi_conversas — uma conversa por sessão de chat
-- ------------------------------------------------------------

CREATE TABLE izzi_conversas (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid        NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  user_id          uuid        NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
  contexto_tipo    text        NOT NULL CHECK (contexto_tipo IN ('cliente', 'equipe')),
  -- For equipe conversations: optional focus on a specific client
  cliente_id       uuid        REFERENCES clientes(id) ON DELETE SET NULL,
  ativa            boolean     NOT NULL DEFAULT true,
  criado_em        timestamptz NOT NULL DEFAULT now(),
  atualizado_em    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_izzi_conversas_org_user
  ON izzi_conversas(organization_id, user_id);
CREATE INDEX idx_izzi_conversas_ativa
  ON izzi_conversas(organization_id, user_id, ativa);
CREATE INDEX idx_izzi_conversas_cliente
  ON izzi_conversas(organization_id, cliente_id)
  WHERE cliente_id IS NOT NULL;

ALTER TABLE izzi_conversas ENABLE ROW LEVEL SECURITY;

-- Each user can only see/modify their own conversations
CREATE POLICY "izzi_conversas_select" ON izzi_conversas
  FOR SELECT USING (
    organization_id = auth_organization_id()
    AND user_id = auth.uid()
  );

CREATE POLICY "izzi_conversas_insert" ON izzi_conversas
  FOR INSERT WITH CHECK (
    organization_id = auth_organization_id()
    AND user_id = auth.uid()
  );

CREATE POLICY "izzi_conversas_update" ON izzi_conversas
  FOR UPDATE USING (
    organization_id = auth_organization_id()
    AND user_id = auth.uid()
  );

-- ------------------------------------------------------------
-- 3. izzi_mensagens — mensagens de cada conversa
-- ------------------------------------------------------------

CREATE TABLE izzi_mensagens (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id     uuid        NOT NULL REFERENCES izzi_conversas(id) ON DELETE CASCADE,
  organization_id uuid        NOT NULL REFERENCES organizacoes(id)   ON DELETE CASCADE,
  role            text        NOT NULL CHECK (role IN ('user', 'assistant')),
  conteudo        text        NOT NULL,
  tokens_input    int,
  tokens_output   int,
  criado_em       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_izzi_mensagens_conversa
  ON izzi_mensagens(conversa_id, criado_em);
CREATE INDEX idx_izzi_mensagens_org
  ON izzi_mensagens(organization_id);

ALTER TABLE izzi_mensagens ENABLE ROW LEVEL SECURITY;

-- Users see messages of their own conversations only
CREATE POLICY "izzi_mensagens_select" ON izzi_mensagens
  FOR SELECT USING (
    organization_id = auth_organization_id()
    AND conversa_id IN (
      SELECT id FROM izzi_conversas
      WHERE user_id = auth.uid()
        AND organization_id = auth_organization_id()
    )
  );

CREATE POLICY "izzi_mensagens_insert" ON izzi_mensagens
  FOR INSERT WITH CHECK (
    organization_id = auth_organization_id()
    AND conversa_id IN (
      SELECT id FROM izzi_conversas
      WHERE user_id = auth.uid()
        AND organization_id = auth_organization_id()
    )
  );
