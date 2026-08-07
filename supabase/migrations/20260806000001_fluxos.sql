-- ===========================================================================
-- Fluxos como dados — Fase 2 do redesenho do Kanban
-- 2026-08-06
--
-- Ate aqui havia UM fluxo fixo (ORDEM_STATUS em src/lib/cards/status.ts) mais
-- tipos_demanda.fluxo_aprovacao_duplo como unica variacao. Familias de demanda
-- diferentes (conteudo, embalagem, evento, trafego, video, blog...) tem fluxos
-- diferentes. Este migration introduz a CAMADA DE FLUXO como dado:
--
--   fluxos        -> um fluxo por familia de demanda
--   fluxo_etapas  -> a sequencia de etapas de cada fluxo
--   tipos_demanda.fluxo_id -> aponta o tipo para seu fluxo
--   cards.fluxo_etapa_id   -> etapa fina em que o card esta agora
--
-- O enum canonico status_card CONTINUA sendo a fonte para RLS, para a regra
-- dura (para_aprovacao/concluido/cancelado nunca automaticos) e para as colunas
-- do board. Cada fluxo_etapa mapeia para um status_canonico; as etapas so
-- refinam o status (varias etapas internas caem em 'em_andamento').
--
-- Mapeamento completo em docs/superpowers/specs/2026-08-06-kanban-fluxos.md.
-- Convencoes: Regra #1 (organization_id + RLS por auth_organization_id()).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Tipos de etapa
-- ---------------------------------------------------------------------------
CREATE TYPE kind_etapa AS ENUM (
  'execucao',       -- auto-avanca ao completar o sinal (checklist/arquivo)
  'agente',         -- roda um agente de IA; passa -> avanca, reprova -> ajustes
  'portao_humano',  -- so avanca por acao humana (aprovar/enviar)
  'terminal'        -- estado final (concluido/cancelado)
);

CREATE TYPE gatilho_avanco AS ENUM (
  'checklist',           -- checklist 100%
  'arquivo_entrega',     -- arquivo de entrega anexado
  'agente_ok',           -- agente aprovou (etapas kind=agente)
  'cron_data_cliente',   -- pg_cron libera na data pedida pelo cliente (envio)
  'manual',              -- acao humana explicita
  'nenhum'               -- terminal
);

-- ---------------------------------------------------------------------------
-- fluxos — um por familia de demanda
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fluxos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  slug              text NOT NULL,
  nome              text NOT NULL,
  descricao         text,
  -- Ponto de partida para a IA estimar o prazo interno (o prazo em si e
  -- sugerido pela IA a partir de carga + esforco; nao e buffer fixo).
  esforco_tipico    text NOT NULL DEFAULT 'medio'
                      CHECK (esforco_tipico IN ('baixo','medio','alto')),
  -- Familia de risco: exige aprovacao interna dupla (Rafaela E Adrielle).
  aprovacao_dupla   boolean NOT NULL DEFAULT false,
  ativo             boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

CREATE TRIGGER set_fluxos_updated_at
  BEFORE UPDATE ON fluxos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- fluxo_etapas — a sequencia de etapas de um fluxo
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fluxo_etapas (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  fluxo_id          uuid NOT NULL REFERENCES fluxos(id) ON DELETE CASCADE,
  slug              text NOT NULL,
  label             text NOT NULL,
  ordem             integer NOT NULL,
  kind              kind_etapa NOT NULL,
  avanca_por        gatilho_avanco NOT NULL DEFAULT 'manual',
  -- Agente da etapa. Em kind=agente ele GATEIA (passa->avanca, reprova->ajustes).
  -- Em outras kinds e ASSISTIVO (pre-desenvolvimento: organiza briefing +
  -- historico e rascunha), rodado na entrada da etapa, sem gatear.
  agente_slug       text,
  visivel_cliente   boolean NOT NULL DEFAULT false,
  -- Status canonico ao qual esta etapa pertence (para RLS, board, regra dura).
  status_canonico   status_card NOT NULL,
  ativo             boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fluxo_id, slug),
  UNIQUE (fluxo_id, ordem)
);

CREATE INDEX IF NOT EXISTS idx_fluxo_etapas_fluxo
  ON fluxo_etapas(fluxo_id, ordem);

CREATE TRIGGER set_fluxo_etapas_updated_at
  BEFORE UPDATE ON fluxo_etapas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Ligacoes: tipo -> fluxo, e card -> etapa fina atual
