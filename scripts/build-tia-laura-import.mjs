/**
 * Build alphabetical import payload for Tia Laura clients.
 * Reads scripts/tmp_tia_laura_parsed.jsonl
 * Writes scripts/tmp_tia_laura_import.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const PARSED = path.join(root, 'scripts', 'tmp_tia_laura_parsed.jsonl');
const OUT = path.join(root, 'scripts', 'tmp_tia_laura_import.json');
const SQL_DIR = path.join(root, 'scripts', 'tmp_tia_laura_sql');

const EMPRESA_ID = '38ed4444-604c-427f-847e-1bb6a2ac1965';

const PLACEHOLDER_NAMES = new Set([
  '',
  '-',
  '.',
  '..',
  '...',
  '....',
  '.....',
  '__',
  '___',
  'NÃO INFORMADO',
  'NAO INFORMADO',
  'NÃO IDENTIFICADA',
  'NAO IDENTIFICADA',
  'CLIENTE FINAL',
]);

function digits(value) {
  return String(value || '').replace(/\D/g, '');
}

function sqlString(value) {
  if (value == null || value === '') return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function isPlaceholderName(name) {
  const n = String(name || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
  if (PLACEHOLDER_NAMES.has(n)) return true;
  return /^[.\-_/\s]+$/.test(n || '');
}

function normalizePhone(fone, cel) {
  let raw = digits(cel) || digits(fone);
  if (!raw) return null;
  if (raw.startsWith('55') && (raw.length === 12 || raw.length === 13)) {
    raw = raw.slice(2);
  }
  // drop trunk prefix 0 (e.g. 0433...)
  if (raw.startsWith('0') && raw.length >= 11) {
    raw = raw.replace(/^0+/, '');
  }
  if (raw.length === 11 && raw[2] === '9') return raw;
  if (raw.length === 10) return raw;
  if (raw.length === 9 && raw[0] === '9') return `43${raw}`;
  if (raw.length === 8) return `43${raw}`;
  if (raw.length === 11 || raw.length === 10) return raw;
  return null;
}

function parseMunicipio(mun) {
  const text = String(mun || '').trim();
  if (!text) return { city: 'Londrina', state: 'PR' };
  const m = text.match(/^(.+?)\s*-\s*([A-Za-z]{2})$/);
  if (m) return { city: m[1].trim(), state: m[2].trim().toUpperCase() };
  return { city: text, state: 'PR' };
}

const records = fs
  .readFileSync(PARSED, 'utf8')
  .split(/\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line));

const byPhone = new Map();
const stats = {
  raw: records.length,
  skippedFunc: 0,
  skippedNoName: 0,
  skippedBadPhone: 0,
  skippedDupPhone: 0,
  withAddress: 0,
};

for (const rec of records) {
  const tipo = String(rec.tipo || '').toUpperCase();
  if (tipo.includes('FUNC') && tipo !== 'CLI') {
    stats.skippedFunc += 1;
    continue;
  }

  let nome = String(rec.nome || '').trim();
  if (isPlaceholderName(nome)) {
    const end = String(rec.endereco || '').trim();
    if (end && !isPlaceholderName(end)) nome = end;
    else {
      stats.skippedNoName += 1;
      continue;
    }
  }

  const telefone = normalizePhone(rec.fone, rec.cel);
  if (!telefone || telefone.length < 10 || telefone.length > 11) {
    stats.skippedBadPhone += 1;
    continue;
  }
  if (byPhone.has(telefone)) {
    stats.skippedDupPhone += 1;
    continue;
  }

  const { city, state } = parseMunicipio(rec.municipio);
  const street = String(rec.endereco || '').trim();
  const number = String(rec.numero || '').trim();
  const district = String(rec.bairro || '').trim();
  const complement = String(rec.complemento || '').trim();
  const cepDigits = digits(rec.cep);
  const cep = cepDigits && cepDigits !== '00000000' ? cepDigits : '';
  const hasAddress = Boolean(street || number || district || complement || cep);
  if (hasAddress) stats.withAddress += 1;

  byPhone.set(telefone, {
    nome,
    telefone,
    address: hasAddress
      ? {
          street: street || '-',
          number: number || null,
          district: district || '-',
          city: city || 'Londrina',
          state: state || 'PR',
          complement: complement || null,
          cep: cep || null,
        }
      : null,
  });
}

const customers = [...byPhone.values()].sort((a, b) =>
  a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
);

fs.writeFileSync(OUT, JSON.stringify({ empresaId: EMPRESA_ID, stats, customers }, null, 2));
console.log('wrote', OUT);
console.log(stats);
console.log('customers', customers.length);

fs.mkdirSync(SQL_DIR, { recursive: true });
const BATCH = 400;
let fileIndex = 0;
for (let i = 0; i < customers.length; i += BATCH) {
  const batch = customers.slice(i, i + BATCH);
  const values = batch
    .map(
      (c) =>
        `(gen_random_uuid(), '${EMPRESA_ID}', ${sqlString(c.nome)}, ${sqlString(c.telefone)}, now(), now())`
    )
    .join(',\n');

  const sql = `INSERT INTO public.clientes (id, empresa_id, nome, telefone, created_at, updated_at)
VALUES
${values}
ON CONFLICT (empresa_id, telefone) DO NOTHING;`;

  const file = path.join(SQL_DIR, `clientes_${String(fileIndex).padStart(3, '0')}.sql`);
  fs.writeFileSync(file, sql);
  fileIndex += 1;
}

// Address SQL uses phone join after clientes exist
const addrCustomers = customers.filter((c) => c.address);
fileIndex = 0;
for (let i = 0; i < addrCustomers.length; i += BATCH) {
  const batch = addrCustomers.slice(i, i + BATCH);
  const values = batch
    .map((c) => {
      const a = c.address;
      return `(gen_random_uuid(), c.id, '${EMPRESA_ID}', ${sqlString(a.cep)}, ${sqlString(a.street)}, ${sqlString(a.number)}, ${sqlString(a.district)}, ${sqlString(a.city)}, ${sqlString(a.state)}, ${sqlString(a.complement)}, NULL, true, now())`;
    })
    .join(',\n');

  const phones = batch.map((c) => sqlString(c.telefone)).join(', ');
  const sql = `WITH c AS (
  SELECT id, telefone FROM public.clientes
  WHERE empresa_id = '${EMPRESA_ID}' AND telefone IN (${phones})
)
INSERT INTO public.cliente_enderecos (
  id, cliente_id, empresa_id, cep, rua, numero, bairro, cidade, estado, complemento, referencia, principal, created_at
)
SELECT v.col1, v.col2, v.col3, v.col4, v.col5, v.col6, v.col7, v.col8, v.col9, v.col10, v.col11, v.col12, v.col13
FROM (
  VALUES
${batch
  .map((c) => {
    const a = c.address;
    return `  (${sqlString(c.telefone)}, ${sqlString(a.cep)}, ${sqlString(a.street)}, ${sqlString(a.number)}, ${sqlString(a.district)}, ${sqlString(a.city)}, ${sqlString(a.state)}, ${sqlString(a.complement)})`;
  })
  .join(',\n')}
) AS src(telefone, cep, rua, numero, bairro, cidade, estado, complemento)
JOIN c ON c.telefone = src.telefone
CROSS JOIN LATERAL (
  SELECT gen_random_uuid(), c.id, '${EMPRESA_ID}'::uuid, src.cep, src.rua, src.numero, src.bairro, src.cidade, src.estado, src.complemento, NULL::text, true, now()
) AS v(col1, col2, col3, col4, col5, col6, col7, col8, col9, col10, col11, col12, col13)
WHERE NOT EXISTS (
  SELECT 1 FROM public.cliente_enderecos e WHERE e.cliente_id = c.id AND e.empresa_id = '${EMPRESA_ID}'
);`;

  // Simpler address insert
  const simple = `INSERT INTO public.cliente_enderecos (
  id, cliente_id, empresa_id, cep, rua, numero, bairro, cidade, estado, complemento, referencia, principal, created_at
)
SELECT gen_random_uuid(), c.id, '${EMPRESA_ID}', src.cep, src.rua, src.numero, src.bairro, src.cidade, src.estado, src.complemento, NULL, true, now()
FROM (
  VALUES
${batch
  .map((c) => {
    const a = c.address;
    return `  (${sqlString(c.telefone)}::text, ${sqlString(a.cep)}::text, ${sqlString(a.street)}::text, ${sqlString(a.number)}::text, ${sqlString(a.district)}::text, ${sqlString(a.city)}::text, ${sqlString(a.state)}::text, ${sqlString(a.complement)}::text)`;
  })
  .join(',\n')}
) AS src(telefone, cep, rua, numero, bairro, cidade, estado, complemento)
JOIN public.clientes c
  ON c.empresa_id = '${EMPRESA_ID}' AND c.telefone = src.telefone
WHERE NOT EXISTS (
  SELECT 1 FROM public.cliente_enderecos e
  WHERE e.cliente_id = c.id AND e.empresa_id = '${EMPRESA_ID}'
);`;

  const file = path.join(SQL_DIR, `enderecos_${String(fileIndex).padStart(3, '0')}.sql`);
  fs.writeFileSync(file, simple);
  fileIndex += 1;
}

console.log('sql files in', SQL_DIR);
