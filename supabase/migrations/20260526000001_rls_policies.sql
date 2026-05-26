-- =============================================================================
-- Fluxo App — RLS Policies
-- Sprint 0.1 | 2026-05-26
--
-- ATENÇÃO: Este arquivo habilita RLS em todas as tabelas.
-- As policies placeholder permitem acesso apenas a usuários autenticados
-- da mesma organização. As policies granulares por papel serão
-- implementadas no Sprint 0.2.
--
-- REGRA BASE: todo acesso filtra por organization_id do JWT.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper function: extrair organization_id do JWT
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth_organization_id()
RETURNS uuid AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'organization_id')::uuid,
    (SELECT organization_id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper function: papel do usuário atual
CREATE OR REPLACE FUNCTION auth_papel()
RETURNS papel_usuario AS $$
  SELECT papel FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper function: verificar se é sócia
CREATE OR REPLACE FUNCTION is_socia()
RETURNS boolean AS $$
  SELECT auth_papel() = 'socia';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- Habilitar RLS em todas as tabelas
-- ---------------------------------------------------------------------------

ALTER TABLE organizacoes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE planos_cliente            ENABLE ROW LEVEL SECURITY;
ALTER TABLE contatos_cliente          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_demanda             ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE comentarios               ENABLE ROW LEVEL SECURITY;
ALTER TABLE arquivos                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE aprovacoes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_status_history       ENABLE ROW LEVEL SECURITY;
ALTER TABLE universo_marca            ENABLE ROW LEVEL SECURITY;
ALTER TABLE identidade_visual_ativos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE moodboard_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE padroes_cliente           ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_scores             ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacoes_cliente        ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacoes_colaborador    ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE interacoes_prospect       ENABLE ROW LEVEL SECURITY;
ALTER TABLE reunioes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items_reuniao      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences  ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules          ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE socias_documentos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_share_links      ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_share_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE colaboradores_mapa        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE pii_scan_log              ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges_definicoes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges_conquistados       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pontuacao_mensal          ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- POLICIES — Sprint 0.1 (placeholder: mesma organização = acesso)
-- Serão substituídas por policies granulares por papel no Sprint 0.2
-- ---------------------------------------------------------------------------

-- organizacoes: usuário vê somente sua organização
CREATE POLICY "org_select" ON organizacoes
  FOR SELECT USING (id = auth_organization_id());

-- profiles: usuário vê profiles da sua organização
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (organization_id = auth_organization_id());

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (user_id = auth.uid());

-- Macro: para tabelas com organization_id, acesso básico = mesma org
-- (Sprint 0.2 vai subdividir em policies por papel)

-- clientes
CREATE POLICY "clientes_org" ON clientes
  FOR ALL USING (organization_id = auth_organization_id());

-- planos_cliente
CREATE POLICY "planos_org" ON planos_cliente
  FOR ALL USING (organization_id = auth_organization_id());

-- contatos_cliente
CREATE POLICY "contatos_org" ON contatos_cliente
  FOR ALL USING (organization_id = auth_organization_id());

-- tipos_demanda
CREATE POLICY "tipos_demanda_org" ON tipos_demanda
  FOR ALL USING (organization_id = auth_organization_id());

-- cards — regra básica: mesma org (Sprint 0.2 vai filtrar por papel, confidencial, etc.)
CREATE POLICY "cards_org" ON cards
  FOR ALL USING (organization_id = auth_organization_id());

-- comentarios
CREATE POLICY "comentarios_org" ON comentarios
  FOR ALL USING (organization_id = auth_organization_id());

-- arquivos
CREATE POLICY "arquivos_org" ON arquivos
  FOR ALL USING (organization_id = auth_organization_id());

-- aprovacoes
CREATE POLICY "aprovacoes_org" ON aprovacoes
  FOR ALL USING (organization_id = auth_organization_id());

-- card_status_history
CREATE POLICY "card_history_org" ON card_status_history
  FOR ALL USING (organization_id = auth_organization_id());

-- universo_marca
CREATE POLICY "universo_marca_org" ON universo_marca
  FOR ALL USING (organization_id = auth_organization_id());

-- identidade_visual_ativos
CREATE POLICY "ident_visual_org" ON identidade_visual_ativos
  FOR ALL USING (organization_id = auth_organization_id());

-- moodboard_items
CREATE POLICY "moodboard_org" ON moodboard_items
  FOR ALL USING (organization_id = auth_organization_id());

-- padroes_cliente
CREATE POLICY "padroes_org" ON padroes_cliente
  FOR ALL USING (organization_id = auth_organization_id());

-- health_scores
CREATE POLICY "health_scores_org" ON health_scores
  FOR ALL USING (organization_id = auth_organization_id());

-- avaliacoes_cliente
CREATE POLICY "aval_cliente_org" ON avaliacoes_cliente
  FOR ALL USING (organization_id = auth_organization_id());
-- Acesso especial: token único (sem login, para responder NPS)
CREATE POLICY "aval_cliente_token" ON avaliacoes_cliente
  FOR UPDATE USING (token_unico IS NOT NULL);

-- avaliacoes_colaborador — SOMENTE sócias
CREATE POLICY "aval_colab_socia_only" ON avaliacoes_colaborador
  FOR ALL USING (
    organization_id = auth_organization_id()
    AND is_socia()
  );

-- prospects — SOMENTE sócias (Sprint 0.2 permite atendimento registrar notas)
CREATE POLICY "prospects_socia_only" ON prospects
  FOR ALL USING (
    organization_id = auth_organization_id()
    AND is_socia()
  );

-- interacoes_prospect
CREATE POLICY "interacoes_prospect_org" ON interacoes_prospect
  FOR ALL USING (organization_id = auth_organization_id());

-- reunioes
CREATE POLICY "reunioes_org" ON reunioes
  FOR ALL USING (organization_id = auth_organization_id());

-- action_items_reuniao
CREATE POLICY "action_items_org" ON action_items_reuniao
  FOR ALL USING (organization_id = auth_organization_id());

-- notification_preferences — usuário vê somente as suas
CREATE POLICY "notif_prefs_own" ON notification_preferences
  FOR ALL USING (
    organization_id = auth_organization_id()
    AND usuario_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
  );

-- automation_rules
CREATE POLICY "automation_rules_org" ON automation_rules
  FOR ALL USING (organization_id = auth_organization_id());

-- automation_logs
CREATE POLICY "automation_logs_org" ON automation_logs
  FOR ALL USING (organization_id = auth_organization_id());

-- socias_documentos — SOMENTE sócias
CREATE POLICY "socias_docs_socia_only" ON socias_documentos
  FOR ALL USING (
    organization_id = auth_organization_id()
    AND is_socia()
  );

-- external_share_links — SOMENTE sócias
CREATE POLICY "share_links_socia_only" ON external_share_links
  FOR ALL USING (
    organization_id = auth_organization_id()
    AND is_socia()
  );

-- external_share_access_log — SOMENTE sócias
CREATE POLICY "share_log_socia_only" ON external_share_access_log
  FOR ALL USING (
    organization_id = auth_organization_id()
    AND is_socia()
  );

-- colaboradores_mapa — SOMENTE sócias
CREATE POLICY "colab_mapa_socia_only" ON colaboradores_mapa
  FOR ALL USING (
    organization_id = auth_organization_id()
    AND is_socia()
  );

-- audit_log — SOMENTE sócias (leitura); sistema escreve via service role
CREATE POLICY "audit_log_socia_select" ON audit_log
  FOR SELECT USING (
    organization_id = auth_organization_id()
    AND is_socia()
  );

-- pii_scan_log — SOMENTE sócias
CREATE POLICY "pii_scan_socia_only" ON pii_scan_log
  FOR ALL USING (
    organization_id = auth_organization_id()
    AND is_socia()
  );

-- badges_definicoes
CREATE POLICY "badges_def_org" ON badges_definicoes
  FOR ALL USING (organization_id = auth_organization_id());

-- badges_conquistados
CREATE POLICY "badges_conq_org" ON badges_conquistados
  FOR ALL USING (organization_id = auth_organization_id());

-- pontuacao_mensal
CREATE POLICY "pontuacao_org" ON pontuacao_mensal
  FOR ALL USING (organization_id = auth_organization_id());
