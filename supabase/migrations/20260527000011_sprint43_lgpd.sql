-- =============================================================================
-- Sprint 4.3 — LGPD e Segurança Avançada
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Adiciona coluna `ativo` em profiles para revogar acesso de clientes
-- ---------------------------------------------------------------------------

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

-- Index para query rápida no middleware
CREATE INDEX IF NOT EXISTS idx_profiles_ativo ON profiles(user_id, ativo);

-- ---------------------------------------------------------------------------
-- 1. Portabilidade de dados (solicitações de export)
-- ---------------------------------------------------------------------------

CREATE TABLE lgpd_portabilidade_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  solicitado_por  uuid NOT NULL REFERENCES profiles(id),  -- quem pediu
  cliente_id      uuid REFERENCES clientes(id),           -- null = o próprio usuário (caso cliente)
  status          text NOT NULL DEFAULT 'pendente'         -- pendente | processando | concluido | erro
                  CHECK (status IN ('pendente', 'processando', 'concluido', 'erro')),
  file_url        text,                                   -- URL do ZIP gerado (Storage)
  observacao      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  concluido_em    timestamptz
);

ALTER TABLE lgpd_portabilidade_requests ENABLE ROW LEVEL SECURITY;

-- Sócia: vê todos da org
CREATE POLICY "lgpd_portab_socia" ON lgpd_portabilidade_requests
  FOR ALL USING (
    organization_id = auth_organization_id()
    AND is_socia()
  );

-- Cliente: vê apenas as próprias solicitações
CREATE POLICY "lgpd_portab_self" ON lgpd_portabilidade_requests
  FOR SELECT USING (
    organization_id = auth_organization_id()
    AND solicitado_por = auth_profile_id()
  );

CREATE POLICY "lgpd_portab_self_insert" ON lgpd_portabilidade_requests
  FOR INSERT WITH CHECK (
    organization_id = auth_organization_id()
    AND solicitado_por = auth_profile_id()
    AND cliente_id IS NULL   -- clientes só podem pedir os próprios dados
  );

-- ---------------------------------------------------------------------------
-- 2. Consentimentos LGPD
-- ---------------------------------------------------------------------------

CREATE TABLE lgpd_consentimentos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id),
  profile_id      uuid REFERENCES profiles(id),
  versao_termos   text NOT NULL DEFAULT '1.0',
  aceito          boolean NOT NULL DEFAULT true,
  ip_address      text,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lgpd_consentimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lgpd_consent_socia" ON lgpd_consentimentos
  FOR ALL USING (
    organization_id = auth_organization_id()
    AND is_socia()
  );

CREATE POLICY "lgpd_consent_self" ON lgpd_consentimentos
  FOR INSERT WITH CHECK (
    organization_id = auth_organization_id()
    AND user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- 3. Log de encerramentos
-- ---------------------------------------------------------------------------

CREATE TABLE lgpd_encerramentos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  cliente_id      uuid NOT NULL REFERENCES clientes(id),
  solicitado_por  uuid NOT NULL REFERENCES profiles(id),
  motivo          text,
  anonimizado_em  timestamptz,              -- null = ainda não anonimizado
  carta_enviada   boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lgpd_encerramentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lgpd_encerr_socia" ON lgpd_encerramentos
  FOR ALL USING (
    organization_id = auth_organization_id()
    AND is_socia()
  );

-- ---------------------------------------------------------------------------
-- 4. Índices de performance
-- ---------------------------------------------------------------------------

CREATE INDEX idx_lgpd_portab_org ON lgpd_portabilidade_requests(organization_id, created_at DESC);
CREATE INDEX idx_lgpd_consent_org ON lgpd_consentimentos(organization_id, created_at DESC);
CREATE INDEX idx_lgpd_encerr_org ON lgpd_encerramentos(organization_id, created_at DESC);
CREATE INDEX idx_lgpd_encerr_cliente ON lgpd_encerramentos(cliente_id);

-- ---------------------------------------------------------------------------
-- 5. pg_cron — marcação periódica para anonimização (90 dias após inativação)
--    O job gera entradas em lgpd_encerramentos para clientes inativos sem
--    registro; a anonimização efetiva é acionada manualmente pela sócia.
-- ---------------------------------------------------------------------------

-- Nota: pg_cron só funciona em instâncias Supabase com extensão habilitada.
-- Descomente ao fazer deploy em produção:

-- SELECT cron.schedule(
--   'lgpd-anonimizacao-check',
--   '0 9 * * 1',   -- toda segunda às 9h
--   $$
--     INSERT INTO lgpd_encerramentos (organization_id, cliente_id, solicitado_por, motivo)
--     SELECT c.organization_id,
--            c.id,
--            p.id,          -- primeira sócia da org como responsável
--            'Auto: 90 dias desde inativação'
--     FROM clientes c
--     JOIN profiles p ON p.organization_id = c.organization_id AND p.papel = 'socia'
--     WHERE c.status = 'inativo'
--       AND c.updated_at < now() - interval '90 days'
--       AND NOT EXISTS (
--         SELECT 1 FROM lgpd_encerramentos e
--         WHERE e.cliente_id = c.id
--       )
--     LIMIT 1;  -- pega primeira sócia apenas
--   $$
-- );
