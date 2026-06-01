-- =============================================================================
-- Fluxo App — Sprint 3.1: Universo da Marca
-- 2026-05-27
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Storage bucket: brand-assets (logos, paleta, tipografia, elementos, mockups)
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brand-assets',
  'brand-assets',
  false,
  104857600, -- 100 MB (arquivos fonte podem ser grandes)
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf',
    'application/postscript',               -- .ai
    'application/octet-stream',             -- .psd, .ai, .fig genérico
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'font/ttf', 'font/otf', 'font/woff', 'font/woff2',
    'application/zip'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Índices de desempenho para queries da marca
-- ---------------------------------------------------------------------------

-- Busca de seções do universo da marca por cliente (ordenado por categoria)
CREATE INDEX IF NOT EXISTS idx_universo_marca_cliente
  ON universo_marca(organization_id, cliente_id, categoria);

-- Busca de ativos visuais por cliente e categoria
CREATE INDEX IF NOT EXISTS idx_ident_visual_cliente_cat
  ON identidade_visual_ativos(organization_id, cliente_id, categoria);

-- Busca de moodboard por cliente e seção
CREATE INDEX IF NOT EXISTS idx_moodboard_cliente_secao
  ON moodboard_items(organization_id, cliente_id, secao, ordem);

-- Busca de padrões por cliente (loop de aprendizado)
CREATE INDEX IF NOT EXISTS idx_padroes_cliente_id
  ON padroes_cliente(organization_id, cliente_id);
