export function getTimeGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function formatGreetingName(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return 'Nimbus';
  return trimmed.split(/\s+/)[0];
}
