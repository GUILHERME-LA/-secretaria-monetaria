export async function autoCriarRecorrentes() {
  const now = new Date();
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const ultimoDia = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const resRec = await fetch("/api/db", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "listar_recorrentes_ativos", payload: {} }),
  });
  const { data: recorrentes } = await resRec.json();

  if (!recorrentes || recorrentes.length === 0) return 0;

  const resEx = await fetch("/api/db", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "listar_pendentes_mes", payload: { inicio: `${mesAtual}-01`, fim: `${mesAtual}-${String(ultimoDia).padStart(2, "0")}` } }),
  });
  const { data: existentes } = await resEx.json();

  let criadas = 0;

  for (const rec of recorrentes) {
    const jaExiste = existentes?.some(
      (e: any) =>
        e.descricao === rec.descricao &&
        e.tipo === rec.tipo &&
        e.categoria_id === rec.categoria_id
    );

    if (jaExiste) continue;

    const dia = Math.min(rec.dia_vencimento, ultimoDia);
    const data = `${mesAtual}-${String(dia).padStart(2, "0")}`;

    const res = await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "inserir_transacao",
        payload: { categoria_id: rec.categoria_id, descricao: rec.descricao, valor: rec.valor, tipo: rec.tipo, data, status: "pendente" },
      }),
    });
    const dbData = await res.json();
    if (!dbData.error) criadas++;
  }

  return criadas;
}
