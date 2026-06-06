const MS_DAY = 24 * 60 * 60 * 1000;

function parseGoLiveTs(goLiveDate) {
  if (!goLiveDate) return null;
  const value = String(goLiveDate).trim();
  if (!value) return null;
  const ts = new Date(`${value}T00:00:00`).getTime();
  return Number.isFinite(ts) ? ts : null;
}

function summarizePedidos(rows) {
  return (rows || []).reduce(
    (acc, row) => {
      acc.pedidos += 1;
      acc.faturamento += Number(row.total) || 0;
      return acc;
    },
    { pedidos: 0, faturamento: 0 }
  );
}

/** Comparativo antes/depois da data go-live (pedidos cardápio online). */
export function computeGoLiveComparison(pedidos, goLiveDate) {
  const goLiveTs = parseGoLiveTs(goLiveDate);
  if (!goLiveTs) {
    return { hasGoLive: false, antes: null, depois: null };
  }

  const antesRows = [];
  const depoisRows = [];
  (pedidos || []).forEach((row) => {
    const createdTs = row.created_at ? new Date(row.created_at).getTime() : 0;
    if (!createdTs) return;
    if (createdTs < goLiveTs) antesRows.push(row);
    else depoisRows.push(row);
  });

  return {
    hasGoLive: true,
    goLiveDate,
    antes: summarizePedidos(antesRows),
    depois: summarizePedidos(depoisRows),
  };
}

/** Série diária de pedidos (últimos N dias, inclusive dias zerados). */
export function computeDailySeries(pedidos, days = 30, now = Date.now()) {
  const safeDays = Math.max(7, Math.min(90, Number(days) || 30));
  const startTs = now - (safeDays - 1) * MS_DAY;
  const buckets = new Map();

  for (let index = 0; index < safeDays; index += 1) {
    const dayTs = startTs + index * MS_DAY;
    const key = new Date(dayTs).toISOString().slice(0, 10);
    buckets.set(key, { date: key, pedidos: 0, faturamento: 0 });
  }

  (pedidos || []).forEach((row) => {
    const createdTs = row.created_at ? new Date(row.created_at).getTime() : 0;
    if (!createdTs || createdTs < startTs) return;
    const key = new Date(createdTs).toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) return;
    bucket.pedidos += 1;
    bucket.faturamento += Number(row.total) || 0;
  });

  return Array.from(buckets.values());
}

/** Ranking de lojas por faturamento no período. */
export function buildStoreRanking(stores, pedidos, days = 30, now = Date.now()) {
  const safeDays = Math.max(7, Math.min(365, Number(days) || 30));
  const sinceTs = now - safeDays * MS_DAY;
  const metricsByEmpresa = new Map();

  (stores || []).forEach((store) => {
    metricsByEmpresa.set(store.id, {
      empresaId: store.id,
      slug: store.slug,
      nome: store.nome,
      cidade: store.endereco_cidade,
      segmento: store.segmento,
      pedidos: 0,
      faturamento: 0,
    });
  });

  (pedidos || []).forEach((row) => {
    const createdTs = row.created_at ? new Date(row.created_at).getTime() : 0;
    if (!createdTs || createdTs < sinceTs) return;
    const entry = metricsByEmpresa.get(row.empresa_id);
    if (!entry) return;
    entry.pedidos += 1;
    entry.faturamento += Number(row.total) || 0;
  });

  return Array.from(metricsByEmpresa.values())
    .sort((a, b) => b.faturamento - a.faturamento || b.pedidos - a.pedidos)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export function rankingToCsv(rows) {
  const header = 'Posição,Loja,Slug,Cidade,Pedidos,Faturamento (R$)';
  const lines = (rows || []).map((row) => {
    const faturamento = Number(row.faturamento || 0).toFixed(2).replace('.', ',');
    return [
      row.rank,
      `"${String(row.nome || '').replace(/"/g, '""')}"`,
      row.slug,
      `"${String(row.cidade || '').replace(/"/g, '""')}"`,
      row.pedidos,
      faturamento,
    ].join(',');
  });
  return [header, ...lines].join('\n');
}
