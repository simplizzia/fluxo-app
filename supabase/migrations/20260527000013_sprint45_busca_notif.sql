-- =============================================================================
-- Sprint 4.5 — Busca Full-Text + Notificações In-App
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. pg_trgm extension (case-insensitive fuzzy search)
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- 2. Índices de busca full-text adicionais
-- ---------------------------------------------------------------------------

-- Reuniões: buscar pelo contexto
CREATE INDEX IF NOT EXISTS idx_reunioes_notas_fts
  ON reunioes USING gin(to_tsvector('portuguese', coalesce(notas_brutas, '')));

-- Universo da marca: buscar por título e conteúdo
CREATE INDEX IF NOT EXISTS idx_universo_titulo_fts
  ON universo_marca USING gin(to_tsvector('portuguese', titulo));

-- pg_trgm indexes para busca por substring (ilike eficiente)
CREATE INDEX IF NOT EXISTS idx_cards_titulo_trgm
  ON cards USING gin(titulo gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_clientes_nome_trgm
  ON clientes USING gin(nome gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- 3. Notificações in-app
-- ---------------------------------------------------------------------------

CREATE TYPE tipo_notificacao AS ENUM (
  'card_para_aprovacao',
  'card_concluido',
  'card_necessita_ajustes',
  'prazo_proximo',
  'prazo_vencido',
  'plano_80_porcento',
  'nova_avaliacao',
  'action_item_pendente',
  'geral'
);

CREATE TABLE in_app_notificacoes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  usuario_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tipo            tipo_notificacao NOT NULL DEFAULT 'geral',
  titulo          text NOT NULL,
  mensagem        text,
  link            text,       -- URL de destino ao clicar
  lida            boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE in_app_notificacoes ENABLE ROW LEVEL SECURITY;

-- Cada usuário vê apenas as próprias notificações
CREATE POLICY "notif_inapp_own_select" ON in_app_notificacoes
  FOR SELECT USING (
    organization_id = auth_organization_id()
    AND usuario_id = auth_profile_id()
  );

CREATE POLICY "notif_inapp_own_update" ON in_app_notificacoes
  FOR UPDATE USING (
    organization_id = auth_organization_id()
    AND usuario_id = auth_profile_id()
  );

-- Sistema insere via service role (sem policy INSERT para usuário)

-- Índices de performance
CREATE INDEX idx_notif_inapp_usuario ON in_app_notificacoes(usuario_id, lida, created_at DESC);
CREATE INDEX idx_notif_inapp_org ON in_app_notificacoes(organization_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 4. Adicionar canal_inapp em notification_preferences
-- ---------------------------------------------------------------------------

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS canal_inapp boolean NOT NULL DEFAULT true;

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS digest_diario boolean NOT NULL DEFAULT false;