-- ---------------------------------------------------------------------------
ALTER TABLE tipos_demanda
  ADD COLUMN IF NOT EXISTS fluxo_id uuid REFERENCES fluxos(id) ON DELETE SET NULL;

ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS fluxo_etapa_id uuid REFERENCES fluxo_etapas(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- RLS — Regra #1. Fluxo e catalogo de equipe (leitura equipe; escrita socias).
-- ---------------------------------------------------------------------------
ALTER TABLE fluxos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxo_etapas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fluxos_select_equipe" ON fluxos
  FOR SELECT TO authenticated
  USING (organization_id = auth_organization_id()
         AND auth_papel() IN ('socia','gestao','atendimento','executor'));
CREATE POLICY "fluxos_write_socia" ON fluxos
  FOR ALL TO authenticated
  USING (organization_id = auth_organization_id() AND auth_papel() = 'socia')
  WITH CHECK (organization_id = auth_organization_id() AND auth_papel() = 'socia');

CREATE POLICY "fluxo_etapas_select_equipe" ON fluxo_etapas
  FOR SELECT TO authenticated
  USING (organization_id = auth_organization_id()
         AND auth_papel() IN ('socia','gestao','atendimento','executor'));
CREATE POLICY "fluxo_etapas_write_socia" ON fluxo_etapas
  FOR ALL TO authenticated
  USING (organization_id = auth_organization_id() AND auth_papel() = 'socia')
  WITH CHECK (organization_id = auth_organization_id() AND auth_papel() = 'socia');

-- ===========================================================================
-- SEED — Simplizzia (org 000...001). Familias A-J do spec.
-- ===========================================================================
INSERT INTO fluxos (organization_id, slug, nome, descricao, esforco_tipico, aprovacao_dupla) VALUES
  ('00000000-0000-0000-0000-000000000001','conteudo-social','Conteudo social','Instagram, LinkedIn, posts, sorteio. Conceito aprovado no cronograma; este fluxo e o do card (arte).','medio',false),
  ('00000000-0000-0000-0000-000000000001','arte-avulsa','Arte avulsa / peca','Institucional, comercial, banner, encarte, PDV, arte, trade.','medio',false),
  ('00000000-0000-0000-0000-000000000001','embalagem','Embalagem / Rotulo','Pedido nasce do cliente. Caio faz o visual; Thamara a tecnica. Duas aprovacoes.','alto',true),
  ('00000000-0000-0000-0000-000000000001','evento','Evento (visual)','Simplizzia faz so a parte visual; a logistica e do cliente.','medio',false),
  ('00000000-0000-0000-0000-000000000001','interno-rh','Interno / RH','Comunicacao interna, comunicado, vaga. Sem cliente externo.','baixo',false),
  ('00000000-0000-0000-0000-000000000001','relatorio','Relatorio / Estrategia','Relatorio mensal, estrategia, planejamento. IA gera o grosso.','medio',false),
  ('00000000-0000-0000-0000-000000000001','comercial-juridico','Comercial / Juridico','Contrato, proposta. Sem publicacao. Familia de risco.','baixo',true),
  ('00000000-0000-0000-0000-000000000001','trafego','Trafego pago','Midia paga. Responsavel Rafaela (intermedio com cliente); gestora e interna.','medio',false),
  ('00000000-0000-0000-0000-000000000001','video-interno','Video (videomaker interna)','Producao/edicao interna. Roteiro nasce no cronograma.','alto',false),
  ('00000000-0000-0000-0000-000000000001','video-terceirizado','Video (terceirizado do cliente)','Simplizzia entrega o roteiro; producao e externa (ex.: Trevo).','medio',false),
  ('00000000-0000-0000-0000-000000000001','blog-seo','Blog SEO/GEO','Textos de blog otimizados para SEO/GEO.','medio',false)
ON CONFLICT (organization_id, slug) DO NOTHING;

-- Etapas. Uma VALUES list; fluxo_id resolvido por slug.
INSERT INTO fluxo_etapas
  (organization_id, fluxo_id, slug, label, ordem, kind, avanca_por, agente_slug, visivel_cliente, status_canonico)
SELECT
  '00000000-0000-0000-0000-000000000001', f.id,
  e.slug, e.label, e.ordem,
  e.kind::kind_etapa, e.avanca_por::gatilho_avanco, e.agente_slug,
  e.visivel_cliente, e.status_canonico::status_card
FROM (VALUES
  -- A. conteudo-social (nivel card; conceito ja aprovado no cronograma)
  ('conteudo-social','design','Design (arte)',1,'execucao','arquivo_entrega',NULL,true,'em_andamento'),
  ('conteudo-social','revisao-visual','Revisao IA (visual)',2,'agente','agente_ok','brand-system.validador-visual',false,'em_andamento'),
  ('conteudo-social','aprovacao-interna','Aprovacao interna',3,'portao_humano','manual',NULL,false,'em_andamento'),
  ('conteudo-social','aguardando-envio','Aguardando envio',4,'execucao','cron_data_cliente',NULL,false,'em_andamento'),
  ('conteudo-social','aprovacao-cliente','Aprovacao do cliente',5,'portao_humano','manual',NULL,true,'para_aprovacao'),
  ('conteudo-social','ajustes','Ajustes',6,'execucao','arquivo_entrega',NULL,true,'necessita_ajustes'),
  ('conteudo-social','publicado','Publicado',7,'terminal','nenhum',NULL,true,'concluido'),

  -- B. arte-avulsa
  ('arte-avulsa','briefing','Briefing + pre-desenvolvimento IA',1,'portao_humano','manual','briefing.izzi',false,'aguardando_info'),
  ('arte-avulsa','design','Design',2,'execucao','arquivo_entrega',NULL,true,'em_andamento'),
  ('arte-avulsa','revisao-publicacao','Revisao IA (publicacao)',3,'agente','agente_ok','criativo.publicacao',false,'em_andamento'),
  ('arte-avulsa','revisao-visual','Revisao IA (marca visual)',4,'agente','agente_ok','brand-system.validador-visual',false,'em_andamento'),
  ('arte-avulsa','aprovacao-interna','Aprovacao interna',5,'portao_humano','manual',NULL,false,'em_andamento'),
  ('arte-avulsa','aguardando-envio','Aguardando envio',6,'execucao','cron_data_cliente',NULL,false,'em_andamento'),
  ('arte-avulsa','aprovacao-cliente','Aprovacao do cliente',7,'portao_humano','manual',NULL,true,'para_aprovacao'),
  ('arte-avulsa','concluido','Concluido',8,'terminal','nenhum',NULL,true,'concluido'),

  -- C. embalagem (duas aprovacoes: design do cliente, depois envio final)
  ('embalagem','solicitacao','Solicitacao do cliente + pre-desenvolvimento IA',1,'portao_humano','manual','briefing.izzi',false,'aguardando_info'),
  ('embalagem','direcionamento','Direcionamento (Adrielle)',2,'portao_humano','manual',NULL,false,'a_fazer'),
  ('embalagem','design-visual','Design visual do rotulo (Caio)',3,'execucao','arquivo_entrega',NULL,true,'em_andamento'),
  ('embalagem','checagem-tecnica','Checagem tecnica (Thamara)',4,'portao_humano','manual',NULL,false,'em_andamento'),
  ('embalagem','checagem-marca','Checagem de marca (IA)',5,'agente','agente_ok','brand-system.validador-visual',false,'em_andamento'),
  ('embalagem','aprovacao-interna','Aprovacao interna (dupla)',6,'portao_humano','manual',NULL,false,'em_andamento'),
  ('embalagem','aprovacao-design-cliente','Aprovacao do design (cliente)',7,'portao_humano','manual',NULL,true,'para_aprovacao'),
  ('embalagem','adaptacao-tecnica','Adaptacao tecnica do arquivo (Thamara)',8,'execucao','arquivo_entrega',NULL,false,'em_andamento'),
  ('embalagem','envio-final','Envio final ao cliente',9,'terminal','nenhum',NULL,true,'concluido'),

  -- D. evento (so a parte visual)
  ('evento','briefing','Briefing do evento + pre-desenvolvimento IA',1,'portao_humano','manual','briefing.izzi',false,'aguardando_info'),
  ('evento','producao-visual','Producao dos materiais visuais',2,'execucao','checklist',NULL,true,'em_andamento'),
  ('evento','revisao-visual','Revisao IA (marca visual)',3,'agente','agente_ok','brand-system.validador-visual',false,'em_andamento'),
  ('evento','aprovacao-interna','Aprovacao interna',4,'portao_humano','manual',NULL,false,'em_andamento'),
  ('evento','aprovacao-cliente','Aprovacao do cliente',5,'portao_humano','manual',NULL,true,'para_aprovacao'),
  ('evento','concluido','Concluido / entregue',6,'terminal','nenhum',NULL,true,'concluido'),

  -- E. interno-rh (sem cliente externo)
  ('interno-rh','briefing','Briefing + pre-desenvolvimento IA',1,'portao_humano','manual','briefing.izzi',false,'aguardando_info'),
  ('interno-rh','producao','Redacao / Arte',2,'execucao','arquivo_entrega',NULL,false,'em_andamento'),
  ('interno-rh','conformidade-tom','Conformidade de tom (IA)',3,'agente','agente_ok','inteligencia.validador-tom',false,'em_andamento'),
  ('interno-rh','aprovacao-interna','Aprovacao interna',4,'portao_humano','manual',NULL,false,'em_andamento'),
  ('interno-rh','concluido','Publicado / Concluido',5,'terminal','nenhum',NULL,false,'concluido'),

  -- F. relatorio / estrategia
  ('relatorio','coleta','Coleta de dados',1,'execucao','nenhum',NULL,false,'a_fazer'),
  ('relatorio','geracao','Geracao (IA)',2,'agente','agente_ok','monitoramento.relatorio-mensal',false,'em_andamento'),
  ('relatorio','revisao-interna','Revisao interna (Rafaela)',3,'portao_humano','manual',NULL,false,'em_andamento'),
  ('relatorio','aprovacao-interna','Aprovacao interna',4,'portao_humano','manual',NULL,false,'em_andamento'),
  ('relatorio','entregue','Entregue ao cliente',5,'terminal','nenhum',NULL,true,'concluido'),

  -- G. comercial / juridico (risco)
  ('comercial-juridico','briefing','Briefing comercial + pre-desenvolvimento IA',1,'portao_humano','manual','briefing.izzi',false,'aguardando_info'),
  ('comercial-juridico','geracao','Geracao (IA)',2,'agente','agente_ok','comercial.gerador-proposta',false,'em_andamento'),
  ('comercial-juridico','conformidade-lgpd','Conformidade LGPD (IA)',3,'agente','agente_ok','conformidade.consultor-lgpd',false,'em_andamento'),
  ('comercial-juridico','aprovacao-interna','Aprovacao interna (dupla)',4,'portao_humano','manual',NULL,false,'em_andamento'),
  ('comercial-juridico','enviado','Enviado ao cliente / assinatura',5,'terminal','nenhum',NULL,true,'concluido'),

  -- H. trafego pago
  ('trafego','briefing','Briefing + verba + pre-desenvolvimento IA',1,'portao_humano','manual','briefing.izzi',false,'aguardando_info'),
  ('trafego','plano-midia','Estrategia / plano de midia',2,'portao_humano','manual',NULL,true,'em_andamento'),
  ('trafego','configuracao','Configuracao de campanha',3,'execucao','nenhum',NULL,false,'em_andamento'),
  ('trafego','veiculacao','Veiculacao (no ar)',4,'execucao','nenhum',NULL,true,'em_andamento'),
  ('trafego','otimizacao','Monitoramento + otimizacao (IA)',5,'agente','agente_ok','trafego.otimizador',false,'em_andamento'),
  ('trafego','relatorio','Relatorio (IA)',6,'agente','agente_ok','trafego.relatorio-trafego',true,'em_andamento'),
  ('trafego','encerrada','Campanha encerrada',7,'terminal','nenhum',NULL,true,'concluido'),

  -- I-1. video interno
  ('video-interno','roteiro','Roteiro (do cronograma)',1,'portao_humano','manual',NULL,false,'a_fazer'),
  ('video-interno','captacao','Captacao / gravacao',2,'execucao','arquivo_entrega',NULL,true,'em_andamento'),
  ('video-interno','edicao','Edicao',3,'execucao','arquivo_entrega',NULL,false,'em_andamento'),
  ('video-interno','revisao','Revisao IA (tom + marca)',4,'agente','agente_ok','brand-system.validador-visual',false,'em_andamento'),
  ('video-interno','aprovacao-interna','Aprovacao interna',5,'portao_humano','manual',NULL,false,'em_andamento'),
  ('video-interno','aguardando-envio','Aguardando envio',6,'execucao','cron_data_cliente',NULL,false,'em_andamento'),
  ('video-interno','aprovacao-cliente','Aprovacao do cliente',7,'portao_humano','manual',NULL,true,'para_aprovacao'),
  ('video-interno','publicado','Publicado',8,'terminal','nenhum',NULL,true,'concluido'),

  -- I-2. video terceirizado (producao externa do cliente)
  ('video-terceirizado','roteiro','Roteiro (do cronograma)',1,'portao_humano','manual',NULL,true,'a_fazer'),
  ('video-terceirizado','envio-roteiro','Envio do roteiro ao terceirizado',2,'execucao','arquivo_entrega',NULL,true,'em_andamento'),
  ('video-terceirizado','producao-externa','Producao externa (fora da Simplizzia)',3,'execucao','arquivo_entrega',NULL,true,'em_andamento'),
  ('video-terceirizado','revisao-interna','Revisao interna (marca/tom)',4,'portao_humano','manual',NULL,false,'em_andamento'),
  ('video-terceirizado','aprovacao-cliente','Aprovacao do cliente',5,'portao_humano','manual',NULL,true,'para_aprovacao'),
  ('video-terceirizado','publicado','Publicado',6,'terminal','nenhum',NULL,true,'concluido'),

  -- J. blog seo/geo
  ('blog-seo','pauta','Pauta + palavra-chave + pre-desenvolvimento IA',1,'portao_humano','manual','briefing.izzi',false,'aguardando_info'),
  ('blog-seo','redacao','Redacao',2,'execucao','arquivo_entrega',NULL,true,'em_andamento'),
  ('blog-seo','otimizacao-seo','Otimizacao SEO/GEO (IA)',3,'agente','agente_ok','conteudo.seo-geo',false,'em_andamento'),
  ('blog-seo','revisao-tom','Revisao IA (tom de voz)',4,'agente','agente_ok','inteligencia.validador-tom',false,'em_andamento'),
  ('blog-seo','aprovacao-interna','Aprovacao interna',5,'portao_humano','manual',NULL,false,'em_andamento'),
  ('blog-seo','aguardando-envio','Aguardando envio',6,'execucao','cron_data_cliente',NULL,false,'em_andamento'),
  ('blog-seo','aprovacao-cliente','Aprovacao do cliente',7,'portao_humano','manual',NULL,true,'para_aprovacao'),
  ('blog-seo','publicado','Publicado',8,'terminal','nenhum',NULL,true,'concluido')
) AS e(fluxo_slug, slug, label, ordem, kind, avanca_por, agente_slug, visivel_cliente, status_canonico)
JOIN fluxos f
  ON f.organization_id = '00000000-0000-0000-0000-000000000001'
 AND f.slug = e.fluxo_slug
ON CONFLICT (fluxo_id, slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Mapear tipos_demanda -> fluxo (por categoria; overrides por slug)
-- ---------------------------------------------------------------------------
UPDATE tipos_demanda t SET fluxo_id = f.id
FROM fluxos f
WHERE f.organization_id = t.organization_id
  AND t.organization_id = '00000000-0000-0000-0000-000000000001'
  AND t.fluxo_id IS NULL
  AND f.slug = CASE t.categoria
    WHEN 'redes_sociais' THEN 'conteudo-social'
    WHEN 'linkedin'      THEN 'conteudo-social'
    WHEN 'embalagem'     THEN 'embalagem'
    WHEN 'video'         THEN 'video-interno'
    WHEN 'trafego'       THEN 'trafego'
    WHEN 'relatorio'     THEN 'relatorio'
    WHEN 'estrategia'    THEN 'relatorio'
    WHEN 'email'         THEN 'arte-avulsa'
    WHEN 'apresentacao'  THEN 'arte-avulsa'
    ELSE 'arte-avulsa'   -- 'outros' e demais
  END;

-- Overrides por slug (precisao onde a categoria nao basta)
UPDATE tipos_demanda t SET fluxo_id = f.id
FROM fluxos f
WHERE f.organization_id = t.organization_id
  AND t.organization_id = '00000000-0000-0000-0000-000000000001'
  AND f.slug = 'conteudo-social'
  AND t.slug = 'calendario-editorial';   -- feed da Familia A (cronograma)

COMMENT ON TABLE fluxos IS
  'Um fluxo por familia de demanda. As etapas (fluxo_etapas) mapeiam para status_card canonico. Ver spec 2026-08-06-kanban-fluxos.';
COMMENT ON TABLE fluxo_etapas IS
  'Etapas de um fluxo. kind=agente gateia; agente_slug em outras kinds e assistivo (pre-desenvolvimento). status_canonico liga ao enum status_card.';
