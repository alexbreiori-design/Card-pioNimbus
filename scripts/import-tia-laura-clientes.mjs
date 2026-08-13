/**
 * One-off import: Lista de pessoas Tia Laura → clientes Nimbus.
 * Usage: node scripts/import-tia-laura-clientes.mjs
 */
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function loadEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) {
    console.warn('env file missing:', filePath);
    return env;
  }
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\n/)) {
    const trimmed = line.replace(/^\uFEFF/, '').trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const i = trimmed.indexOf('=');
    if (i < 0) continue;
    const key = trimmed.slice(0, i).trim();
    let value = trimmed.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // Vercel CLI sometimes wraps values
    value = value.replace(/\\n/g, '\n');
    env[key] = value;
  }
  return env;
}

const envFiles = [
  path.join(root, '.env.local'),
  path.join(root, '.env.production.local'),
  path.join(process.cwd(), '.env.production.local'),
];
const env = {};
for (const file of envFiles) {
  Object.assign(env, loadEnvFile(file));
}
console.log(
  'env loaded url?',
  Boolean(env.NEXT_PUBLIC_SUPABASE_URL),
  'service?',
  Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
  'cwd',
  process.cwd()
);

const SLUG = 'tia-laura-restaurante';
const EMPRESA_ID = '38ed4444-604c-427f-847e-1bb6a2ac1965';
const PARSED = path.join(root, 'scripts', 'tmp_tia_laura_parsed.jsonl');
const DRY_RUN = process.argv.includes('--dry-run');

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

  // strip leading country 55 if present with full local
  if (raw.startsWith('55') && (raw.length === 12 || raw.length === 13)) {
    raw = raw.slice(2);
  }

  if (raw.length === 11 && raw[2] === '9') return raw;
  if (raw.length === 10) return raw; // landline with DDD
  if (raw.length === 9 && raw[0] === '9') return `43${raw}`; // mobile without DDD
  if (raw.length === 8) return `43${raw}`; // landline without DDD

  // already has DDD but not classic shapes — keep if 10/11
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

function buildCustomers(records) {
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

    // Keep names as-is when present; only fall back if placeholder
    let nome = String(rec.nome || '').trim();
    if (isPlaceholderName(nome)) {
      const end = String(rec.endereco || '').trim();
      if (end && !isPlaceholderName(end) && end.toUpperCase() !== 'NÃO INFORMADO') {
        nome = end;
      } else {
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
            principal: true,
          }
        : null,
    });
  }

  const customers = [...byPhone.values()].sort((a, b) =>
    a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
  );

  return { customers, stats };
}

async function main() {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing production Supabase credentials (.env.production.local)');
  }
  if (!fs.existsSync(PARSED)) {
    throw new Error(`Missing parsed file: ${PARSED}. Run tmp_parse_tia_laura_people.py first.`);
  }

  const records = fs
    .readFileSync(PARSED, 'utf8')
    .split(/\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));

  const { customers, stats } = buildCustomers(records);
  console.log('Store', SLUG, EMPRESA_ID);
  console.log('Stats', stats);
  console.log('To import', customers.length);
  console.log('First 5', customers.slice(0, 5).map((c) => `${c.nome} / ${c.telefone}`));
  console.log('Last 5', customers.slice(-5).map((c) => `${c.nome} / ${c.telefone}`));

  if (DRY_RUN) {
    console.log('Dry run only — no writes.');
    return;
  }

  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: empresa, error: empresaError } = await sb
    .from('empresas')
    .select('id, slug, nome')
    .eq('id', EMPRESA_ID)
    .maybeSingle();
  if (empresaError) throw empresaError;
  if (!empresa || empresa.slug !== SLUG) {
    throw new Error(`Empresa mismatch: expected ${SLUG}, got ${JSON.stringify(empresa)}`);
  }

  const { count: existingCount } = await sb
    .from('clientes')
    .select('id', { count: 'exact', head: true })
    .eq('empresa_id', EMPRESA_ID);
  console.log('Existing clientes before import:', existingCount);

  // Fetch existing phones to skip safely
  const existingPhones = new Set();
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await sb
      .from('clientes')
      .select('telefone')
      .eq('empresa_id', EMPRESA_ID)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    (data || []).forEach((row) => existingPhones.add(String(row.telefone || '')));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  console.log('Existing phones loaded:', existingPhones.size);

  const toInsert = customers.filter((c) => !existingPhones.has(c.telefone));
  console.log('New to insert:', toInsert.length, '(skipped already present:', customers.length - toInsert.length, ')');

  let inserted = 0;
  let addresses = 0;
  let errors = 0;

  // Insert in alphabetical batches
  const BATCH = 100;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH);
    const rows = batch.map((c) => ({
      empresa_id: EMPRESA_ID,
      nome: c.nome,
      telefone: c.telefone,
    }));

    const { data: created, error } = await sb.from('clientes').insert(rows).select('id, telefone');
    if (error) {
      console.error('Batch insert error at', i, error.message);
      // fallback one-by-one for this batch
      for (const c of batch) {
        const { data: one, error: oneErr } = await sb
          .from('clientes')
          .insert({ empresa_id: EMPRESA_ID, nome: c.nome, telefone: c.telefone })
          .select('id, telefone')
          .maybeSingle();
        if (oneErr) {
          errors += 1;
          if (errors <= 10) console.error('  fail', c.telefone, oneErr.message);
          continue;
        }
        inserted += 1;
        if (c.address && one?.id) {
          const addr = {
            cliente_id: one.id,
            empresa_id: EMPRESA_ID,
            cep: c.address.cep,
            rua: c.address.street,
            numero: c.address.number,
            bairro: c.address.district,
            cidade: c.address.city,
            estado: c.address.state,
            complemento: c.address.complement,
            principal: true,
          };
          const { error: addrErr } = await sb.from('cliente_enderecos').insert(addr);
          if (!addrErr) addresses += 1;
        }
      }
      continue;
    }

    inserted += (created || []).length;
    const idByPhone = new Map((created || []).map((row) => [row.telefone, row.id]));
    const addrRows = [];
    for (const c of batch) {
      const id = idByPhone.get(c.telefone);
      if (!id || !c.address) continue;
      addrRows.push({
        cliente_id: id,
        empresa_id: EMPRESA_ID,
        cep: c.address.cep,
        rua: c.address.street,
        numero: c.address.number,
        bairro: c.address.district,
        cidade: c.address.city,
        estado: c.address.state,
        complemento: c.address.complement,
        principal: true,
      });
    }
    if (addrRows.length) {
      const { error: addrErr } = await sb.from('cliente_enderecos').insert(addrRows);
      if (addrErr) {
        console.error('Address batch error at', i, addrErr.message);
      } else {
        addresses += addrRows.length;
      }
    }

    if ((i / BATCH) % 10 === 0) {
      console.log(`Progress ${Math.min(i + BATCH, toInsert.length)}/${toInsert.length}`);
    }
  }

  const { count: afterCount } = await sb
    .from('clientes')
    .select('id', { count: 'exact', head: true })
    .eq('empresa_id', EMPRESA_ID);

  console.log('Done.');
  console.log({ inserted, addresses, errors, afterCount });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
