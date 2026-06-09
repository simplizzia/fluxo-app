-- Adiciona valor 'projeto' ao enum ciclo_cobranca
-- Usado para receitas/despesas pontuais (projeto único, sem recorrência)

ALTER TYPE ciclo_cobranca ADD VALUE IF NOT EXISTS 'projeto';
