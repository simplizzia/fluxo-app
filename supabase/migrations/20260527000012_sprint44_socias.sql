-- =============================================================================
-- Sprint 4.4 — Área das Sócias
-- Tabelas: socias_documentos, external_share_links, colaboradores_mapa
-- já existem com RLS. Esta migration adiciona melhorias de performance.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Índices adicionais para performance
-- ---------------------------------------------------------------------------

-- Documentos: busca por área + competência
CREATE INDEX IF NOT EXISTS idx_socias_docs_area
  ON socias_documentos(organization_id, area, mes_competencia DESC);

CREATE INDEX IF NOT EXISTS idx_socias_docs_tags
  ON socias_documentos USING gin(tags);

-- Links: busca por token válido (já existe) + por criador
CREATE INDEX IF NOT EXISTS idx_share_links_criador
  ON external_share_links(organization_id, criado_por, created_at DESC);

-- Log de acesso: por link
CREATE INDEX IF NOT EXISTS idx_share_log_link
  ON external_share_access_log(link_id, acessado_em DESC);

-- Colaboradores: status + org
CREATE INDEX IF NOT EXISTS idx_colab_status
  ON colaboradores_mapa(organization_id, status);

-- Planos: data de renovação para alertas
CREATE INDEX IF NOT EXISTS idx_planos_renovacao
  ON planos_cliente(organization_id, data_renovacao);

-- ---------------------------------------------------------------------------
-- profile_id em colaboradores_mapa (para join simplificado)
-- A coluna user_id já referencia profiles(id), o nome é um pouco confuso.
-- Adicionamos um alias no comentário para clareza.
-- ---------------------------------------------------------------------------

COMMENT ON TABLE colaboradores_mapa IS
  'Mapa de colaboradores da equipe (somente sócias). user_id = profiles.id (não auth.users).';

COMMENT ON TABLE socias_documentos IS
  'Repositório privado de documentos da empresa (financeiro, jurídico, RH, etc.). Acesso restrito a sócias.';

COMMENT ON TABLE external_share_links IS
  'Links temporários para compartilhamento externo de documentos (ex: contador, advogado). Somente sócias podem criar.';
