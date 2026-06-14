-- RPCs para o /api/db (chamadas via pg Pool, sem PostgREST)

-- ========== INSERTS (RETURNS UUID) ==========

CREATE OR REPLACE FUNCTION inserir_categoria(uid UUID, nome TEXT, tipo TEXT, cor TEXT)
RETURNS UUID AS $$
  INSERT INTO sm_categorias (user_id, nome, tipo, cor) VALUES (uid, nome, tipo, cor) RETURNING id;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION seed_categoria(uid UUID, nome TEXT, tipo TEXT, cor TEXT)
RETURNS UUID AS $$
  INSERT INTO sm_categorias (user_id, nome, tipo, cor) VALUES (uid, nome, tipo, cor)
  ON CONFLICT (user_id, nome, tipo) DO NOTHING RETURNING id;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION inserir_transacao(uid UUID, ptipo TEXT, pcategoria_id UUID, pdescricao TEXT, pvalor NUMERIC, pdata DATE, pstatus TEXT)
RETURNS UUID AS $$
  INSERT INTO sm_transacoes (user_id, tipo, categoria_id, descricao, valor, data, status)
  VALUES (uid, ptipo, pcategoria_id, pdescricao, pvalor, pdata, pstatus) RETURNING id;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION inserir_auditoria(uid UUID, ptransacao_id UUID, pacao TEXT, pjustificativa TEXT, pdados_anteriores JSONB, pdados_novos JSONB)
RETURNS UUID AS $$
  INSERT INTO sm_auditoria (user_id, transacao_id, acao, justificativa, dados_anteriores, dados_novos)
  VALUES (uid, ptransacao_id, pacao, pjustificativa, pdados_anteriores, pdados_novos) RETURNING id;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION inserir_recorrente(uid UUID, pcategoria_id UUID, pdescricao TEXT, pvalor NUMERIC, ptipo TEXT, pdia_vencimento INTEGER)
RETURNS UUID AS $$
  INSERT INTO sm_recorrentes (user_id, categoria_id, descricao, valor, tipo, dia_vencimento)
  VALUES (uid, pcategoria_id, pdescricao, pvalor, ptipo, pdia_vencimento) RETURNING id;
$$ LANGUAGE sql;

-- ========== UPDATES (RETURNS VOID) ==========

CREATE OR REPLACE FUNCTION atualizar_transacao(uid UUID, pid UUID, ptipo TEXT, pcategoria_id UUID, pdescricao TEXT, pvalor NUMERIC, pdata DATE)
RETURNS VOID AS $$
  UPDATE sm_transacoes SET tipo = ptipo, categoria_id = pcategoria_id, descricao = pdescricao, valor = pvalor, data = pdata
  WHERE id = pid AND user_id = uid;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION confirmar_transacao(uid UUID, pid UUID)
RETURNS VOID AS $$
  UPDATE sm_transacoes SET status = 'confirmada' WHERE id = pid AND user_id = uid;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION excluir_transacao(uid UUID, pid UUID)
RETURNS VOID AS $$
  DELETE FROM sm_transacoes WHERE id = pid AND user_id = uid;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION atualizar_recorrente(uid UUID, pid UUID, ptipo TEXT, pcategoria_id UUID, pdescricao TEXT, pvalor NUMERIC, pdia_vencimento INTEGER)
RETURNS VOID AS $$
  UPDATE sm_recorrentes SET tipo = ptipo, categoria_id = pcategoria_id, descricao = pdescricao, valor = pvalor, dia_vencimento = pdia_vencimento
  WHERE id = pid AND user_id = uid;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION toggle_recorrente(uid UUID, pid UUID)
RETURNS VOID AS $$
  UPDATE sm_recorrentes SET ativo = NOT ativo WHERE id = pid AND user_id = uid;
$$ LANGUAGE sql;

-- ========== LISTAGENS (RETURNS JSON) ==========

CREATE OR REPLACE FUNCTION listar_categorias_json(uid UUID, ptipo TEXT)
RETURNS JSON AS $$
  SELECT COALESCE(json_agg(sub ORDER BY nome), '[]'::json) FROM (
    SELECT * FROM sm_categorias WHERE user_id = uid AND tipo = ptipo
  ) sub;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION listar_transacoes_mes_json(uid UUID, inicio DATE, fim DATE)
RETURNS JSON AS $$
  SELECT COALESCE(json_agg(sub), '[]'::json) FROM (
    SELECT t.*, c.nome AS categoria_nome, c.cor AS categoria_cor
    FROM sm_transacoes t LEFT JOIN sm_categorias c ON c.id = t.categoria_id
    WHERE t.user_id = uid AND t.data >= inicio AND t.data <= fim
    ORDER BY t.data DESC
  ) sub;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION listar_meses_json(uid UUID)
RETURNS JSON AS $$
  SELECT COALESCE(json_agg(sub), '[]'::json) FROM (
    SELECT DISTINCT data FROM sm_transacoes WHERE user_id = uid ORDER BY data
  ) sub;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION listar_totais_mes_json(uid UUID, inicio DATE, fim DATE)
RETURNS JSON AS $$
  SELECT COALESCE(json_agg(sub), '[]'::json) FROM (
    SELECT tipo, valor, status FROM sm_transacoes WHERE user_id = uid AND data >= inicio AND data <= fim
  ) sub;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION obter_transacao_json(uid UUID, pid UUID)
RETURNS JSON AS $$
  SELECT row_to_json(sub) FROM (
    SELECT * FROM sm_transacoes WHERE id = pid AND user_id = uid
  ) sub;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION buscar_categoria_json(uid UUID, pnome TEXT, ptipo TEXT)
RETURNS JSON AS $$
  SELECT row_to_json(sub) FROM (
    SELECT id FROM sm_categorias WHERE nome = pnome AND tipo = ptipo AND user_id = uid
  ) sub;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION listar_auditoria_json(uid UUID)
RETURNS JSON AS $$
  SELECT COALESCE(json_agg(sub), '[]'::json) FROM (
    SELECT * FROM sm_auditoria WHERE user_id = uid ORDER BY created_at DESC
  ) sub;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION listar_recorrentes_json(uid UUID)
RETURNS JSON AS $$
  SELECT COALESCE(json_agg(sub), '[]'::json) FROM (
    SELECT r.*, c.nome AS categoria_nome
    FROM sm_recorrentes r LEFT JOIN sm_categorias c ON c.id = r.categoria_id
    WHERE r.user_id = uid ORDER BY r.dia_vencimento
  ) sub;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION listar_recorrentes_ativos_json(uid UUID)
RETURNS JSON AS $$
  SELECT COALESCE(json_agg(sub), '[]'::json) FROM (
    SELECT id, categoria_id, descricao, valor, tipo, dia_vencimento
    FROM sm_recorrentes WHERE user_id = uid AND ativo = true
  ) sub;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION listar_pendentes_mes_json(uid UUID, inicio DATE, fim DATE)
RETURNS JSON AS $$
  SELECT COALESCE(json_agg(sub), '[]'::json) FROM (
    SELECT descricao, tipo, categoria_id FROM sm_transacoes
    WHERE user_id = uid AND status = 'pendente' AND data >= inicio AND data <= fim
  ) sub;
$$ LANGUAGE sql;
