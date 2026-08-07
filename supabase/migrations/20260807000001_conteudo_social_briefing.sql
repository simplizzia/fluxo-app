-- ===========================================================================
-- Fluxo conteudo-social: adiciona a etapa de Briefing/Info no inicio
-- 2026-08-07
--
-- O fluxo nascia direto no 'design' porque foi modelado para o card que vem do
-- cronograma (conceito ja aprovado). Mas um card de conteudo criado MANUALMENTE
-- no board precisa comecar coletando informacoes — o cliente costuma abrir a
-- demanda sem tudo. Esta etapa (status aguardando_info) passa a ser o inicio;
-- a fiacao do desmembramento do cronograma posicionara os cards de la direto no
-- design (pulando o briefing), quando for construida.
--
-- Inserida em ordem 0: a trilha ordena por `ordem` ascendente, entao o briefing
-- vem antes do design (ordem 1) SEM renumerar as etapas existentes — evita
-- qualquer colisao com a UNIQUE(fluxo_id, ordem). Idempotente via ON CONFLICT.
--
-- Migration de DADOS (sem mudanca de schema — nao precisa de db:types).
-- ===========================================================================

DO $$
DECLARE
  v_org   uuid := '00000000-0000-0000-0000-000000000001';
  v_fluxo uuid;
BEGIN
  SELECT id INTO v_fluxo
  FROM fluxos
  WHERE organization_id = v_org AND slug = 'conteudo-social';

  IF v_fluxo IS NULL THEN
    RAISE NOTICE 'fluxo conteudo-social nao encontrado; nada a fazer';
    RETURN;
  END IF;

  INSERT INTO fluxo_etapas
    (organization_id, fluxo_id, slug, label, ordem, kind, avanca_por, agente_slug, visivel_cliente, status_canonico)
  VALUES
    (v_org, v_fluxo, 'briefing', 'Briefing + pre-desenvolvimento IA', 0,
     'portao_humano', 'manual', 'briefing.izzi', false, 'aguardando_info')
  ON CONFLICT (fluxo_id, slug) DO NOTHING;
END $$;
