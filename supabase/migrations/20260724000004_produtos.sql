-- ===========================================================================
-- produtos — catalogo de produtos/SKUs por marca
-- 2026-07-24
--
-- Ate aqui os produtos de um cliente viviam em planilha externa, coladas a mao
-- no briefing de cada cronograma. O cronograma da Ehrmann de agosto (14/07)
-- mostra por que isso custa caro: 5 rodadas de ajuste envolveram produto —
-- SKU repetido entre posts, edicao de Copa que devia sair, Apreciare Fit ainda
-- nao lancado, Copo Coalhada com producao incerta, Splod e Bubbles fora de
-- escopo. Tudo isso e estado de produto que o agente precisa conhecer e que a
-- tela de revisao precisa conferir.
--
-- Escopo por marca (nao por cliente): num cliente multimarca como a Trevo, cada
-- produto pertence a uma marca (Apreciare, High Protein…). marca_id e obrigatorio.
-- ===========================================================================

CREATE TYPE status_produto AS ENUM (
  'ativo',            -- entra normalmente no cronograma
  'nao_lancado',      -- existe mas ainda nao pode aparecer (ex: Apreciare Fit)
  'producao_incerta', -- pode nao estar em producao (ex: Copo Coalhada com Granola)
  'descontinuado',    -- saiu de linha
  'fora_de_escopo'    -- decisao editorial de nao usar (ex: Splod, Bubbles, edicao Copa)
);

CREATE TABLE IF NOT EXISTS produtos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  cliente_id      uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  marca_id        uuid NOT NULL REFERENCES onboarding_marcas(id) ON DELETE CASCADE,

  nome            text NOT NULL,             -- "Garrafa High Protein Banana 24g"
  sku             text,                      -- codigo interno, quando houver
  sabor           text,                      -- "Banana", "Morango com Blueberry"
  categoria       text,                      -- "Garrafa", "Pouch", "Bandeja"…
  status          status_produto NOT NULL DEFAULT 'ativo',

  publico         text,                      -- publico-alvo especifico do produto
  -- Claims permitidos e proibidos, para o agente nao inventar alegacao.
  claims          jsonb NOT NULL DEFAULT '{}',
  observacoes     text,                      -- ex: "edicao Copa excluida em 2026"

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_produtos_marca
  ON produtos(organization_id, marca_id);
CREATE INDEX IF NOT EXISTS idx_produtos_cliente
  ON produtos(organization_id, cliente_id);
-- Consulta mais comum do agente e da tela de revisao: os utilizaveis da marca.
CREATE INDEX IF NOT EXISTS idx_produtos_ativos
  ON produtos(organization_id, marca_id)
  WHERE status = 'ativo';

CREATE TRIGGER set_produtos_updated_at
  BEFORE UPDATE ON produtos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — Regra #1: organization_id = auth_organization_id() em tudo.
-- Produto nao e confidencial nem exclusivo de socia; toda a equipe le e edita,
-- cliente nao acessa (nao tem por que ver o catalogo interno de SKUs).
-- ---------------------------------------------------------------------------
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "produtos_select_equipe" ON produtos
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'gestao', 'atendimento', 'executor')
  );

CREATE POLICY "produtos_write_equipe" ON produtos
  FOR ALL TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'gestao', 'atendimento')
  )
  WITH CHECK (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'gestao', 'atendimento')
  );

COMMENT ON TABLE produtos IS
  'Catalogo de produtos/SKUs por marca. Alimenta o contexto dos agentes de conteudo (so status=ativo) e o controle de repeticao de SKU na tela de revisao de cronograma.';
