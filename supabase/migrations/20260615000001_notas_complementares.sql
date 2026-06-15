-- Adiciona campo para registrar respostas/notas por marca quando não há reunião de kick-off
ALTER TABLE onboarding_marcas
  ADD COLUMN IF NOT EXISTS notas_complementares text;
