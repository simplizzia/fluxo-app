-- =============================================================================
-- Sprint 6.1b — Enriquecer onboarding_clientes + criar onboarding_marcas
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enriquecer onboarding_clientes com dados que a sócia preenche antes de enviar
-- ---------------------------------------------------------------------------
ALTER TABLE onboarding_clientes
  ADD COLUMN IF NOT EXISTS nome_contato         text,
  ADD COLUMN IF NOT EXISTS cargo_contato        text,
  ADD COLUMN IF NOT EXISTS setor                text,
  ADD COLUMN IF NOT EXISTS servicos_contratados jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS objetivo_declarado   text,
  ADD COLUMN IF NOT EXISTS dores_identificadas  text,
  ADD COLUMN IF NOT EXISTS cenario_atual        text,
  -- link_enviado_em null = configurado mas ainda não enviado
  ADD COLUMN IF NOT EXISTS link_enviado_em      timestamptz;

-- Remove context_extra (substituído pelos campos estruturados acima)
-- ALTER TABLE onboarding_clientes DROP COLUMN IF EXISTS context_extra;
-- (mantemos context_extra por ora para não quebrar código existente)

-- ---------------------------------------------------------------------------
-- Tabela de marcas do onboarding
-- Cada linha = uma marca que será briefada durante a sessão
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS onboarding_marcas (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid        NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  token                 uuid        NOT NULL REFERENCES onboarding_clientes(token) ON DELETE CASCADE,

  -- Dados básicos
  nome                  text        NOT NULL,
  publico               text,
  site                  text,
  instagram             text,
  linkedin              text,

  -- Contexto estratégico (preenchido pela sócia antes de enviar)
  posicionamento_atual  text,
  concorrentes          text,
  contexto_estrategico  text,
  cenario_atual         text,

  -- Ordenação
  ordem                 integer     NOT NULL DEFAULT 0,

  -- Status e output do briefing
  status                text        NOT NULL DEFAULT 'pending'
                                      CHECK (status IN ('pending', 'done')),
  briefing_output       text,
  briefing_salvo_em     timestamptz,

  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onb_marcas_token ON onboarding_marcas(token, ordem);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE onboarding_marcas ENABLE ROW LEVEL SECURITY;

-- Equipe autenticada lê as marcas da própria org (para monitorar)
CREATE POLICY "onb_marcas_equipe_select" ON onboarding_marcas
  FOR SELECT USING (organization_id = auth_organization_id());

-- Service role pode tudo (form público + actions internas)
CREATE POLICY "onb_marcas_service_all" ON onboarding_marcas
  FOR ALL USING (true) WITH CHECK (true);
