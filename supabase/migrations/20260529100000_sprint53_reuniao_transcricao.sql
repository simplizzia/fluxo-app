-- =============================================================================
-- Sprint 5.3 — Reuniões: Transcrição de Áudio + Google Meet / Gemini Notes
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Colunas adicionadas à tabela reunioes
-- ---------------------------------------------------------------------------

ALTER TABLE reunioes
  ADD COLUMN IF NOT EXISTS audio_storage_path  text,
  ADD COLUMN IF NOT EXISTS meet_space_id        text,
  ADD COLUMN IF NOT EXISTS transcricao_bruta   text,
  ADD COLUMN IF NOT EXISTS transcricao_status  text NOT NULL DEFAULT 'nenhuma'
    CHECK (transcricao_status IN ('nenhuma', 'processando', 'concluida', 'erro'));

COMMENT ON COLUMN reunioes.audio_storage_path IS
  'Caminho no bucket "reunioes-audio" do arquivo de áudio enviado para transcrição via Whisper.';

COMMENT ON COLUMN reunioes.meet_space_id IS
  'ID do espaço no Google Meet (ex: abc-defg-hij), usado para importar Gemini notes.';

COMMENT ON COLUMN reunioes.transcricao_bruta IS
  'Texto completo gerado pelo Whisper (áudio) ou importado do Google Meet / Gemini.';

COMMENT ON COLUMN reunioes.transcricao_status IS
  'Estado do processo de transcrição: nenhuma | processando | concluida | erro.';

-- ---------------------------------------------------------------------------
-- 2. Bucket de Storage: reunioes-audio
--    (Cria apenas se não existir — idempotente)
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reunioes-audio',
  'reunioes-audio',
  false,
  209715200,  -- 200 MB
  '{audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/webm,audio/aac,video/mp4,video/webm,video/quicktime}'
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. RLS no bucket reunioes-audio
--    Equipe autenticada da org pode fazer upload / download.
--    Service role (cron/transcription API) usa bypass.
-- ---------------------------------------------------------------------------

-- Upload: qualquer membro da equipe pode enviar
CREATE POLICY "reunioes_audio_equipe_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'reunioes-audio'
    AND (storage.foldername(name))[1] = auth_organization_id()::text
  );

-- Download / select: qualquer membro da equipe pode ler
CREATE POLICY "reunioes_audio_equipe_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'reunioes-audio'
    AND (storage.foldername(name))[1] = auth_organization_id()::text
  );

-- Delete: somente sócias
CREATE POLICY "reunioes_audio_socia_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'reunioes-audio'
    AND (storage.foldername(name))[1] = auth_organization_id()::text
    AND is_socia()
  );

-- ---------------------------------------------------------------------------
-- 4. Índice para buscas por meet_space_id
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_reunioes_meet_space
  ON reunioes(meet_space_id)
  WHERE meet_space_id IS NOT NULL;
