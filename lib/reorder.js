export function reorderByDrag(list, fromId, toId, getId = (item) => item.id) {
  const fromIdx = list.findIndex((x) => getId(x) === fromId);
  const toIdx = list.findIndex((x) => getId(x) === toId);
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return list;
  const next = [...list];
  const [moved] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, moved);
  return next.map((item, idx) => ({ ...item, ordem: idx }));
}
