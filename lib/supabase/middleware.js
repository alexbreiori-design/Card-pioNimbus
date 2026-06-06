import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { isSuperAdminEmail } from '@/lib/superAdmin';

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

async function resolveMembershipAccess(supabase, userId) {
  let suspensaKnown = true;
  let rows = [];
  let error = null;

  ({ data: rows, error } = await supabase
    .from('empresa_membros')
    .select('id, empresas ( suspensa )')
    .eq('usuario_id', userId)
    .eq('ativo', true));

  if (error?.message?.includes('suspensa')) {
    suspensaKnown = false;
    ({ data: rows, error } = await supabase
      .from('empresa_membros')
      .select('id')
      .eq('usuario_id', userId)
      .eq('ativo', true));
  }

  const hasMembership = !error && (rows?.length ?? 0) > 0;
  const hasActiveMembership =
    hasMembership &&
    (!suspensaKnown || (rows || []).some((row) => row?.empresas?.suspensa !== true));

  return { hasMembership, hasActiveMembership };
}

export async function updateSession(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const path = request.nextUrl.pathname;
  const isAdmin = path.startsWith('/admin');
  const isSemAcesso = path === '/admin/sem-acesso';
  const isLojaSuspensa = path === '/admin/loja-suspensa';
  const isSistema = path === '/admin/sistema' || path.startsWith('/admin/sistema/');
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
      const isSuperAdmin = isSuperAdminEmail(user.email);

      if (isSistema && !isSuperAdmin) {
        const url = request.nextUrl.clone();
        url.pathname = '/admin/pedidos';
        url.search = '';
        return NextResponse.redirect(url);
      }

      const { hasMembership, hasActiveMembership } = await resolveMembershipAccess(supabase, user.id);
      const sistemaBypass = isSistema && isSuperAdmin;

      if (!hasMembership && !isSemAcesso && !isLojaSuspensa && !sistemaBypass) {
        const url = request.nextUrl.clone();
        url.pathname = '/admin/sem-acesso';
        url.search = '';
        return NextResponse.redirect(url);
      }

      if (hasMembership && !hasActiveMembership && !isLojaSuspensa && !sistemaBypass) {
        const url = request.nextUrl.clone();
        url.pathname = '/admin/loja-suspensa';
        url.search = '';
        return NextResponse.redirect(url);
      }

      if (hasActiveMembership && (isSemAcesso || isLojaSuspensa)) {
        const url = request.nextUrl.clone();
        url.pathname = '/admin/pedidos';
        url.search = '';
        return NextResponse.redirect(url);
      }
    }

    if (isPublicLogin && user) {
      const url = request.nextUrl.clone();
      const redirectUrl = getSafeAdminRedirect(url.searchParams.get('redirect'), request.url);

      let targetPath = redirectUrl?.pathname ?? '/admin/pedidos';

      const { hasMembership, hasActiveMembership } = await resolveMembershipAccess(supabase, user.id);

      if (hasMembership && !hasActiveMembership) {
        targetPath = '/admin/loja-suspensa';
      }

      url.pathname = targetPath;
      url.search = targetPath === '/admin/loja-suspensa' ? '' : (redirectUrl?.search ?? '');
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
