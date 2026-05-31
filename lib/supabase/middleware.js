import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

function getSafeAdminRedirect(redirect, requestUrl) {
  if (!redirect || !redirect.startsWith('/admin') || redirect.startsWith('/admin/login')) {
    return null;
  }

  return new URL(redirect, requestUrl);
}

export async function updateSession(request) {
  let response = NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const { data } = await supabase.auth.getUser();
    const user = data?.user ?? null;

    const path = request.nextUrl.pathname;
    const isAdmin = path.startsWith('/admin');
    const isPublicLogin = path === '/login';
    const isLegacyAdminLogin = path === '/admin/login';

    if (isLegacyAdminLogin) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    if (isAdmin && !user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', `${path}${request.nextUrl.search}`);
      return NextResponse.redirect(url);
    }

    if (isPublicLogin && user) {
      const url = request.nextUrl.clone();
      const redirectUrl = getSafeAdminRedirect(url.searchParams.get('redirect'), request.url);

      url.pathname = redirectUrl?.pathname ?? '/admin/pedidos';
      url.search = redirectUrl?.search ?? '';
      return NextResponse.redirect(url);
    }
  } catch (error) {
    console.error('Proxy auth error:', error?.message || error);
  }

  return response;
}
