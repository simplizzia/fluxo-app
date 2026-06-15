-- Sistema de apresentações web: substitui PDFs/PPTs por URLs vivas editáveis em tempo real

CREATE TYPE tipo_slide AS ENUM (
  'capa',
  'titulo_secao',
  'texto',
  'imagem',
  'texto_imagem',
  'metricas',
  'citacao'
);

CREATE TYPE status_apresentacao AS ENUM ('rascunho', 'publicada', 'arquivada');

CREATE TABLE apresentacoes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  cliente_id      uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  titulo          text NOT NULL,
  slug            text NOT NULL,
  token           text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  status          status_apresentacao NOT NULL DEFAULT 'rascunho',
  tema            jsonb NOT NULL DEFAULT '{}',
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, slug)
);

CREATE TABLE apresentacao_slides (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  apresentacao_id  uuid NOT NULL REFERENCES apresentacoes(id) ON DELETE CASCADE,
  ordem            smallint NOT NULL,
  tipo             tipo_slide NOT NULL,
  conteudo         jsonb NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Índices para buscas frequentes
CREATE INDEX apresentacoes_cliente_idx ON apresentacoes (organization_id, cliente_id);
CREATE INDEX apresentacoes_token_idx ON apresentacoes (token);
CREATE INDEX apresentacao_slides_order_idx ON apresentacao_slides (apresentacao_id, ordem);

-- RLS
ALTER TABLE apresentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE apresentacao_slides ENABLE ROW LEVEL SECURITY;

-- Equipe interna (socia, gestao, atendimento) vê e edita apresentações da sua org
CREATE POLICY "team_apresentacoes" ON apresentacoes
  FOR ALL
  USING (organization_id = auth_organization_id())
  WITH CHECK (organization_id = auth_organization_id());

CREATE POLICY "team_slides" ON apresentacao_slides
  FOR ALL
  USING (organization_id = auth_organization_id())
  WITH CHECK (organization_id = auth_organization_id());

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_apresentacoes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_apresentacoes_updated_at
  BEFORE UPDATE ON apresentacoes
  FOR EACH ROW EXECUTE FUNCTION update_apresentacoes_updated_at();

CREATE TRIGGER trg_slides_updated_at
  BEFORE UPDATE ON apresentacao_slides
  FOR EACH ROW EXECUTE FUNCTION update_apresentacoes_updated_at();
