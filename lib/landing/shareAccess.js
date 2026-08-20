import { timingSafeEqual } from 'crypto';

/**
 * Validates the share path segment for the public landing (`/lp/[key]`).
 * Key lives only in LANDING_SHARE_KEY (server env) — not committed.
 */
export function isValidLandingShareKey(candidate) {
  const expected = String(process.env.LANDING_SHARE_KEY || '').trim();
  const provided = String(candidate || '').trim();
  if (!expected || !provided) return false;

  const expectedBuf = Buffer.from(expected, 'utf8');
  const providedBuf = Buffer.from(provided, 'utf8');
  if (expectedBuf.length !== providedBuf.length) return false;

  try {
    return timingSafeEqual(expectedBuf, providedBuf);
  } catch {
    return false;
  }
}
