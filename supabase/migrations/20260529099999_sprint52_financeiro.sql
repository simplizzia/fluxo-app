-- =============================================================================
-- Sprint 5.2 — Módulo Financeiro
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Receitas por cliente
-- ---------------------------------------------------------------------------

DO $$ BEGIN CREATE TYPE ciclo_cobranca AS ENUM ('mensal', 'trimestral', 'semestral', 'anual'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE status_pagamento AS ENUM ('pago', 'pendente', 'em_atraso'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE financeiro_receitas (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id             uuid        NOT NULL REFERENCES organizacoes(id)  ON DELETE CASCADE,
  cliente_id                  uuid        REFERENCES clientes(id)               ON DELETE SET NULL,
  descricao                   text        NOT NULL,
  valor_mensal                numeric(12, 2) NOT NULL CHECK (valor_mensal >= 0),
  data_cobranca_dia           int         NOT NULL CHECK (data_cobranca_dia BETWEEN 1 AND 28),
  ciclo                       ciclo_cobranca NOT NULL DEFAULT 'mensal',
  status                      status_pagamento NOT NULL DEFAULT 'pendente',
  ultima_atualizacao_status   timestamptz NOT NULL DEFAULT now(),
  observacoes                 text,
  ativo                       boolean     NOT NULL DEFAULT true,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE financeiro_receitas IS
  'Receitas recorrentes por cliente. Base para cálculo de MRR real.';

COMMENT ON COLUMN financeiro_receitas.valor_mensal IS
  'Valor mensal equivalente. Para ciclos trimestrais/anuais, divide o valor total pelo ciclo.';

COMMENT ON COLUMN financeiro_receitas.data_cobranca_dia IS
  'Dia do mês em que a cobrança é gerada (1–28 para garantir compatibilidade com todos os meses).';

-- ---------------------------------------------------------------------------
-- 2. Histórico de pagamentos (competência × status)
-- ---------------------------------------------------------------------------

CREATE TABLE financeiro_historico (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizacoes(id)  ON DELETE CASCADE,
  receita_id      uuid        NOT NULL REFERENCES financeiro_receitas(id) ON DELETE CASCADE,
  competencia     date        NOT NULL,  -- primeiro dia do mês de referência
  valor_cobrado   numeric(12, 2) NOT NULL,
  status          status_pagamento NOT NULL DEFAULT 'pendente',
  pago_em         timestamptz,
  observacoes     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE financeiro_historico IS
  'Registro por competência de cada cobrança: status e data de pagamento.';

CREATE UNIQUE INDEX uidx_financeiro_historico_competencia
  ON financeiro_historico(receita_id, competencia);

-- ---------------------------------------------------------------------------
-- 3. Documentos financeiros (NFs, comprovantes, contratos, etc.)
-- ---------------------------------------------------------------------------

CREATE TYPE tipo_doc_financeiro AS ENUM (
  'nota_fiscal', 'comprovante', 'contrato', 'boleto', 'outro'
);

CREATE TABLE financeiro_documentos (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizacoes(id)  ON DELETE CASCADE,
  cliente_id      uuid        REFERENCES clientes(id)               ON DELETE SET NULL,
  tipo            tipo_doc_financeiro NOT NULL DEFAULT 'outro',
  nome            text        NOT NULL,
  storage_path    text        NOT NULL,
  mime_type       text        NOT NULL DEFAULT 'application/pdf',
  tamanho_bytes   bigint      NOT NULL DEFAULT 0,
  mes_referencia  date,       -- primeiro dia do mês (ex: 2026-05-01)
  uploaded_by     uuid        NOT NULL REFERENCES profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE financeiro_documentos IS
  'Repositório de documentos financeiros: NFs, comprovantes, contratos por mês.';

-- ---------------------------------------------------------------------------
-- 4. Índices
-- ---------------------------------------------------------------------------

CREATE INDEX idx_financeiro_receitas_org
  ON financeiro_receitas(organization_id, ativo, status);

CREATE INDEX idx_financeiro_receitas_cliente
  ON financeiro_receitas(cliente_id);

CREATE INDEX idx_financeiro_historico_org
  ON financeiro_historico(organization_id, competencia DESC);

CREATE INDEX idx_financeiro_documentos_org
  ON financeiro_documentos(organization_id, mes_referencia DESC);

CREATE INDEX idx_financeiro_documentos_cliente
  ON financeiro_documentos(cliente_id);

-- ---------------------------------------------------------------------------
-- 5. RLS — acesso exclusivo para sócias
-- ---------------------------------------------------------------------------

ALTER TABLE financeiro_receitas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro_documentos ENABLE ROW LEVEL SECURITY;

-- financeiro_receitas
CREATE POLICY "fin_receitas_socia_select" ON financeiro_receitas
  FOR SELECT TO authenticated
  USING (organization_id = auth_organization_id() AND is_socia());

CREATE POLICY "fin_receitas_socia_insert" ON financeiro_receitas
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = auth_organization_id() AND is_socia());

CREATE POLICY "fin_receitas_socia_update" ON financeiro_receitas
  FOR UPDATE TO authenticated
  USING (organization_id = auth_organization_id() AND is_socia())
  WITH CHECK (organization_id = auth_organization_id() AND is_socia());

CREATE POLICY "fin_receitas_socia_delete" ON financeiro_receitas
  FOR DELETE TO authenticated
  USING (organization_id = auth_organization_id() AND is_socia());

-- financeiro_historico
CREATE POLICY "fin_historico_socia_select" ON financeiro_historico
  FOR SELECT TO authenticated
  USING (organization_id = auth_organization_id() AND is_socia());

CREATE POLICY "fin_historico_socia_insert" ON financeiro_historico
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = auth_organization_id() AND is_socia());

CREATE POLICY "fin_historico_socia_update" ON financeiro_historico
  FOR UPDATE TO authenticated
  USING (organization_id = auth_organization_id() AND is_socia())
  WITH CHECK (organization_id = auth_organization_id() AND is_socia());

-- financeiro_documentos
CREATE POLICY "fin_docs_socia_select" ON financeiro_documentos
  FOR SELECT TO authenticated
  USING (organization_id = auth_organization_id() AND is_socia());

CREATE POLICY "fin_docs_socia_insert" ON financeiro_documentos
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = auth_organization_id() AND is_socia());

CREATE POLICY "fin_docs_socia_delete" ON financeiro_documentos
  FOR DELETE TO authenticated
  USING (organization_id = auth_organization_id() AND is_socia());
