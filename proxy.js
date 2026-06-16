import { NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import {
  getRootDomain,
  getSiteOrigin,
  getStorePublicUrl,
  isApexHost,
  resolveSlugFromHost,
} from '@/lib/siteUrl';
import { isValidStoreSlug } from '@/lib/superAdmin';

/** Rotas do apex que nunca são slug de loja. */
const APEX_RESERVED_SEGMENTS = new Set([
  'admin',
  'login',
  'home',
  'api',
  'cadastro',
  'termos',
  'privacidade',
  'dashboard',
]);

const PASSTHROUGH_PREFIXES = ['/api', '/_next'];

function shouldPassthrough(pathname) {
  return PASSTHROUGH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function applyStoreHostRouting(request) {
  const host = request.headers.get('host') || '';
  const hostOnly = host.split(':')[0].toLowerCase();
  const url = request.nextUrl.clone();
  const { pathname, search } = url;
  const root = getRootDomain();

  if (root && hostOnly === `www.${root}`) {
    const dest = new URL(getSiteOrigin());
    dest.pathname = pathname;
    dest.search = search;
    return NextResponse.redirect(dest, 301);
  }

  const storeSlug = resolveSlugFromHost(host);

  if (storeSlug && isValidStoreSlug(storeSlug)) {
    if (shouldPassthrough(pathname)) {
      return null;
    }

    const firstSegment = pathname.split('/').filter(Boolean)[0] || '';
    if (APEX_RESERVED_SEGMENTS.has(firstSegment)) {
      const dest = new URL(getSiteOrigin());
      dest.pathname = pathname;
      dest.search = search;
      return NextResponse.redirect(dest);
    }

    const internalPrefix = `/${storeSlug}`;
    if (pathname === '/' || pathname === '') {
      url.pathname = internalPrefix;
      return NextResponse.rewrite(url);
    }

    if (!pathname.startsWith(internalPrefix)) {
      url.pathname = `${internalPrefix}${pathname}`;
      return NextResponse.rewrite(url);
    }

    return null;
  }

  if (root && isApexHost(host)) {
    const legacyMatch = pathname.match(/^\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/);
    if (legacyMatch) {
      const candidate = legacyMatch[1];
      if (!APEX_RESERVED_SEGMENTS.has(candidate) && isValidStoreSlug(candidate)) {
        const dest = new URL(getStorePublicUrl(candidate));
        dest.pathname = '/';
        return NextResponse.redirect(dest, 301);
      }
    }
  }

  return null;
}

export async function proxy(request) {
  const routing = applyStoreHostRouting(request);
  if (routing) return routing;
  return updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|woff2?)$).*)',
  ],
};
