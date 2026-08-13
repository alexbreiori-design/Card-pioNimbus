import fs from 'fs';

const path =
  'C:/Users/Alex/.cursor/projects/c-Users-Alex-Documents-Card-pio-Digital/agent-tools/801b6cb9-24a8-4633-8f80-e412dba7018a.txt';
const raw = fs.readFileSync(path, 'utf8');
const j = JSON.parse(raw);
const rows = j.result?.result || j.result || [];
console.log('total events', rows.length);

const bad = rows.filter(
  (r) =>
    Number(r.status_code) === 400 ||
    String(r.event_message || '').includes('| 400 |')
);
console.log('bad400', bad.length);
bad.slice(0, 30).forEach((r) => console.log(r.event_message || r));

const cli = rows.filter((r) =>
  String(r.path || r.event_message || '').includes('clientes')
);
console.log('clientes hits', cli.length);
cli.slice(0, 20).forEach((r) =>
  console.log(r.status_code, String(r.event_message || '').slice(0, 300))
);

const codes = {};
rows.forEach((r) => {
  const c = String(r.status_code);
  codes[c] = (codes[c] || 0) + 1;
});
console.log('status counts', codes);
