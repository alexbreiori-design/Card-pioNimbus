import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

function getSafeAdminRedirect(redirect, requestUrl) {
  if (!redirect || !redirect.startsWith('/admin') || redirect.startsWith('/admin/login')) {
    return null;
  }

  return new URL(redirect, requestUrl);
}

function redirectToLogin(request, path) {
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('redirect', `${path}${request.nextUrl.search}`);
  return NextResponse.redirect(url);
}

export async function updateSession(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const path = request.nextUrl.pathname;
  const isAdmin = path.startsWith('/admin');
  const isSemAcesso = path === '/admin/sem-acesso';
  const isPublicLogin = path === '/login';
  const isLegacyAdminLogin = path === '/admin/login';

  if (isLegacyAdminLogin) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isAdmin) {
      return redirectToLogin(request, path);
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (isAdmin && !user) {
      return redirectToLogin(request, path);
    }

    if (isAdmin && user) {
      const { count, error: membershipError } = await supabase
        .from('empresa_membros')
        .select('id', { count: 'exact', head: true })
        .eq('usuario_id', user.id)
        .eq('ativo', true);

      const hasMembership = !membershipError && (count ?? 0) > 0;

      if (!hasMembership && !isSemAcesso) {
        const url = request.nextUrl.clone();
        url.pathname = '/admin/sem-acesso';
        url.search = '';
        return NextResponse.redirect(url);
      }

      if (hasMembership && isSemAcesso) {
        const url = request.nextUrl.clone();
        url.pathname = '/admin/pedidos';
        url.search = '';
        return NextResponse.redirect(url);
      }
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
    if (isAdmin) {
      return redirectToLogin(request, path);
    }
  }

  return response;
}
