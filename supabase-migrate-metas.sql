-- ============================================
-- Migration: Metas Financeiras no banco de dados
-- Execute este SQL no SQL Editor do Supabase
-- ============================================

-- 1. Tabela sm_metas
CREATE TABLE IF NOT EXISTS sm_metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  titulo TEXT NOT NULL,
  valor_objetivo NUMERIC(12,2) NOT NULL,
  valor_atual NUMERIC(12,2) DEFAULT 0,
  cor TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sm_metas ENABLE ROW LEVEL SECURITY;

-- 2. RPC: criar_meta
CREATE OR REPLACE FUNCTION criar_meta(
  p_user_id UUID,
  p_titulo TEXT,
  p_valor_objetivo NUMERIC,
  p_valor_atual NUMERIC DEFAULT 0,
  p_cor TEXT DEFAULT '#6366f1'
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO sm_metas (user_id, titulo, valor_objetivo, valor_atual, cor)
  VALUES (p_user_id, p_titulo, p_valor_objetivo, p_valor_atual, p_cor)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RPC: listar_metas_json
CREATE OR REPLACE FUNCTION listar_metas_json(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'id', m.id,
        'titulo', m.titulo,
        'valor_objetivo', m.valor_objetivo,
        'valor_atual', m.valor_atual,
        'cor', m.cor,
        'created_at', m.created_at
      ) ORDER BY m.created_at DESC
    ), '[]'::JSON
  ) INTO v_result
  FROM sm_metas m
  WHERE m.user_id = p_user_id;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC: atualizar_valor_meta
CREATE OR REPLACE FUNCTION atualizar_valor_meta(
  p_user_id UUID,
  p_id UUID,
  p_valor_atual NUMERIC
) RETURNS VOID AS $$
BEGIN
  UPDATE sm_metas
  SET valor_atual = GREATEST(LEAST(p_valor_atual, valor_objetivo), 0)
  WHERE id = p_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC: excluir_meta
CREATE OR REPLACE FUNCTION excluir_meta(
  p_user_id UUID,
  p_id UUID
) RETURNS VOID AS $$
BEGIN
  DELETE FROM sm_metas WHERE id = p_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
