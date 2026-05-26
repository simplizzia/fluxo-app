-- =============================================================================
-- Fluxo App — Schema Inicial Completo
-- Sprint 0.1 | 2026-05-26
--
-- CONVENÇÃO: toda tabela inclui organization_id (multi-tenancy ready).
-- Políticas RLS estão em 20260526000001_rls_policies.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------

CREATE TYPE papel_usuario AS ENUM (
  'socia', 'gestao', 'atendimento', 'executor', 'cliente'
);

CREATE TYPE sub_papel_contato AS ENUM (
  'responsavel', 'colaborador', 'observador'
);

CREATE TYPE status_card AS ENUM (
  'aguardando_info', 'a_fazer', 'em_andamento',
  'para_aprovacao', 'necessita_ajustes', 'concluido', 'cancelado'
);

CREATE TYPE prioridade_card AS ENUM (
  'urgente', 'alta', 'normal', 'baixa'
);

CREATE TYPE categoria_demanda AS ENUM (
  'redes_sociais', 'estrategia', 'embalagem', 'video',
  'trafego', 'linkedin', 'email', 'apresentacao', 'relatorio', 'outros'
);

CREATE TYPE status_cliente AS ENUM (
  'ativo', 'inativo', 'prospecto'
);

CREATE TYPE stage_prospect AS ENUM (
  'prospeccao', 'reuniao_agendada', 'reuniao_realizada',
  'proposta_enviada', 'negociacao', 'contrato_assinado',
  'cliente_ativo', 'perdido'
);

CREATE TYPE origem_prospect AS ENUM (
  'indicacao', 'prospeccao_ativa', 'inbound', 'evento'
);

CREATE TYPE tipo_reuniao AS ENUM (
  'prospeccao', 'cliente', 'interna', 'onboarding'
);

CREATE TYPE categoria_universo AS ENUM (
  'brand_system', 'personas', 'diagnostico',
  'parametros', 'calendario', 'outros'
);

CREATE TYPE tipo_arquivo AS ENUM (
  'entrega', 'referencia', 'revisao'
);

CREATE TYPE tipo_ativo_visual AS ENUM (
  'logo', 'paleta', 'tipografia', 'elemento_grafico',
  'mockup', 'brand_guidelines', 'arquivo_fonte'
);

CREATE TYPE secao_moodboard AS ENUM (
  'fotografia', 'tipografia', 'cor', 'textura',
  'referencia_marca', 'geral'
);

CREATE TYPE tipo_moodboard_item AS ENUM (
  'imagem_upload', 'link_externo', 'cor', 'texto'
);

CREATE TYPE area_socia AS ENUM (
  'financeiro', 'contabilidade', 'juridico', 'rh', 'cultura', 'outros'
);

CREATE TYPE regime_colaborador AS ENUM (
  'clt', 'pj', 'freelancer'
);

CREATE TYPE status_colaborador AS ENUM (
  'ativo', 'inativo', 'em_avaliacao'
);

CREATE TYPE plano_saas AS ENUM (
  'interno', 'starter', 'pro', 'enterprise'
);

CREATE TYPE decisao_aprovacao AS ENUM (
  'aprovado', 'reprovado'
);

CREATE TYPE entidade_pii AS ENUM (
  'card', 'arquivo', 'reuniao', 'proposta', 'contrato'
);

CREATE TYPE tipo_interacao_prospect AS ENUM (
  'contato', 'nota', 'reuniao', 'objecao', 'proposta', 'contrato'
);

CREATE TYPE tipo_badge AS ENUM (
  'colaborador', 'cliente'
);

-- ---------------------------------------------------------------------------
-- NÍVEL 0 — Organização (raiz do tenant)
-- ---------------------------------------------------------------------------

CREATE TABLE organizacoes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome              text NOT NULL,
  slug              text NOT NULL UNIQUE,
  logo_url          text,
  cor_primaria      text DEFAULT '#000000',
  assistente_nome   text NOT NULL DEFAULT 'Izzi',
  plano_saas        plano_saas NOT NULL DEFAULT 'interno',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- NÍVEL 1 — Perfis de usuário (estende auth.users)
-- ---------------------------------------------------------------------------

