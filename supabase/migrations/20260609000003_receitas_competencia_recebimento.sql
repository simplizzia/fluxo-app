-- Adiciona campos de competência contábil e data de recebimento às receitas

ALTER TABLE financeiro_receitas
  ADD COLUMN IF NOT EXISTS competencia date,
  ADD COLUMN IF NOT EXISTS recebimento date;

COMMENT ON COLUMN financeiro_receitas.competencia IS
  'Mês de competência contábil (primeiro dia do mês). Define em qual mês esta receita é registrada contabilmente.';

COMMENT ON COLUMN financeiro_receitas.recebimento IS
  'Data em que o pagamento foi efetivamente recebido pelo cliente.';
