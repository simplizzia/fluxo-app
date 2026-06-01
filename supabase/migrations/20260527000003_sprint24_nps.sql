-- =============================================================================
-- Fluxo App — Sprint 2.4: NPS + Avaliações de Colaboradores
-- =============================================================================

-- Tabelas já existem: avaliacoes_cliente, avaliacoes_colaborador
-- RLS já configurada em 20260526000004_rls_granular.sql

-- Índice para busca por token único (rota pública sem login)
CREATE UNIQUE INDEX IF NOT EXISTS idx_avaliacoes_token
  ON avaliacoes_cliente(token_unico);

-- Índice para histórico por cliente (dashboard NPS)
CREATE INDEX IF NOT EXISTS idx_avaliacoes_cliente_data
  ON avaliacoes_cliente(organization_id, cliente_id, enviado_em DESC);

-- Índice para avaliações de colaboradores
CREATE INDEX IF NOT EXISTS idx_avaliacoes_colab_org
  ON avaliacoes_colaborador(organization_id, colaborador_id, created_at DESC);

-- Política para UPDATE via token (rota pública usa service_role, não precisa de policy)
-- Mas adicionamos política de SELECT para o próprio cliente ver sua avaliação
-- (opcional — por enquanto só socia/atendimento veem as respostas)
