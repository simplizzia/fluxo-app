-- =============================================================================
-- Fluxo App — Sprint 2.1: Live Dashboards
-- Habilita Realtime para as tabelas que precisam de atualizações ao vivo.
-- =============================================================================

-- REPLICA IDENTITY FULL: payload do evento inclui todos os campos (antes e depois)
-- necessário para que o frontend consiga identificar o card pelo id no evento UPDATE/DELETE.

ALTER TABLE cards REPLICA IDENTITY FULL;
ALTER TABLE comentarios REPLICA IDENTITY FULL;

-- Adiciona as tabelas à publicação do Supabase Realtime
-- (supabase_realtime é criada automaticamente pelo Supabase)
ALTER PUBLICATION supabase_realtime ADD TABLE cards;
ALTER PUBLICATION supabase_realtime ADD TABLE comentarios;
