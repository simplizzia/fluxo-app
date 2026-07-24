-- ===========================================================================
-- Cronogramas — planejamento editorial por marca/mês, revisável, desmembravel
-- 2026-07-24
--
-- Substitui o fluxo atual (cronograma como textao de IA colado num card) pelo
-- modelo descrito em docs/superpowers/specs/2026-07-24-fluxo-cronograma-design.md.
-- Um cronograma e de uma marca, para um mes; cada item e um post; as mensagens
-- guardam o chat das rodadas de revisao.
-- ===========================================================================

CREATE TYPE status_cronograma AS ENUM (
  'rascunho',     -- agentes gerando
  'em_revisao',   -- equipe ajustando na tela de revisao
  'aprovado',     -- pronto para virar cards
  'desmembrado'   -- ja gerou os cards
);

CREATE TYPE viabilidade_item AS ENUM (
  'proposta',          -- pronto como esta
  'roteiro_a_fechar',  -- depende de roteiro (ex: video Tio Brother)
  'so_ia',             -- so viavel via IA generativa
  'depende_registro'   -- depende de registro fotografico/producao
);

-- ---------------------------------------------------------------------------
-- cronogramas
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cronogramas (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  cliente_id        uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  marca_id          uuid NOT NULL REFERENCES onboarding_marcas(id) ON DELETE CASCADE,

  mes_referencia    date NOT NULL,   -- primeiro dia do mes
  status            status_cronograma NOT NULL DEFAULT 'rascunho',

  -- Saidas das etapas de agente (texto/estruturado por etapa)
  briefing          jsonb NOT NULL DEFAULT '{}',
  temas_pilares     jsonb NOT NULL DEFAULT '{}',
  analise_coerencia jsonb NOT NULL DEFAULT '{}',

  card_origem_id    uuid REFERENCES cards(id) ON DELETE SET NULL,
  criado_por        uuid REFERENCES profiles(id) ON DELETE SET NULL,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  UNIQUE (organization_id, marca_id, mes_referencia)
);

CREATE INDEX IF NOT EXISTS idx_cronogramas_marca
  ON cronogramas(organization_id, marca_id);
CREATE INDEX IF NOT EXISTS idx_cronogramas_cliente_mes
  ON cronogramas(organization_id, cliente_id, mes_referencia DESC);

CREATE TRIGGER set_cronogramas_updated_at
  BEFORE UPDATE ON cronogramas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- cronograma_itens — um post
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cronograma_itens (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  cronograma_id     uuid NOT NULL REFERENCES cronogramas(id) ON DELETE CASCADE,

  data_publicacao   date,
  horario           time,
  pilar             text,
  -- Sub-marca do post: num mes intercalado, cada item pode ser de uma marca
  -- diferente da marca-mae do cronograma.
  marca_id          uuid REFERENCES onboarding_marcas(id) ON DELETE SET NULL,
  produto_id        uuid REFERENCES produtos(id) ON DELETE SET NULL,
  formato           text,            -- reel / carrossel / estatico / story / video
  tema              text,
  legenda           text,
  viabilidade       viabilidade_item NOT NULL DEFAULT 'proposta',
  pendencia         text,            -- o que falta quando viabilidade != proposta
  detalhamento      jsonb NOT NULL DEFAULT '{}',  -- angulo, referencia visual, cuidados
  ordem             integer NOT NULL DEFAULT 0,    -- posicao no arco de sequenciamento

  -- Preenchido no desmembramento; e a guarda de idempotencia.
  card_id           uuid REFERENCES cards(id) ON DELETE SET NULL,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cronograma_itens_cronograma
  ON cronograma_itens(cronograma_id, ordem);

CREATE TRIGGER set_cronograma_itens_updated_at
  BEFORE UPDATE ON cronograma_itens
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- cronograma_mensagens — chat da revisao
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cronograma_mensagens (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  cronograma_id     uuid NOT NULL REFERENCES cronogramas(id) ON DELETE CASCADE,

  papel             text NOT NULL CHECK (papel IN ('equipe', 'agente')),
  autor_id          uuid REFERENCES profiles(id) ON DELETE SET NULL,
  conteudo          text NOT NULL,
  itens_afetados    jsonb NOT NULL DEFAULT '[]',  -- ids de cronograma_itens

  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cronograma_mensagens_cronograma
  ON cronograma_mensagens(cronograma_id, created_at);

-- ---------------------------------------------------------------------------
-- RLS — Regra #1. Cronograma em construcao e coisa de equipe; cliente nao acessa.
-- ---------------------------------------------------------------------------
ALTER TABLE cronogramas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cronograma_itens     ENABLE ROW LEVEL SECURITY;
ALTER TABLE cronograma_mensagens ENABLE ROW LEVEL SECURITY;

-- Leitura: toda a equipe. Escrita: socia, gestao, atendimento (nao executor).
CREATE POLICY "cronogramas_select_equipe" ON cronogramas
  FOR SELECT TO authenticated
  USING (organization_id = auth_organization_id()
         AND auth_papel() IN ('socia','gestao','atendimento','executor'));
CREATE POLICY "cronogramas_write_equipe" ON cronogramas
  FOR ALL TO authenticated
  USING (organization_id = auth_organization_id()
         AND auth_papel() IN ('socia','gestao','atendimento'))
  WITH CHECK (organization_id = auth_organization_id()
         AND auth_papel() IN ('socia','gestao','atendimento'));

CREATE POLICY "cronograma_itens_select_equipe" ON cronograma_itens
  FOR SELECT TO authenticated
  USING (organization_id = auth_organization_id()
         AND auth_papel() IN ('socia','gestao','atendimento','executor'));
CREATE POLICY "cronograma_itens_write_equipe" ON cronograma_itens
  FOR ALL TO authenticated
  USING (organization_id = auth_organization_id()
         AND auth_papel() IN ('socia','gestao','atendimento'))
  WITH CHECK (organization_id = auth_organization_id()
         AND auth_papel() IN ('socia','gestao','atendimento'));

CREATE POLICY "cronograma_mensagens_select_equipe" ON cronograma_mensagens
  FOR SELECT TO authenticated
  USING (organization_id = auth_organization_id()
         AND auth_papel() IN ('socia','gestao','atendimento','executor'));
CREATE POLICY "cronograma_mensagens_write_equipe" ON cronograma_mensagens
  FOR ALL TO authenticated
  USING (organization_id = auth_organization_id()
         AND auth_papel() IN ('socia','gestao','atendimento'))
  WITH CHECK (organization_id = auth_organization_id()
         AND auth_papel() IN ('socia','gestao','atendimento'));

COMMENT ON TABLE cronogramas IS
  'Planejamento editorial de uma marca para um mes. Gerado por agentes, revisado pela equipe (tela de revisao + chat) e desmembrado em cards. Ver spec 2026-07-24-fluxo-cronograma-design.';
