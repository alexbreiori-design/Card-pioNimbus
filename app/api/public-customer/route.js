import { NextResponse } from 'next/server';
import { checkPublicOrdersReadRateLimit } from '@/lib/rateLimit';
import { normalizePhone, normalizeSlug } from '@/lib/normalize';
import { getServiceClient } from '@/lib/supabase/serviceRole';

function mapAddressRow(row) {
  if (!row) return null;
  return {
    rua: row.rua || '',
    num: row.numero || '',
    bairro: row.bairro || '',
    cidade: row.cidade || '',
    estado: row.estado || '',
    cep: row.cep || '',
    comp: row.complemento || '',
    ref: row.referencia || '',
  };
}

export async function GET(request) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const slug = normalizeSlug(searchParams.get('slug'));
  const phone = normalizePhone(searchParams.get('phone'));

  if (!slug || !phone) {
    return NextResponse.json({ ok: false, error: 'Slug e telefone são obrigatórios.' }, { status: 400 });
  }

  const rateLimit = checkPublicOrdersReadRateLimit(request, slug);
  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, error: 'Muitas consultas. Aguarde um momento.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.retryAfterSec) },
      }
    );
  }

  try {
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (empresaError) throw empresaError;
    if (!empresa?.id) {
      return NextResponse.json({ ok: true, customer: null });
    }

    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .select('id, nome, telefone')
      .eq('empresa_id', empresa.id)
      .eq('telefone', phone)
      .maybeSingle();
    if (clienteError) throw clienteError;
    if (!cliente?.id) {
      return NextResponse.json({ ok: true, customer: null });
    }

    const { data: enderecos, error: enderecoError } = await supabase
      .from('cliente_enderecos')
      .select('cep, rua, numero, bairro, cidade, estado, complemento, referencia, principal')
      .eq('cliente_id', cliente.id)
      .eq('empresa_id', empresa.id)
      .order('principal', { ascending: false });
    if (enderecoError) throw enderecoError;

    const principal = (enderecos || []).find((row) => row.principal) || enderecos?.[0] || null;

    return NextResponse.json({
      ok: true,
      customer: {
        name: cliente.nome || '',
        phone: cliente.telefone || phone,
        address: mapAddressRow(principal),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Não foi possível consultar o cliente.' },
      { status: 500 }
    );
  }
}
