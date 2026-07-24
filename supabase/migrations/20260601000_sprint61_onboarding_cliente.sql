-- =============================================================================
-- Sprint 6.1 — Onboarding de Clientes dentro do fluxo-app
-- Substitui o projeto separado (projects/onboarding) e elimina dependência do Notion.
-- Gatilho: actionConverterEmCliente() no pipeline.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Sessões de onboarding (substitui onboarding_sessions do projeto separado)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS onboarding_clientes (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid        NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  cliente_id       uuid        NOT NULL REFERENCES clientes(id)     ON DELETE CASCADE,

  -- Token público — usado na URL /onboarding/cliente/{token}
  token            uuid        NOT NULL UNIQUE DEFAULT gen_random_uuid(),

  -- Nome da empresa (injetado no system prompt da Izzi como contexto)
  client_name      text        NOT NULL,

  -- Contexto adicional do prospect (notas, segmento, objetivos — substitui Notion)
  context_extra    text,

  -- Status do fluxo
  status           text        NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending','briefing','done')),

  -- Resumo gerado pela Izzi ao finalizar (conteúdo após <briefing_finalizado/>)
  briefing_summary text,

  -- Timestamps
  enviado_em       timestamptz NOT NULL DEFAULT now(),
  finished_at      timestamptz,

  -- Um onboarding por cliente
  UNIQUE (cliente_id)
);

-- ---------------------------------------------------------------------------
-- Histórico de mensagens do chat (substitui chat_messages)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS onboarding_mensagens (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid        NOT NULL REFERENCES organizacoes(id)           ON DELETE CASCADE,
  token            uuid        NOT NULL REFERENCES onboarding_clientes(token) ON DELETE CASCADE,
  role             text        NOT NULL CHECK (role IN ('user', 'assistant')),
  content          text        NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onb_mensagens_token
  ON onboarding_mensagens(token, created_at);

-- ---------------------------------------------------------------------------
-- Avaliação pós-briefing (substitui session_feedback)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS onboarding_feedback (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizacoes(id)           ON DELETE CASCADE,
  token            uuid UNIQUE NOT NULL REFERENCES onboarding_clientes(token) ON DELETE CASCADE,
  clarity_score    int  CHECK (clarity_score    BETWEEN 1 AND 5),
  time_score       int  CHECK (time_score       BETWEEN 1 AND 5),
  relevance_score  int  CHECK (relevance_score  BETWEEN 1 AND 5),
  comment          text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE onboarding_clientes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_feedback  ENABLE ROW LEVEL SECURITY;

-- Equipe autenticada lê os onboardings da própria org (para monitorar progresso)
CREATE POLICY "onb_cli_equipe_select" ON onboarding_clientes
  FOR SELECT USING (organization_id = auth_organization_id());

-- Service role (webhook + pipeline) pode tudo — necessário para o form público e o gatilho
CREATE POLICY "onb_cli_service_all" ON onboarding_clientes
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "onb_msg_service_all" ON onboarding_mensagens
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "onb_fb_service_all" ON onboarding_feedback
  FOR ALL USING (true) WITH CHECK (true);
