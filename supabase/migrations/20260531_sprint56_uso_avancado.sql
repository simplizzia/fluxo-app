-- =============================================================================
-- Sprint 5.6 — WhatsApp + Controle de Uso Avançado
-- Colunas em planos, cards; tabela planos_configuracao
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Adiciona unidade de controle e créditos ao plano da organização
-- Idempotente: ALTER TABLE ADD COLUMN IF NOT EXISTS
-- ---------------------------------------------------------------------------
ALTER TABLE organizacoes
  ADD COLUMN IF NOT EXISTS unidade_controle text
    NOT NULL DEFAULT 'demandas'
    CHECK (unidade_controle IN ('demandas', 'horas', 'creditos')),
  ADD COLUMN IF NOT EXISTS creditos_por_tipo jsonb
    NOT NULL DEFAULT '{}';
-- Exemplo creditos_por_tipo: {"post_feed": 1, "reels": 2, "identidade": 5}

-- ---------------------------------------------------------------------------
-- Adiciona créditos/horas ao card
-- ---------------------------------------------------------------------------
ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS creditos_consumidos integer,
  ADD COLUMN IF NOT EXISTS horas_estimadas     integer,
  ADD COLUMN IF NOT EXISTS horas_realizadas    integer;

-- ---------------------------------------------------------------------------
-- Tabela de mensagens WhatsApp recebidas (log para rastreabilidade)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS whatsapp_mensagens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,

  -- Identificação do remetente
  numero_remetente text NOT NULL,   -- E.164: "+5511999999999"
  nome_remetente   text,
  mensagem_id      text,            -- ID da mensagem na plataforma (idempotência)

  -- Conteúdo
  tipo_mensagem    text NOT NULL DEFAULT 'text',  -- text|image|audio|document
  conteudo_texto   text,
  media_url        text,

  -- Card gerado (nullable — pode falhar ou ser descartado)
  card_id          uuid REFERENCES cards(id) ON DELETE SET NULL,

  -- Status de processamento
  status           text NOT NULL DEFAULT 'recebido'
    CHECK (status IN ('recebido', 'processando', 'card_criado', 'ignorado', 'erro')),
  erro_detalhes    text,

  recebido_em      timestamptz NOT NULL DEFAULT now(),
  processado_em    timestamptz
);

ALTER TABLE whatsapp_mensagens ENABLE ROW LEVEL SECURITY;

-- Apenas sócias veem o histórico de WhatsApp
CREATE POLICY "whatsapp_socia_read" ON whatsapp_mensagens
  FOR SELECT USING (
    organization_id = auth_organization_id()
    AND is_socia()
  );

-- Service role insere (webhook)
CREATE POLICY "whatsapp_service_insert" ON whatsapp_mensagens
  FOR INSERT WITH CHECK (true);
CREATE POLICY "whatsapp_service_update" ON whatsapp_mensagens
  FOR UPDATE USING (true);

-- Índice para idempotência (mensagem_id é único por organização)
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_msg_id
  ON whatsapp_mensagens(organization_id, mensagem_id)
  WHERE mensagem_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_org_status
  ON whatsapp_mensagens(organization_id, status);
