-- =============================================================================
-- Sprint 5.5 — Gamificação
-- badges_definicoes, badges_conquistados, pontuacao_mensal
-- =============================================================================

-- ---------------------------------------------------------------------------
-- badges_definicoes — catálogo de badges por organização
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS badges_definicoes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,

  nome            text NOT NULL,
  descricao       text NOT NULL,
  icone           text NOT NULL DEFAULT '🏆',  -- emoji

  tipo            text NOT NULL CHECK (tipo IN ('colaborador', 'cliente')),

  -- JSON: {"tipo": "aprovacao_primeira", "quantidade": 1}
  criterios       jsonb NOT NULL DEFAULT '{}',

  -- Benefício descrito pela sócia (ex.: "1 hora de mentoria")
  beneficio_descricao text,

  ativo           boolean NOT NULL DEFAULT true,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE badges_definicoes ENABLE ROW LEVEL SECURITY;

-- Socia: CRUD completo
CREATE POLICY "badges_def_socia_all" ON badges_definicoes
  FOR ALL USING (
    organization_id = auth_organization_id()
    AND is_socia()
  );

-- Equipe + cliente: leitura de badges ativos
CREATE POLICY "badges_def_read" ON badges_definicoes
  FOR SELECT USING (
    organization_id = auth_organization_id()
    AND ativo = true
  );

CREATE INDEX IF NOT EXISTS idx_badges_def_org ON badges_definicoes(organization_id);

-- ---------------------------------------------------------------------------
-- badges_conquistados — registro das conquistas por usuário
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS badges_conquistados (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,

  usuario_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id        uuid NOT NULL REFERENCES badges_definicoes(id) ON DELETE CASCADE,

  -- Card que disparou a conquista (nullable — algumas são mensais)
  card_id         uuid REFERENCES cards(id) ON DELETE SET NULL,

  conquistado_em  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (organization_id, usuario_id, badge_id, card_id)
);

ALTER TABLE badges_conquistados ENABLE ROW LEVEL SECURITY;

-- Socia: lê todos da org
CREATE POLICY "badges_conq_socia_read" ON badges_conquistados
  FOR SELECT USING (
    organization_id = auth_organization_id()
    AND is_socia()
  );

-- Cada usuário vê seus próprios
CREATE POLICY "badges_conq_self" ON badges_conquistados
  FOR SELECT USING (
    organization_id = auth_organization_id()
    AND usuario_id = auth.uid()
  );

-- Service role insere (via cron/trigger)
CREATE POLICY "badges_conq_service_insert" ON badges_conquistados
  FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_badges_conq_usuario ON badges_conquistados(organization_id, usuario_id);
CREATE INDEX IF NOT EXISTS idx_badges_conq_badge ON badges_conquistados(badge_id);

-- ---------------------------------------------------------------------------
-- pontuacao_mensal — pontuação agregada por usuário por mês
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pontuacao_mensal (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,

  usuario_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mes_referencia  date NOT NULL,   -- primeiro dia do mês: "2026-05-01"
  pontos          integer NOT NULL DEFAULT 0,

  -- JSON com breakdown por conquista: [{"badge": "Velocidade", "pontos": 10}, ...]
  detalhes        jsonb NOT NULL DEFAULT '[]',

  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (organization_id, usuario_id, mes_referencia)
);

ALTER TABLE pontuacao_mensal ENABLE ROW LEVEL SECURITY;

-- Socia vê todos
CREATE POLICY "pontuacao_socia_read" ON pontuacao_mensal
  FOR SELECT USING (
    organization_id = auth_organization_id()
    AND is_socia()
  );

-- Usuário vê própria pontuação
CREATE POLICY "pontuacao_self" ON pontuacao_mensal
  FOR SELECT USING (
    organization_id = auth_organization_id()
    AND usuario_id = auth.uid()
  );

-- Service role pode inserir/atualizar
CREATE POLICY "pontuacao_service_upsert" ON pontuacao_mensal
  FOR ALL WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_pontuacao_usuario ON pontuacao_mensal(organization_id, usuario_id);
CREATE INDEX IF NOT EXISTS idx_pontuacao_mes ON pontuacao_mensal(organization_id, mes_referencia);

-- ---------------------------------------------------------------------------
-- Seed de badges padrão para organizações existentes
-- (executado uma única vez via SQL; idempotente graças ao WHERE NOT EXISTS)
-- ---------------------------------------------------------------------------
INSERT INTO badges_definicoes (organization_id, nome, descricao, icone, tipo, criterios, beneficio_descricao)
SELECT
  o.id,
  b.nome,
  b.descricao,
  b.icone,
  b.tipo::tipo_badge,
  b.criterios::jsonb,
  b.beneficio_descricao
FROM organizacoes o
CROSS JOIN (VALUES
  ('Aprovação de Primeira',  'Card aprovado pelo cliente sem nenhuma rodada de revisão', '⭐', 'colaborador', '{"tipo":"aprovacao_primeira"}',       'Reconhecimento em reunião da equipe'),
  ('Entrega Veloz',          'Card entregue 2+ dias antes do prazo programado',          '⚡', 'colaborador', '{"tipo":"velocidade","dias_antes":2}',  'Saída 1h mais cedo na sexta'),
  ('Zero Reproves',          'Nenhum card com necessita_ajustes no mês',                 '🎯', 'colaborador', '{"tipo":"zero_reproves"}',              'Gift card R$50'),
  ('Resposta Relâmpago',     'Aprovação feita em menos de 24h após envio',               '🚀', 'cliente',     '{"tipo":"resposta_rapida","horas":24}', NULL),
  ('Brief Completo',         'Card criado sem passar por aguardando_info',                '📋', 'cliente',     '{"tipo":"brief_completo"}',             NULL)
) AS b(nome, descricao, icone, tipo, criterios, beneficio_descricao)
WHERE NOT EXISTS (
  SELECT 1 FROM badges_definicoes bd
  WHERE bd.organization_id = o.id
    AND bd.nome = b.nome
);