CREATE TABLE profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  papel           papel_usuario NOT NULL,
  nome            text NOT NULL,
  avatar_url      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- NÍVEL 2 — Clientes e Planos
-- ---------------------------------------------------------------------------

CREATE TABLE clientes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  nome             text NOT NULL,
  slug             text NOT NULL,
  logo_url         text,
  status           status_cliente NOT NULL DEFAULT 'ativo',
  data_inativacao  date,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

CREATE TABLE planos_cliente (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  cliente_id            uuid NOT NULL UNIQUE REFERENCES clientes(id) ON DELETE CASCADE,
  limite_demandas_mes   integer NOT NULL DEFAULT 10,
  tipo_plano            text NOT NULL DEFAULT 'mensal',
  data_inicio           date NOT NULL,
  data_renovacao        date NOT NULL,
  valor_mensal          numeric(10,2),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Múltiplos contatos por cliente com sub-papéis
CREATE TABLE contatos_cliente (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  cliente_id      uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sub_papel       sub_papel_contato NOT NULL DEFAULT 'responsavel',
  ativo           boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cliente_id, user_id)
);

-- ---------------------------------------------------------------------------
-- NÍVEL 3 — Tipos de demanda (configurável sem deploy)
-- ---------------------------------------------------------------------------

CREATE TABLE tipos_demanda (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  nome                  text NOT NULL,
  slug                  text NOT NULL,
  categoria             categoria_demanda NOT NULL DEFAULT 'outros',
  tem_publicacao        boolean NOT NULL DEFAULT false,    -- data_publicacao no card
  fluxo_aprovacao_duplo boolean NOT NULL DEFAULT false,    -- aprovação técnica interna (embalagens)
  campos_formulario     jsonb NOT NULL DEFAULT '[]',       -- [{nome, tipo, obrigatorio, visivel_para_cliente, placeholder}]
  ativo                 boolean NOT NULL DEFAULT true,
  agente_slug           text,                              -- qual agente acionar (Padrão A)
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

-- ---------------------------------------------------------------------------
-- NÍVEL 4 — Cards (demandas)
-- ---------------------------------------------------------------------------

CREATE TABLE cards (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  cliente_id              uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo_id                 uuid NOT NULL REFERENCES tipos_demanda(id),
  responsavel_id          uuid REFERENCES profiles(id),
  criado_por              uuid NOT NULL REFERENCES profiles(id),
  status                  status_card NOT NULL DEFAULT 'aguardando_info',
  prioridade              prioridade_card NOT NULL DEFAULT 'normal',
  titulo                  text NOT NULL,
  confidencial            boolean NOT NULL DEFAULT false,
  prazo_cliente           date,
  prazo_interno           date,
  data_publicacao         date,   -- nullable, só para redes sociais (tem_publicacao = true)
  campos_publicos         jsonb NOT NULL DEFAULT '{}',   -- preenchidos pelo cliente
  campos_internos         jsonb NOT NULL DEFAULT '{}',   -- custo, horas, notas, outputs IA (só equipe)
  rodadas_revisao         integer NOT NULL DEFAULT 0,
  versao_entrega_atual    integer,
  motivo_cancelamento     text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE comentarios (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  card_id               uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  autor_id              uuid NOT NULL REFERENCES profiles(id),
  texto                 text NOT NULL,
  visivel_para_cliente  boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE arquivos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  card_id         uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  tipo            tipo_arquivo NOT NULL,
  versao          integer,    -- incrementa a cada entrega; null para referências
  uploaded_by     uuid NOT NULL REFERENCES profiles(id),
  url             text NOT NULL,
  nome_arquivo    text NOT NULL,
  mime_type       text NOT NULL,
  tamanho_bytes   bigint NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE aprovacoes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  card_id         uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  aprovado_por    uuid NOT NULL REFERENCES profiles(id),
  decisao         decisao_aprovacao NOT NULL,
  comentario      text,   -- obrigatório se reprovado (validado na aplicação)
  rodada          integer NOT NULL DEFAULT 1,
  interna         boolean NOT NULL DEFAULT false,  -- true = aprovação interna (Caio/sócia), false = cliente
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Histórico de mudanças de status (audit trail do card)
CREATE TABLE card_status_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  card_id         uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  status_anterior status_card,
  status_novo     status_card NOT NULL,
  alterado_por    uuid NOT NULL REFERENCES profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- NÍVEL 5 — Universo da Marca
-- ---------------------------------------------------------------------------

CREATE TABLE universo_marca (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  cliente_id          uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  categoria           categoria_universo NOT NULL,
  subcategoria        text,   -- ex: "paleta", "persona-rodrigo"
  titulo              text NOT NULL,
  conteudo            jsonb NOT NULL DEFAULT '{}',
  visivel_para_cliente boolean NOT NULL DEFAULT false,
  gerado_por_agente   text,   -- ex: "brand-system/construtor-identidade"
  versao              integer NOT NULL DEFAULT 1,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Ativos visuais da identidade (logos, paleta, tipografia, etc.)
CREATE TABLE identidade_visual_ativos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  cliente_id      uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  categoria       tipo_ativo_visual NOT NULL,
  nome            text NOT NULL,
  descricao       text,
  nota_uso        text,   -- quando e como usar
  url             text,   -- Supabase Storage
  versao          integer NOT NULL DEFAULT 1,
  tags            text[] NOT NULL DEFAULT '{}',
  visivel_para_cliente boolean NOT NULL DEFAULT true,
  adicionado_por  uuid NOT NULL REFERENCES profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Moodboard — o mundo visual da marca
CREATE TABLE moodboard_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  cliente_id      uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  secao           secao_moodboard NOT NULL DEFAULT 'geral',
  tipo            tipo_moodboard_item NOT NULL,
  url             text,       -- para imagem_upload e link_externo
  cor_hex         text,       -- para tipo = 'cor'
  texto           text,       -- para tipo = 'texto' ou nota em qualquer item
  nota            text,       -- nota contextual do Caio
  anti_referencia boolean NOT NULL DEFAULT false,
  ordem           integer NOT NULL DEFAULT 0,
  adicionado_por  uuid NOT NULL REFERENCES profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Padrões de aprovação aprendidos (loop de aprendizado)
CREATE TABLE padroes_cliente (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  cliente_id      uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo_demanda_id uuid REFERENCES tipos_demanda(id),   -- nullable = padrão geral
  padrao          text NOT NULL,
  confianca       float NOT NULL DEFAULT 0.5,          -- 0 a 1
  exemplos        jsonb NOT NULL DEFAULT '[]',          -- card_ids que geraram o padrão
  gerado_em       timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- NÍVEL 6 — Customer Success
-- ---------------------------------------------------------------------------

CREATE TABLE health_scores (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  cliente_id      uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  score           integer NOT NULL CHECK (score >= 0 AND score <= 100),
  componentes     jsonb NOT NULL DEFAULT '{}',  -- breakdown das 5 métricas
  calculado_em    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE avaliacoes_cliente (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  cliente_id      uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  token_unico     uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  nps             smallint CHECK (nps >= 0 AND nps <= 10),
  qualidade       smallint CHECK (qualidade >= 1 AND qualidade <= 5),
  comunicacao     smallint CHECK (comunicacao >= 1 AND comunicacao <= 5),
  comentario      text,
  enviado_em      timestamptz NOT NULL DEFAULT now(),
  respondido_em   timestamptz
);

CREATE TABLE avaliacoes_colaborador (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  colaborador_id  uuid NOT NULL REFERENCES profiles(id),
  registrado_por  uuid NOT NULL REFERENCES profiles(id),
  nota_geral      smallint NOT NULL CHECK (nota_geral >= 1 AND nota_geral <= 5),
  criterios       jsonb NOT NULL DEFAULT '{}',  -- qualidade, prazo, comunicacao, iniciativa
  observacao      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- NÍVEL 7 — Pipeline de Prospecção (CRM)
-- ---------------------------------------------------------------------------

CREATE TABLE prospects (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  responsavel_id          uuid NOT NULL REFERENCES profiles(id),
  nome                    text NOT NULL,
  empresa                 text,
  segmento                text,
  contato                 jsonb NOT NULL DEFAULT '{}',  -- telefone, email, linkedin
  origem                  origem_prospect NOT NULL DEFAULT 'inbound',
  stage                   stage_prospect NOT NULL DEFAULT 'prospeccao',
  valor_mensal_proposto   numeric(10,2),
  desconto                numeric(5,2),
  motivo_perda            text,
  cliente_id              uuid REFERENCES clientes(id),  -- preenchido na conversão
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE interacoes_prospect (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  prospect_id     uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  tipo            tipo_interacao_prospect NOT NULL,
  descricao       text NOT NULL,
  registrado_por  uuid NOT NULL REFERENCES profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- NÍVEL 8 — Reuniões
-- ---------------------------------------------------------------------------

CREATE TABLE reunioes (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id          uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  tipo                     tipo_reuniao NOT NULL,
  data_reuniao             timestamptz NOT NULL,
  duracao_minutos          integer,
  prospect_id              uuid REFERENCES prospects(id),
  cliente_id               uuid REFERENCES clientes(id),
  participantes_internos   uuid[] NOT NULL DEFAULT '{}',   -- array de profile ids
  participantes_externos   jsonb NOT NULL DEFAULT '[]',    -- [{nome, empresa, email}]
  notas_brutas             text,
  arquivo_notas_url        text,
  resumo_gerado            text,    -- output do Claude
  created_by               uuid NOT NULL REFERENCES profiles(id),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE action_items_reuniao (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id          uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  reuniao_id               uuid NOT NULL REFERENCES reunioes(id) ON DELETE CASCADE,
  descricao                text NOT NULL,
  responsavel_sugerido_id  uuid REFERENCES profiles(id),
  prazo_sugerido           date,
  card_id                  uuid REFERENCES cards(id),   -- preenchido ao converter em card
  confirmado               boolean NOT NULL DEFAULT false,
  created_at               timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- NÍVEL 9 — Notificações e Automação
-- ---------------------------------------------------------------------------

CREATE TABLE notification_preferences (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  usuario_id      uuid NOT NULL REFERENCES profiles(id),
  evento          text NOT NULL,      -- ex: 'card_para_aprovacao', 'cliente_80_plano'
  canal_email     boolean NOT NULL DEFAULT true,
  canal_push      boolean NOT NULL DEFAULT false,
  UNIQUE (usuario_id, evento)
);

CREATE TABLE automation_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  nome            text NOT NULL,
  descricao       text,
  gatilho         text NOT NULL,      -- identificador da regra
  condicoes       jsonb NOT NULL DEFAULT '{}',
  acoes           jsonb NOT NULL DEFAULT '[]',
  ativa           boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE automation_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  rule_id         uuid NOT NULL REFERENCES automation_rules(id),
  entidade        text NOT NULL,      -- ex: 'card', 'cliente'
  entidade_id     uuid NOT NULL,
  sucesso         boolean NOT NULL,
  detalhes        jsonb NOT NULL DEFAULT '{}',
  executado_em    timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- NÍVEL 10 — Área das Sócias
-- ---------------------------------------------------------------------------

CREATE TABLE socias_documentos (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  area             area_socia NOT NULL,
  nome             text NOT NULL,
  descricao        text,
  url              text NOT NULL,   -- Supabase Storage
  nome_arquivo     text NOT NULL,
  mime_type        text NOT NULL,
  tamanho_bytes    bigint NOT NULL,
  mes_competencia  date,             -- para docs fiscais
  tags             text[] NOT NULL DEFAULT '{}',
  uploaded_by      uuid NOT NULL REFERENCES profiles(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE external_share_links (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  criado_por      uuid NOT NULL REFERENCES profiles(id),
  area            area_socia NOT NULL,
  documentos_ids  uuid[] NOT NULL,
  token           uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  descricao       text NOT NULL,
  expira_em       timestamptz NOT NULL,
  senha_hash      text,
  revogado        boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE external_share_access_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  link_id         uuid NOT NULL REFERENCES external_share_links(id),
  ip_address      text,
  arquivos_ids    uuid[] NOT NULL DEFAULT '{}',
  acessado_em     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE colaboradores_mapa (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL UNIQUE REFERENCES profiles(id),
  regime          regime_colaborador NOT NULL DEFAULT 'pj',
  data_inicio     date NOT NULL,
  especialidades  text[] NOT NULL DEFAULT '{}',
  status          status_colaborador NOT NULL DEFAULT 'ativo',
  observacoes     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- NÍVEL 11 — LGPD e Auditoria
-- ---------------------------------------------------------------------------

CREATE TABLE audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  usuario_id  uuid REFERENCES profiles(id),   -- nullable: ações de sistema
  acao        text NOT NULL,                   -- ex: 'card.status_changed', 'user.login'
  entidade    text NOT NULL,
  entidade_id uuid,
  metadata    jsonb NOT NULL DEFAULT '{}',     -- nunca inclui PII
  ip_address  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pii_scan_log (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  entidade              entidade_pii NOT NULL,
  entidade_id           uuid NOT NULL,
  tipos_pii_encontrados text[] NOT NULL DEFAULT '{}',   -- cpf, cnpj, email, telefone...
  escaneado_em          timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- NÍVEL 12 — Gamificação (tabelas preparadas; UI na Fase 2)
-- ---------------------------------------------------------------------------

CREATE TABLE badges_definicoes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  nome        text NOT NULL,
  descricao   text NOT NULL,
  icone       text NOT NULL,
  tipo        tipo_badge NOT NULL,
  criterios   jsonb NOT NULL DEFAULT '{}',
  ativo       boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE badges_conquistados (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  usuario_id      uuid NOT NULL REFERENCES profiles(id),
  badge_id        uuid NOT NULL REFERENCES badges_definicoes(id),
  conquistado_em  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (usuario_id, badge_id)
);

CREATE TABLE pontuacao_mensal (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  usuario_id      uuid NOT NULL REFERENCES profiles(id),
  mes_referencia  date NOT NULL,    -- primeiro dia do mês
  pontos          integer NOT NULL DEFAULT 0,
  detalhes        jsonb NOT NULL DEFAULT '{}',
  UNIQUE (usuario_id, mes_referencia)
);

-- ---------------------------------------------------------------------------
-- ÍNDICES
-- ---------------------------------------------------------------------------

-- Cards — queries mais frequentes
CREATE INDEX idx_cards_organization ON cards(organization_id);
CREATE INDEX idx_cards_cliente ON cards(organization_id, cliente_id);
CREATE INDEX idx_cards_status ON cards(organization_id, status);
CREATE INDEX idx_cards_responsavel ON cards(organization_id, responsavel_id);
CREATE INDEX idx_cards_prazo_cliente ON cards(organization_id, prazo_cliente);
CREATE INDEX idx_cards_confidencial ON cards(organization_id, confidencial);

-- Busca full-text
CREATE INDEX idx_cards_titulo_fts ON cards USING gin(to_tsvector('portuguese', titulo));
CREATE INDEX idx_clientes_nome_fts ON clientes USING gin(to_tsvector('portuguese', nome));

-- Profiles
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_organization ON profiles(organization_id);

-- Health scores — busca o mais recente por cliente
CREATE INDEX idx_health_scores_cliente_data ON health_scores(organization_id, cliente_id, calculado_em DESC);

-- Prospects
CREATE INDEX idx_prospects_organization_stage ON prospects(organization_id, stage);

-- Arquivos — por card e versão
CREATE INDEX idx_arquivos_card ON arquivos(organization_id, card_id, versao DESC);

-- Audit log
CREATE INDEX idx_audit_log_entidade ON audit_log(organization_id, entidade, entidade_id);
CREATE INDEX idx_audit_log_created ON audit_log(organization_id, created_at DESC);

-- External share links — busca por token
CREATE INDEX idx_share_links_token ON external_share_links(token) WHERE revogado = false;

-- ---------------------------------------------------------------------------
-- TRIGGERS — updated_at automático
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em todas as tabelas com updated_at
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'organizacoes', 'profiles', 'clientes', 'planos_cliente',
    'tipos_demanda', 'cards', 'universo_marca', 'identidade_visual_ativos',
    'prospects', 'reunioes', 'automation_rules', 'colaboradores_mapa'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %s
       FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      t, t
    );
  END LOOP;
END $$;
