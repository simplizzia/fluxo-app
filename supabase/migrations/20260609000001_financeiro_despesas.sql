-- Módulo Financeiro: tabela de despesas / contas a pagar
-- Depende de: ciclo_cobranca enum (definido em migração anterior)

CREATE TYPE categoria_despesa AS ENUM (
  'impostos',
  'colaboradores',
  'ferramentas',
  'fornecedores',
  'marketing',
  'escritorio',
  'outros'
);

CREATE TABLE financeiro_despesas (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  categoria           categoria_despesa NOT NULL DEFAULT 'outros',
  descricao           text        NOT NULL,
  fornecedor          text,
  valor               numeric(12, 2) NOT NULL CHECK (valor >= 0),
  vencimento          date        NOT NULL,
  pago_em             timestamptz,
  status              text        NOT NULL DEFAULT 'pendente'
                        CHECK (status IN ('pendente', 'paga', 'vencida')),
  recorrente          boolean     NOT NULL DEFAULT false,
  ciclo               ciclo_cobranca,
  comprovante_path    text,
  observacoes         text,
  ativo               boolean     NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Índices para queries frequentes
CREATE INDEX idx_fin_despesas_org  ON financeiro_despesas (organization_id, ativo, status);
CREATE INDEX idx_fin_despesas_venc ON financeiro_despesas (organization_id, vencimento)
  WHERE ativo = true;

-- RLS: apenas sócias da organização
ALTER TABLE financeiro_despesas ENABLE ROW LEVEL SECURITY;

CREATE POLICY fin_despesas_socia ON financeiro_despesas
  FOR ALL
  USING (organization_id = auth_organization_id() AND is_socia());
