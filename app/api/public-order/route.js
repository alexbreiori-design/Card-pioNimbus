import { NextResponse } from 'next/server';
import { toDbUuidOrNull } from '@/lib/dbIds';
import { checkPublicOrderRateLimit } from '@/lib/rateLimit';
import { normalizePhone } from '@/lib/normalize';
import { withDerivedData } from '@/lib/adminData';
import { validatePublicOrder } from '@/lib/orderValidation';
import { getServiceClient } from '@/lib/supabase/serviceRole';
import { fetchPublicStoreCatalogRow } from '@/lib/supabase/storeStateServer';
import { listZonasByEmpresaId } from '@/lib/supabase/empresaServer';

export async function POST(request) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: 'Serviço indisponível.' },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const slug = String(body.slug || '').trim().toLowerCase();
  const order = body.order;
  const customer = body.customer;

  if (!slug || !order || !customer) {
    return NextResponse.json({ ok: false, error: 'Payload inválido.' }, { status: 400 });
  }

  const rateLimit = checkPublicOrderRateLimit(request, slug);
  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, error: 'Muitas tentativas. Aguarde um momento e tente novamente.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.retryAfterSec) },
      }
    );
  }

  try {
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('id, slug, aberta, suspensa')
      .eq('slug', slug)
      .maybeSingle();
    if (empresaError) throw empresaError;
    if (!empresa?.id) {
      return NextResponse.json({ ok: false, error: 'Empresa não encontrada.' }, { status: 404 });
    }
    if (empresa.suspensa === true) {
      return NextResponse.json({ ok: false, error: 'Loja indisponível no momento.' }, { status: 403 });
    }
    if (empresa.aberta === false) {
      return NextResponse.json({ ok: false, error: 'Loja fechada no momento.' }, { status: 403 });
    }

    const storeRow = await fetchPublicStoreCatalogRow(slug);
    const storeData = withDerivedData(storeRow?.data || {});
    const zonas = await listZonasByEmpresaId(supabase, empresa.id);

    const validated = validatePublicOrder({
      order,
      storeData,
      zonas,
      empresa,
    });

    const phone = normalizePhone(customer.phone || order.clienteTelefone);
    if (!phone || phone.length < 11) {
      return NextResponse.json({ ok: false, error: 'Telefone inválido.' }, { status: 400 });
    }

    const { data: existingCliente } = await supabase
      .from('clientes')
      .select('id, total_pedidos, total_gasto')
      .eq('empresa_id', empresa.id)
      .eq('telefone', phone)
      .maybeSingle();

    const prevOrders = Number(existingCliente?.total_pedidos || 0);
    const prevSpent = Number(existingCliente?.total_gasto || 0);

    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .upsert(
        {
          empresa_id: empresa.id,
          nome: String(customer.name || order.clienteNome || '').trim() || 'Cliente',
          telefone: phone,
          total_pedidos: prevOrders + 1,
          total_gasto: prevSpent + validated.total,
          ultimo_pedido_em: order.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'empresa_id,telefone' }
      )
      .select('*')
      .single();
    if (clienteError) throw clienteError;

    const address = order.endereco;
    if (address) {
      await supabase
        .from('cliente_enderecos')
        .delete()
        .eq('cliente_id', cliente.id)
        .eq('empresa_id', empresa.id)
        .eq('principal', true);

      const { error: addrError } = await supabase.from('cliente_enderecos').insert({
        cliente_id: cliente.id,
        empresa_id: empresa.id,
        cep: address.cep || null,
        rua: address.logradouro || '-',
        numero: address.numero || null,
        bairro: address.bairro || '-',
        cidade: address.cidade || '-',
        estado: address.estado || '-',
        complemento: address.complemento || null,
        referencia: address.referencia || null,
        principal: true,
      });
      if (addrError) throw addrError;
    }

    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos')
      .insert({
        empresa_id: empresa.id,
        cliente_id: cliente.id,
        codigo: String(order.id),
        status: order.status || 'novo',
        tipo: validated.tipo === 'delivery' ? 'delivery' : 'retirada',
        origem: 'cardapio_online',
        cliente_nome: order.clienteNome,
        cliente_telefone: phone,
        endereco_texto: order.enderecoTexto || null,
        subtotal: validated.subtotal,
        taxa_entrega: validated.frete,
        acrescimo: 0,
        desconto: validated.desconto,
        total: validated.total,
        forma_pagamento_codigo: order.pagamento?.metodo || null,
        cupom_codigo: order.cupomCodigo || null,
        observacao: order.observacao || null,
        entregar_ate: order.entregarAte || null,
        status_novo_em: order.createdAt || new Date().toISOString(),
        created_at: order.createdAt || new Date().toISOString(),
      })
      .select('id')
      .single();
    if (pedidoError) throw pedidoError;

    const items = (order.itens || []).map((item) => ({
      pedido_id: pedido.id,
      empresa_id: empresa.id,
      produto_id: toDbUuidOrNull(item.produtoId),
      nome: item.nome,
      quantidade: item.qtd || 1,
      preco_unitario: item.precoUnit || 0,
      preco_total: item.subtotal || 0,
      observacao: item.obs || null,
    }));
    if (items.length) {
      const { error: itemsError } = await supabase.from('pedido_itens').insert(items);
      if (itemsError) throw itemsError;
    }

    return NextResponse.json({ ok: true, pedidoId: pedido.id, clienteId: cliente.id });
  } catch (error) {
    const message = error?.message || 'Erro ao registrar pedido.';
    const status = message.includes('inválid') || message.includes('mínimo') || message.includes('fechada')
      ? 400
      : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
