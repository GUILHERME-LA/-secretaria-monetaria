-- ============================================================
-- Migration 001: sm → public + RPC functions
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. Move tabelas do schema sm para public
ALTER TABLE sm.sm_categorias SET SCHEMA public;
ALTER TABLE sm.sm_transacoes SET SCHEMA public;
ALTER TABLE IF EXISTS sm.sm_recorrentes SET SCHEMA public;
ALTER TABLE IF EXISTS sm.sm_auditoria SET SCHEMA public;

-- 2. Remove RPCs antigas do schema sm
DROP FUNCTION IF EXISTS sm.inserir_categoria;
DROP FUNCTION IF EXISTS sm.inserir_transacao;
DROP FUNCTION IF EXISTS sm.inserir_auditoria;
DROP FUNCTION IF EXISTS sm.inserir_recorrente;

-- 3. Recria RPCs no public
CREATE OR REPLACE FUNCTION inserir_categoria(nome TEXT, tipo TEXT, cor TEXT)
RETURNS UUID AS $$
  INSERT INTO sm_categorias (user_id, nome, tipo, cor)
  VALUES (auth.uid(), nome, tipo, cor)
  RETURNING id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION inserir_transacao(
  tipo TEXT, categoria_id UUID, descricao TEXT, valor NUMERIC, data DATE, status TEXT
)
RETURNS UUID AS $$
  INSERT INTO sm_transacoes (user_id, tipo, categoria_id, descricao, valor, data, status)
  VALUES (auth.uid(), tipo, categoria_id, descricao, valor, data, status)
  RETURNING id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION inserir_auditoria(
  transacao_id UUID, acao TEXT, justificativa TEXT,
  dados_anteriores JSONB, dados_novos JSONB
)
RETURNS UUID AS $$
  INSERT INTO sm_auditoria (user_id, transacao_id, acao, justificativa, dados_anteriores, dados_novos)
  VALUES (auth.uid(), transacao_id, acao, justificativa, dados_anteriores, dados_novos)
  RETURNING id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION inserir_recorrente(
  categoria_id UUID, descricao TEXT, valor NUMERIC, tipo TEXT, dia_vencimento INTEGER
)
RETURNS UUID AS $$
  INSERT INTO sm_recorrentes (user_id, categoria_id, descricao, valor, tipo, dia_vencimento)
  VALUES (auth.uid(), categoria_id, descricao, valor, tipo, dia_vencimento)
  RETURNING id;
$$ LANGUAGE sql SECURITY DEFINER;

-- 4. Permite que as roles chamem as funções
GRANT EXECUTE ON FUNCTION inserir_categoria TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inserir_transacao TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inserir_auditoria TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inserir_recorrente TO anon, authenticated;

-- 5. Força recarga do cache do PostgREST
NOTIFY pgrst, 'reload schema';
