const buckets = new Map();

function pruneBucket(bucket, windowMs, now) {
  while (bucket.timestamps.length && bucket.timestamps[0] <= now - windowMs) {
    bucket.timestamps.shift();
  }
}

/** IP do cliente (Vercel / proxy). */
export function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

/**
 * Janela deslizante em memória (por instância serverless).
 * Para limite global em produção, use KV/Redis (ver docs/OPS.md).
 */
export function checkRateLimit({ key, max, windowMs }) {
  const now = Date.now();
  const safeMax = Math.max(1, Number(max) || 10);
  const safeWindow = Math.max(1000, Number(windowMs) || 60_000);
  const bucketKey = String(key);

  let bucket = buckets.get(bucketKey);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(bucketKey, bucket);
  }

  pruneBucket(bucket, safeWindow, now);

  if (bucket.timestamps.length >= safeMax) {
    const retryAfterSec = Math.ceil((bucket.timestamps[0] + safeWindow - now) / 1000);
    return { ok: false, retryAfterSec: Math.max(1, retryAfterSec) };
  }

  bucket.timestamps.push(now);

  if (buckets.size > 5000) {
    for (const [k, b] of buckets) {
      pruneBucket(b, safeWindow, now);
      if (!b.timestamps.length) buckets.delete(k);
    }
  }

  return { ok: true };
}

function readLimit(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Limite para criação de pedidos (por IP e por slug da loja). */
export function checkPublicOrderRateLimit(request, slug) {
  const ip = getClientIp(request);
  const windowMs = readLimit('PUBLIC_ORDER_RATE_LIMIT_WINDOW_MS', 60_000);
  const ipMax = readLimit('PUBLIC_ORDER_RATE_LIMIT_MAX', 8);
  const slugMax = readLimit('PUBLIC_ORDER_RATE_LIMIT_SLUG_MAX', 40);

  const ipCheck = checkRateLimit({ key: `public-order:ip:${ip}`, max: ipMax, windowMs });
  if (!ipCheck.ok) return ipCheck;

  if (slug) {
    return checkRateLimit({ key: `public-order:slug:${slug}`, max: slugMax, windowMs });
  }

  return { ok: true };
}

/** Limite para consulta de pedidos pelo telefone (enumeração). */
export function checkPublicOrdersReadRateLimit(request, slug) {
  const ip = getClientIp(request);
  const windowMs = readLimit('PUBLIC_ORDERS_READ_RATE_LIMIT_WINDOW_MS', 60_000);
  const ipMax = readLimit('PUBLIC_ORDERS_READ_RATE_LIMIT_MAX', 30);

  const ipCheck = checkRateLimit({ key: `public-orders:ip:${ip}`, max: ipMax, windowMs });
  if (!ipCheck.ok) return ipCheck;

  if (slug) {
    const slugMax = readLimit('PUBLIC_ORDERS_READ_RATE_LIMIT_SLUG_MAX', 60);
    return checkRateLimit({ key: `public-orders:slug:${slug}`, max: slugMax, windowMs });
  }

  return { ok: true };
}
