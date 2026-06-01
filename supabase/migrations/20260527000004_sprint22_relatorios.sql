-- =============================================================================
-- Fluxo App — Sprint 2.2: Relatório Mensal com IA
-- =============================================================================

CREATE TYPE status_relatorio AS ENUM ('gerando', 'rascunho', 'aprovado', 'enviado');

CREATE TABLE relatorios_cliente (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  cliente_id       uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  mes_referencia   date NOT NULL,           -- primeiro dia do mês (ex: 2026-05-01)
  dados            jsonb NOT NULL DEFAULT '{}', -- métricas coletadas no momento da geração
  conteudo         text,                    -- markdown gerado pelo Claude
  conteudo_editado text,                    -- versão editada pela sócia (nullable)
  status           status_relatorio NOT NULL DEFAULT 'rascunho',
  enviado_em       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, cliente_id, mes_referencia)
);

-- Índice principal para listagem por organização
CREATE INDEX idx_relatorios_org_mes
  ON relatorios_cliente(organization_id, mes_referencia DESC);

-- Índice para portal do cliente
CREATE INDEX idx_relatorios_cliente_mes
  ON relatorios_cliente(cliente_id, mes_referencia DESC);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE relatorios_cliente ENABLE ROW LEVEL SECURITY;

-- Sócia e atendimento: acesso total
CREATE POLICY "relatorios_equipe_select" ON relatorios_cliente
  FOR SELECT USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'atendimento')
  );

-- Sócia: pode criar e atualizar
CREATE POLICY "relatorios_socia_insert" ON relatorios_cliente
  FOR INSERT WITH CHECK (
    organization_id = auth_organization_id()
    AND is_socia()
  );

CREATE POLICY "relatorios_socia_update" ON relatorios_cliente
  FOR UPDATE USING (
    organization_id = auth_organization_id()
    AND is_socia()
  );

-- Cliente: vê apenas relatórios enviados vinculados ao seu contato
CREATE POLICY "relatorios_cliente_select" ON relatorios_cliente
  FOR SELECT USING (
    organization_id = auth_organization_id()
    AND status = 'enviado'
    AND cliente_id IN (
      SELECT cc.cliente_id FROM contatos_cliente cc
      WHERE cc.user_id = auth.uid()
        AND cc.ativo = true
    )
  );
