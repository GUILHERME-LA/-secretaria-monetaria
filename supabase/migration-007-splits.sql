-- Migration 007: Split Transactions
-- Permite dividir uma transação em múltiplas categorias/valores

CREATE TABLE IF NOT EXISTS sm_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transacao_id UUID NOT NULL REFERENCES sm_transacoes(id) ON DELETE CASCADE,
  categoria_id UUID NOT NULL REFERENCES sm_categorias(id) ON DELETE RESTRICT,
  descricao TEXT NOT NULL DEFAULT '',
  valor NUMERIC(12,2) NOT NULL CHECK (valor > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE sm_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "splits_own" ON sm_splits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sm_transacoes t
      WHERE t.id = sm_splits.transacao_id
        AND t.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_splits_transacao ON sm_splits(transacao_id);
