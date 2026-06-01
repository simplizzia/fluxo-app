-- =============================================================================
-- Fluxo App — Sprint 1.3: Calendário + Controle de Uso do Plano
-- 2026-05-26
-- =============================================================================

-- Índice composto para queries de uso mensal do plano
-- (cards por cliente no mês corrente, excluindo cancelados)
CREATE INDEX IF NOT EXISTS idx_cards_created_cliente
ON cards(organization_id, cliente_id, created_at)
WHERE status != 'cancelado';

-- Índice para cards com prazo_cliente (calendário)
-- (já existe idx_cards_prazo_cliente, este cobre o filtro por data de criação)
CREATE INDEX IF NOT EXISTS idx_cards_prazo_status
ON cards(organization_id, prazo_cliente, status)
WHERE prazo_cliente IS NOT NULL AND status NOT IN ('cancelado', 'concluido');
