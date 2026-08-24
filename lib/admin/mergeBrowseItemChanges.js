/** Mescla reordenação feita na lista filtrada (categoria/pesquisa) sem apagar itens fora da vista. */
export function mergeBrowseItemChanges(allItems, nextBrowse) {
  const byId = new Map((nextBrowse || []).map((item) => [item.id, item]));
  if (!byId.size) return allItems || [];
  return (allItems || []).map((item) => (byId.has(item.id) ? byId.get(item.id) : item));
}
