/** Ex.: "há 12 min", "há 2h", "agora" */
export function formatOrderAgePt(isoDate, now = new Date()) {
  if (!isoDate) return '';
  const then = new Date(isoDate).getTime();
  const nowMs = now.getTime();
  if (!Number.isFinite(then) || !Number.isFinite(nowMs)) return '';

  const diffMs = Math.max(0, nowMs - then);
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;

  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}
