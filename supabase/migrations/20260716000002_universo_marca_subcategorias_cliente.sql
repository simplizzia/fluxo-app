-- ============================================================================
-- universo_marca — subcategorias permitidas em nível-cliente
-- 2026-07-16
--
-- Formaliza no banco (fonte de verdade, não só no código do agente) a lista
-- fechada de subcategorias que podem viver em nível-cliente (marca_id NULL).
-- Documentos de nível-cliente são injetados automaticamente em TODAS as
-- marcas do cliente por buildContextoCliente() — sem essa restrição, um
-- documento salvo por engano com marca_id NULL vaza entre marcas irmãs
-- (ex: conteúdo de Trevo aparecendo em prompts de Ehrmann).
-- ============================================================================

ALTER TABLE universo_marca
  ADD CONSTRAINT chk_universo_marca_subcategoria_cliente CHECK (
    marca_id IS NOT NULL
    OR subcategoria IN ('perfil_cliente', 'prep_reuniao', 'estrutura_empresa', 'briefing_completo')
    OR subcategoria IS NULL
  );

COMMENT ON CONSTRAINT chk_universo_marca_subcategoria_cliente ON universo_marca IS
  'Documentos de nível-cliente (marca_id NULL) só podem usar subcategorias desta lista fechada — são as únicas que buildContextoCliente() injeta em TODAS as marcas do cliente. briefing_completo é mantido por compatibilidade histórica mas é explicitamente EXCLUÍDO da query de contexto em executor.ts — não usar para novos documentos.';
