-- =============================================================================
-- Migração 006 — Supabase Storage: bucket content-files
-- =============================================================================
-- Cria o bucket privado para arquivos de demandas (entregas, referências,
-- revisões). Todo acesso ao bucket ocorre via service role na camada de
-- aplicação (actions.ts). A validação de permissão é feita pelo RLS da tabela
-- `arquivos` antes de gerar URLs assinadas.
-- =============================================================================

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'content-files',
  'content-files',
  false,
  52428800, -- 50 MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Nota: não criamos políticas de storage aqui porque todo acesso ao bucket
-- é feito via service role (createServiceClient). As políticas de acesso aos
-- dados estão na tabela `arquivos` (RLS granular — migração 000004).
