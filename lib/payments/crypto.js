import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

function getEncryptionKey() {
  const raw = String(process.env.PAYMENTS_ENC_KEY || '').trim();
  if (!raw) throw new Error('PAYMENTS_ENC_KEY não configurada.');

  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('PAYMENTS_ENC_KEY deve conter 32 bytes em Base64.');
  }
  return key;
}

export function encryptSecret(value) {
  if (!value) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptSecret(payload) {
  if (!payload) return null;
  const [version, ivRaw, tagRaw, encryptedRaw] = String(payload).split('.');
  if (version !== 'v1' || !ivRaw || !tagRaw || !encryptedRaw) {
    throw new Error('Credencial cifrada inválida.');
  }
  const decipher = createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(ivRaw, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function createCheckoutToken() {
  return randomBytes(32).toString('base64url');
}

export function hashCheckoutToken(token) {
  return createHash('sha256').update(String(token || '')).digest('hex');
}

export function checkoutTokenMatches(token, expectedHash) {
  const actual = Buffer.from(hashCheckoutToken(token), 'hex');
  const expected = Buffer.from(String(expectedHash || ''), 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function stateSecret() {
  const secret = process.env.PAYMENTS_ENC_KEY || process.env.MP_CLIENT_SECRET || '';
  if (!secret) throw new Error('Segredo OAuth não configurado.');
  return secret;
}

export function signOAuthState(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', stateSecret()).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifyOAuthState(state) {
  const [encoded, signature] = String(state || '').split('.');
  if (!encoded || !signature) throw new Error('Estado OAuth inválido.');
  const expected = createHmac('sha256', stateSecret()).update(encoded).digest();
  const actual = Buffer.from(signature, 'base64url');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new Error('Estado OAuth inválido.');
  }
  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  if (!payload?.exp || Date.now() > Number(payload.exp)) {
    throw new Error('A autorização expirou. Tente conectar novamente.');
  }
  return payload;
}
