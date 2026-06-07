-- =============================================================================
-- Fluxo App — Pessoas & Cultura: Parceiros, Avisos, Atividades
-- Sprint 5.x | 2026-06-07
--
-- Tabelas criadas:
--   onboarding_tokens    — tokens UUID enviados por e-mail aos parceiros
--   parceiros_perfil     — perfis ricos coletados via Izzi no onboarding
--   avisos_equipe        — comunicados em popup (imediatos ou agendados)
--   avisos_visualizacoes — rastreamento de leituras
--   atividades_parceiros — planejamento de mimos/atividades de cultura
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------

CREATE TYPE tipo_atividade AS ENUM (
  'atividade_equipe', 'brinde', 'mimo_individual',
  'reconhecimento', 'evento', 'celebracao', 'outro'
);

CREATE TYPE status_atividade AS ENUM (
  'ideia', 'planejada', 'em_andamento', 'executada', 'cancelada'
);

-- ---------------------------------------------------------------------------
-- onboarding_tokens
-- Tokens de convite enviados às pessoas antes de fazerem o onboarding.
-- Gerados no app pela sócia; consumidos pelo projeto onboarding-parceiros.
-- ---------------------------------------------------------------------------

CREATE TABLE onboarding_tokens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  token           uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  parceiro_email  text NOT NULL,
  parceiro_nome   text NOT NULL,
  status          text NOT NULL DEFAULT 'pendente'
                  CHECK (status IN ('pendente', 'completado', 'expirado')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL DEFAULT now() + interval '30 days'
);

CREATE INDEX idx_onboarding_tokens_token     ON onboarding_tokens(token);
CREATE INDEX idx_onboarding_tokens_org       ON onboarding_tokens(organization_id, status);

-- ---------------------------------------------------------------------------
-- parceiros_perfil
-- Perfil completo coletado pela Izzi durante o onboarding.
-- Pode (mas não precisa) estar vinculado a colaboradores_mapa se a pessoa
-- tiver conta no app.
-- ---------------------------------------------------------------------------

