-- Adiciona campo de competência contábil às despesas
-- Permite que o mês de referência seja diferente do mês de vencimento

ALTER TABLE financeiro_despesas
  ADD COLUMN IF NOT EXISTS competencia date;

COMMENT ON COLUMN financeiro_despesas.competencia IS
  'Mês de competência contábil (primeiro dia do mês). Quando preenchido, define em qual mês a despesa é exibida, independente do vencimento.';
