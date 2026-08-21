import { NextResponse } from 'next/server';
import {
  addStoreTeamMember,
  loadStoreTeam,
  removeStoreTeamMember,
  updateStoreTeamMember,
} from '@/lib/superAdmin/storeTeam';
import { requireSuperAdmin } from '@/lib/superAdminServer';
import { getServiceClient } from '@/lib/supabase/serviceRole';
import { normalizeSlug } from '@/lib/normalize';

async function getEmpresaId(supabase, slug) {
  const { data, error } = await supabase.from('empresas').select('id').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data?.id || null;
}

export async function GET(_request, { params }) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  const { slug } = await params;
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) {
    return NextResponse.json({ ok: false, error: 'Slug inválido.' }, { status: 400 });
  }

  try {
    await requireSuperAdmin();
    const empresaId = await getEmpresaId(supabase, safeSlug);
    if (!empresaId) {
      return NextResponse.json({ ok: false, error: 'Loja não encontrada.' }, { status: 404 });
    }

    const members = await loadStoreTeam(supabase, empresaId);
    return NextResponse.json({ ok: true, members });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao listar equipe.' },
      { status }
    );
  }
}

export async function POST(request, { params }) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  const { slug } = await params;
  const safeSlug = normalizeSlug(slug);
  const body = await request.json().catch(() => ({}));

  try {
    await requireSuperAdmin();

    const empresaId = await getEmpresaId(supabase, safeSlug);
    if (!empresaId) {
      return NextResponse.json({ ok: false, error: 'Loja não encontrada.' }, { status: 404 });
    }

    const result = await addStoreTeamMember(supabase, {
      empresaId,
      email: body.email,
      papel: body.papel,
      nome: body.nome,
      tempPassword: body.tempPassword,
    });
    const members = await loadStoreTeam(supabase, empresaId);

    return NextResponse.json({
      ok: true,
      members,
      createdAuthUser: result.createdAuthUser,
      tempPassword: result.tempPassword,
      email: result.email,
    });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao adicionar membro.' },
      { status }
    );
  }
}

export async function PATCH(request, { params }) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  const { slug } = await params;
  const safeSlug = normalizeSlug(slug);
  const body = await request.json().catch(() => ({}));

  try {
    await requireSuperAdmin();

    const empresaId = await getEmpresaId(supabase, safeSlug);
    if (!empresaId) {
      return NextResponse.json({ ok: false, error: 'Loja não encontrada.' }, { status: 404 });
    }

    if (!body.usuarioId) {
      return NextResponse.json({ ok: false, error: 'Informe o membro.' }, { status: 400 });
    }

    const result = await updateStoreTeamMember(supabase, {
      empresaId,
      usuarioId: body.usuarioId,
      papel: body.papel,
      ativo: body.ativo,
      email: body.email,
      nome: body.nome,
      password: body.password,
    });
    const members = await loadStoreTeam(supabase, empresaId);
    return NextResponse.json({
      ok: true,
      members,
      tempPassword: result?.tempPassword || null,
    });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao atualizar membro.' },
      { status }
    );
  }
}

export async function DELETE(request, { params }) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  const { slug } = await params;
  const safeSlug = normalizeSlug(slug);
  const body = await request.json().catch(() => ({}));

  try {
    await requireSuperAdmin();

    const empresaId = await getEmpresaId(supabase, safeSlug);
    if (!empresaId) {
      return NextResponse.json({ ok: false, error: 'Loja não encontrada.' }, { status: 404 });
    }

    if (!body.usuarioId) {
      return NextResponse.json({ ok: false, error: 'Informe o membro.' }, { status: 400 });
    }

    const result = await removeStoreTeamMember(supabase, {
      empresaId,
      usuarioId: body.usuarioId,
    });
    const members = await loadStoreTeam(supabase, empresaId);
    return NextResponse.json({
      ok: true,
      members,
      deletedAuthUser: result.deletedAuthUser,
    });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao remover membro.' },
      { status }
    );
  }
}
