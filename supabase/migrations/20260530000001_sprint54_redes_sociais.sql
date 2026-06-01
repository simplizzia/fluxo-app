-- =============================================================================
-- Sprint 5.4 — Redes Sociais: Agendamento + Métricas
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------

DO $$ BEGIN CREATE TYPE plataforma_social AS ENUM ('instagram', 'facebook', 'linkedin', 'tiktok'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE tipo_conteudo_social AS ENUM ('feed', 'carrossel', 'reel', 'story', 'bts'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE status_publicacao AS ENUM ('rascunho', 'agendado', 'publicado', 'falhou'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 2. Integrações OAuth por plataforma
-- ---------------------------------------------------------------------------

CREATE TABLE integracao_social (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  plataforma      plataforma_social NOT NULL,
  access_token    text        NOT NULL,  -- armazenar criptografado em produção
  refresh_token   text,
  page_id         text,       -- page/profile ID na plataforma
  page_nome       text,       -- nome legível da página
  expires_at      timestamptz,
  ativo           boolean     NOT NULL DEFAULT true,
  criado_por      uuid        NOT NULL REFERENCES profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, plataforma)
);

COMMENT ON TABLE integracao_social IS
  'Tokens OAuth por plataforma de rede social. Um registro por plataforma por organização.';

-- ---------------------------------------------------------------------------
-- 3. Publicações agendadas
-- ---------------------------------------------------------------------------

CREATE TABLE publicacoes_agendadas (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  card_id             uuid        REFERENCES cards(id) ON DELETE SET NULL,
  integracao_id       uuid        REFERENCES integracao_social(id) ON DELETE SET NULL,
  plataforma          plataforma_social NOT NULL,
  tipo_conteudo       tipo_conteudo_social NOT NULL DEFAULT 'feed',
  legenda             text,
  hashtags            text,       -- string com hashtags (ex: "#marca #produto")
  storage_path        text,       -- imagem/vídeo no bucket "social-media"
  data_agendada       timestamptz NOT NULL,
  publicado_em        timestamptz,
  status              status_publicacao NOT NULL DEFAULT 'rascunho',
  plataforma_post_id  text,       -- ID retornado pela API após publicar
  erro_mensagem       text,       -- detalhes se status = 'falhou'
  criado_por          uuid        NOT NULL REFERENCES profiles(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE publicacoes_agendadas IS
  'Posts agendados para redes sociais. Publicados pelo cron publicar-agendados.';

-- ---------------------------------------------------------------------------
-- 4. Métricas coletadas por publicação
-- ---------------------------------------------------------------------------

CREATE TABLE metricas_sociais (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  publicacao_id   uuid        NOT NULL REFERENCES publicacoes_agendadas(id) ON DELETE CASCADE,
  coletado_em     timestamptz NOT NULL DEFAULT now(),
  alcance         int         NOT NULL DEFAULT 0,
  impressoes      int         NOT NULL DEFAULT 0,
  curtidas        int         NOT NULL DEFAULT 0,
  comentarios     int         NOT NULL DEFAULT 0,
  compartilhamentos int       NOT NULL DEFAULT 0,
  salvamentos     int         NOT NULL DEFAULT 0,
  -- taxa_engajamento calculada: (curtidas + comentarios + compartilhamentos + salvamentos) / alcance
  taxa_engajamento numeric(6,4) GENERATED ALWAYS AS (
    CASE
      WHEN alcance > 0
      THEN (curtidas + comentarios + compartilhamentos + salvamentos)::numeric / alcance
      ELSE 0
    END
  ) STORED
);

COMMENT ON TABLE metricas_sociais IS
  'Snapshot de métricas coletadas pelo cron semanal coletar-metricas.';

-- ---------------------------------------------------------------------------
-- 5. Bucket de Storage: social-media
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'social-media',
  'social-media',
  false,
  52428800,  -- 50 MB
  '{image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm}'
)
ON CONFLICT (id) DO NOTHING;

-- RLS storage: equipe pode fazer upload, sócias podem excluir
CREATE POLICY "social_media_equipe_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'social-media'
    AND (storage.foldername(name))[1] = auth_organization_id()::text
  );

CREATE POLICY "social_media_equipe_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'social-media'
    AND (storage.foldername(name))[1] = auth_organization_id()::text
  );

CREATE POLICY "social_media_socia_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'social-media'
    AND (storage.foldername(name))[1] = auth_organization_id()::text
    AND is_socia()
  );

-- ---------------------------------------------------------------------------
-- 6. Índices
-- ---------------------------------------------------------------------------

CREATE INDEX idx_integracao_social_org
  ON integracao_social(organization_id, plataforma);

CREATE INDEX idx_publicacoes_agendadas_org_status
  ON publicacoes_agendadas(organization_id, status, data_agendada);

CREATE INDEX idx_publicacoes_agendadas_card
  ON publicacoes_agendadas(card_id)
  WHERE card_id IS NOT NULL;

CREATE INDEX idx_metricas_sociais_publicacao
  ON metricas_sociais(publicacao_id, coletado_em DESC);

CREATE INDEX idx_metricas_sociais_org
  ON metricas_sociais(organization_id, coletado_em DESC);

-- ---------------------------------------------------------------------------
-- 7. RLS — equipe pode ver/gerenciar publicações, sócias gerenciam integrações
-- ---------------------------------------------------------------------------

ALTER TABLE integracao_social      ENABLE ROW LEVEL SECURITY;
ALTER TABLE publicacoes_agendadas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE metricas_sociais       ENABLE ROW LEVEL SECURITY;

-- integracao_social — só sócias gerenciam
CREATE POLICY "integracao_socia_select" ON integracao_social
  FOR SELECT TO authenticated
  USING (organization_id = auth_organization_id() AND is_socia());

CREATE POLICY "integracao_socia_insert" ON integracao_social
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = auth_organization_id() AND is_socia());

CREATE POLICY "integracao_socia_update" ON integracao_social
  FOR UPDATE TO authenticated
  USING (organization_id = auth_organization_id() AND is_socia())
  WITH CHECK (organization_id = auth_organization_id() AND is_socia());

CREATE POLICY "integracao_socia_delete" ON integracao_social
  FOR DELETE TO authenticated
  USING (organization_id = auth_organization_id() AND is_socia());

-- publicacoes_agendadas — equipe pode ler/criar/editar; sócias podem excluir
CREATE POLICY "pub_equipe_select" ON publicacoes_agendadas
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia','gestao','atendimento','executor')
  );

CREATE POLICY "pub_equipe_insert" ON publicacoes_agendadas
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia','gestao','atendimento','executor')
  );

CREATE POLICY "pub_equipe_update" ON publicacoes_agendadas
  FOR UPDATE TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia','gestao','atendimento','executor')
  )
  WITH CHECK (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia','gestao','atendimento','executor')
  );

CREATE POLICY "pub_socia_delete" ON publicacoes_agendadas
  FOR DELETE TO authenticated
  USING (organization_id = auth_organization_id() AND is_socia());

-- metricas_sociais — equipe pode ler; service role escreve (cron)
CREATE POLICY "metricas_equipe_select" ON metricas_sociais
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia','gestao','atendimento')
  );
