-- Deduplica sm_categorias e ajusta referências

-- 1. Corrige Salário com tipo/cor errados
UPDATE sm_categorias SET tipo = 'receita', cor = '#22c55e' WHERE nome = 'Salário' AND tipo = 'despesa';
UPDATE sm_categorias SET cor = '#22c55e' WHERE nome = 'Salário' AND tipo = 'receita' AND cor = '#6366f1';

-- 2. Para cada grupo (user_id, nome, tipo), descobre o keeper (id mais antigo)
-- e atualiza transacoes/recorrentes que apontam para duplicatas
DO $$
DECLARE
  rec RECORD;
  keep_id uuid;
BEGIN
  FOR rec IN SELECT DISTINCT user_id, nome, tipo FROM sm_categorias LOOP
    SELECT id INTO keep_id FROM sm_categorias
    WHERE user_id = rec.user_id AND nome = rec.nome AND tipo = rec.tipo
    ORDER BY created_at LIMIT 1;

    UPDATE sm_transacoes SET categoria_id = keep_id
    WHERE categoria_id IN (
      SELECT id FROM sm_categorias
      WHERE user_id = rec.user_id AND nome = rec.nome AND tipo = rec.tipo
        AND id != keep_id
    );

    UPDATE sm_recorrentes SET categoria_id = keep_id
    WHERE categoria_id IN (
      SELECT id FROM sm_categorias
      WHERE user_id = rec.user_id AND nome = rec.nome AND tipo = rec.tipo
        AND id != keep_id
    );

    DELETE FROM sm_categorias
    WHERE user_id = rec.user_id AND nome = rec.nome AND tipo = rec.tipo
      AND id != keep_id;
  END LOOP;
END $$;

-- 3. Unique constraint
ALTER TABLE sm_categorias ADD CONSTRAINT sm_categorias_user_id_nome_tipo_key UNIQUE (user_id, nome, tipo);

NOTIFY pgrst, 'reload schema';
