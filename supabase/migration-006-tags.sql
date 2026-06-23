-- Migration 006: Sistema de Tags
-- Tabela de tags por usuário
CREATE TABLE IF NOT EXISTS sm_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cor TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, nome)
);

-- Tabela de relação transação-tag (N:N)
CREATE TABLE IF NOT EXISTS sm_transacao_tags (
  transacao_id UUID NOT NULL REFERENCES sm_transacoes(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES sm_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (transacao_id, tag_id)
);

-- RLS
ALTER TABLE sm_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE sm_transacao_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tags_own" ON sm_tags FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "transacao_tags_own" ON sm_transacao_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sm_transacoes t
      WHERE t.id = sm_transacao_tags.transacao_id
        AND t.user_id = auth.uid()
    )
  );

-- Índices
CREATE INDEX IF NOT EXISTS idx_tags_user ON sm_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_transacao_tags_transacao ON sm_transacao_tags(transacao_id);
CREATE INDEX IF NOT EXISTS idx_transacao_tags_tag ON sm_transacao_tags(tag_id);