CREATE TABLE parceiros_perfil (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id           uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  colaborador_id            uuid REFERENCES colaboradores_mapa(id),
  token_id                  uuid REFERENCES onboarding_tokens(id),
  nome                      text NOT NULL,
  email                     text NOT NULL,
  whatsapp                  text,
  cidade                    text,
  nascimento                date,
  estado_civil              text,
  dados_pessoais            jsonb NOT NULL DEFAULT '{}',
  -- Ex: { "filhos": 2, "pets": ["gato"], "hobbies": ["yoga"],
  --       "musicas": ["pop"], "series": ["Friends"], "comida": "italiana",
  --       "esportes": ["corrida"], "signo": "leão" }
  dados_profissionais       jsonb NOT NULL DEFAULT '{}',
  -- Ex: { "ferramentas": ["Figma", "Canva"], "feedback": "escrito",
  --       "horario_reunioes": "manhã", "comunicacao": "texto",
  --       "areas_interesse": ["branding"] }
  datas_importantes         jsonb NOT NULL DEFAULT '{}',
  -- Ex: { "aniversario": "1990-03-15", "outros": ["2020-05-10 casamento"] }
  perfil_markdown           text,
  onboarding_completado_em  timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_parceiros_perfil_org   ON parceiros_perfil(organization_id);
CREATE INDEX idx_parceiros_perfil_email ON parceiros_perfil(email);

-- ---------------------------------------------------------------------------
-- avisos_equipe
-- Comunicados que aparecem como modal overlay para parceiros/equipe.
-- Podem ser enviados imediatamente (agendado_para IS NULL) ou agendados.
-- destinatarios: 'todos' | 'ativos' | 'especificos'
--   'especificos': parceiro_ids contém profile.id dos destinatários
-- ---------------------------------------------------------------------------

CREATE TABLE avisos_equipe (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  criado_por      uuid NOT NULL REFERENCES profiles(id),
  titulo          text NOT NULL,
  conteudo        text NOT NULL,
  imagem_url      text,             -- Storage bucket: avisos
  link_url        text,
  link_label      text,             -- Texto do botão, ex: "Ver detalhes"
  destinatarios   text NOT NULL DEFAULT 'todos'
                  CHECK (destinatarios IN ('todos', 'ativos', 'especificos')),
  parceiro_ids    uuid[],           -- profile.id dos destinatários (quando 'especificos')
  agendado_para   timestamptz,      -- NULL = publicar imediatamente
  publicado_em    timestamptz,      -- Preenchido quando efetivamente entregue
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_avisos_org          ON avisos_equipe(organization_id, publicado_em DESC);
CREATE INDEX idx_avisos_agendados    ON avisos_equipe(agendado_para)
  WHERE publicado_em IS NULL AND agendado_para IS NOT NULL;

-- ---------------------------------------------------------------------------
-- avisos_visualizacoes
-- Cada row representa que um usuário (profile.id) visualizou um aviso.
-- Usado para calcular taxa de leitura e suprimir re-exibição do popup.
-- ---------------------------------------------------------------------------

CREATE TABLE avisos_visualizacoes (
  aviso_id        uuid NOT NULL REFERENCES avisos_equipe(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  visualizado_em  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (aviso_id, user_id)
);

-- ---------------------------------------------------------------------------
-- atividades_parceiros
-- Planejamento de atividades, mimos e ações de cultura para parceiros.
-- gerado_por_ia = true quando a sugestão veio da Izzi.
-- ---------------------------------------------------------------------------

CREATE TABLE atividades_parceiros (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  titulo           text NOT NULL,
  descricao        text,
  tipo             tipo_atividade NOT NULL DEFAULT 'outro',
  status           status_atividade NOT NULL DEFAULT 'ideia',
  destinatario_tipo text NOT NULL DEFAULT 'todos'
                   CHECK (destinatario_tipo IN ('todos', 'especificos')),
  parceiro_ids     uuid[],          -- parceiros_perfil.id dos destinatários
  data_prevista    date,
  custo_estimado   numeric(10,2),
  observacoes      text,
  gerado_por_ia    boolean NOT NULL DEFAULT false,
  criado_por       uuid REFERENCES profiles(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_atividades_org    ON atividades_parceiros(organization_id, status);
CREATE INDEX idx_atividades_tipo   ON atividades_parceiros(organization_id, tipo);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE onboarding_tokens      ENABLE ROW LEVEL SECURITY;
ALTER TABLE parceiros_perfil       ENABLE ROW LEVEL SECURITY;
ALTER TABLE avisos_equipe          ENABLE ROW LEVEL SECURITY;
ALTER TABLE avisos_visualizacoes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE atividades_parceiros   ENABLE ROW LEVEL SECURITY;

-- onboarding_tokens: socia controla tudo; service role (onboarding app) lê/escreve via bypass
CREATE POLICY "socias_tokens_all" ON onboarding_tokens
  FOR ALL TO authenticated
  USING  (organization_id = auth_organization_id() AND auth_papel() = 'socia')
  WITH CHECK (organization_id = auth_organization_id() AND auth_papel() = 'socia');

-- parceiros_perfil: socia gerencia; gestao e atendimento leem
CREATE POLICY "equipe_le_perfis" ON parceiros_perfil
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'gestao', 'atendimento')
  );

CREATE POLICY "socias_editam_perfis" ON parceiros_perfil
  FOR ALL TO authenticated
  USING  (organization_id = auth_organization_id() AND auth_papel() = 'socia')
  WITH CHECK (organization_id = auth_organization_id() AND auth_papel() = 'socia');

-- avisos_equipe: socias gerenciam; equipe lê publicados
CREATE POLICY "socias_avisos_all" ON avisos_equipe
  FOR ALL TO authenticated
  USING  (organization_id = auth_organization_id() AND auth_papel() = 'socia')
  WITH CHECK (organization_id = auth_organization_id() AND auth_papel() = 'socia');

CREATE POLICY "equipe_le_avisos" ON avisos_equipe
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND publicado_em IS NOT NULL
    AND auth_papel() IN ('gestao', 'atendimento', 'executor')
  );

-- avisos_visualizacoes: cada usuário registra suas leituras; sócias veem todas
CREATE POLICY "usuario_registra_leitura" ON avisos_visualizacoes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth_profile_id());

CREATE POLICY "usuario_ve_propria_leitura" ON avisos_visualizacoes
  FOR SELECT TO authenticated
  USING (user_id = auth_profile_id());

CREATE POLICY "socias_veem_todas_leituras" ON avisos_visualizacoes
  FOR SELECT TO authenticated
  USING (
    auth_papel() = 'socia'
    AND EXISTS (
      SELECT 1 FROM avisos_equipe ae
      WHERE ae.id = aviso_id
        AND ae.organization_id = auth_organization_id()
    )
  );

-- atividades_parceiros: socias exclusivamente
CREATE POLICY "socias_atividades_all" ON atividades_parceiros
  FOR ALL TO authenticated
  USING  (organization_id = auth_organization_id() AND auth_papel() = 'socia')
  WITH CHECK (organization_id = auth_organization_id() AND auth_papel() = 'socia');

-- ---------------------------------------------------------------------------
-- Realtime — habilitar para avisos (popup em tempo real)
-- ---------------------------------------------------------------------------

ALTER PUBLICATION supabase_realtime ADD TABLE avisos_equipe;

-- ---------------------------------------------------------------------------
-- Storage — bucket para imagens de avisos
-- Público (as imagens aparecem no popup sem autenticação adicional).
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avisos',
  'avisos',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: qualquer autenticado pode fazer upload; leitura pública via URL
CREATE POLICY "autenticado_upload_avisos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avisos');

CREATE POLICY "publico_le_avisos" ON storage.objects
  FOR SELECT USING (bucket_id = 'avisos');
