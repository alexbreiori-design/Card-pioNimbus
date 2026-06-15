export function cupomToRow(empresaId, cupom) {
  const tipoDesconto = cupom?.tipoDesconto === 'percentual' ? 'percentual' : 'valor';
  return {
    empresa_id: empresaId,
    legacy_id: String(cupom.id),
    codigo: String(cupom.codigo || '')
      .trim()
      .toUpperCase(),
    tipo_desconto: tipoDesconto,
    valor_desconto: tipoDesconto === 'valor' ? Number(cupom.valorDesconto || 0) : null,
    percentual_desconto:
      tipoDesconto === 'percentual'
        ? Number(cupom.percentualDesconto ?? cupom.valorDesconto ?? 0)
        : null,
    ativo: cupom.ativo !== false,
    ordem: Number(cupom.ordem ?? 0),
    updated_at: new Date().toISOString(),
  };
}

export function cupomFromRow(row) {
  const tipoDesconto = row.tipo_desconto === 'percentual' ? 'percentual' : 'valor';
  return {
    id: row.legacy_id || String(row.id),
    codigo: row.codigo,
    tipoDesconto,
    valorDesconto: tipoDesconto === 'valor' ? Number(row.valor_desconto || 0) : 0,
    percentualDesconto:
      tipoDesconto === 'percentual' ? Number(row.percentual_desconto || 0) : 0,
    ativo: row.ativo !== false,
    ordem: row.ordem ?? 0,
  };
}
