import { formatCartObsWhatsAppBlock } from '@/lib/cardapio/formatCartOpts';
import { normalizePhone } from '@/lib/normalize';

const PAYMENT_LABEL = {
  debito: 'Débito',
  credito: 'Crédito',
  pix: 'Pix',
  dinheiro: 'Dinheiro',
  vale: 'Vale refeição',
};

const TIPO_LABEL = { delivery: 'Delivery', retirada: 'Retirada', balcao: 'Balcão' };

/** Dígitos do telefone do cliente para wa.me (com DDI 55). */
export function customerPhoneDigitsForWa(phone) {
  let digits = normalizePhone(phone);
  if (!digits || digits.length < 10) return '';
  if (!digits.startsWith('55')) digits = `55${digits}`;
  return digits;
}

export function buildNotifyCustomerUrl(phone, message) {
  const digits = customerPhoneDigitsForWa(phone);
  if (!digits || !message) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function firstName(fullName) {
  const name = String(fullName || '').trim();
  if (!name) return 'Cliente';
  return name.split(/\s+/)[0];
}

function formatMoney(value) {
  const n = Number(value || 0);
  return `R$ ${n.toFixed(2).replace('.', ',')}`;
}

/**
 * Mensagem de atualização de status para o cliente (MVP — textos fixos).
 * Usa o status atual do pedido no kanban.
 */
export function buildOrderStatusNotifyMessage(order) {
  if (!order) return '';
  const nome = firstName(order.clienteNome);
  const id = order.id;
  const status = order.status;

  if (status === 'novo') {
    return `Olá ${nome}! Recebemos seu pedido #${id}. Já estamos preparando.`;
  }
  if (status === 'em_preparo') {
    return `Olá ${nome}! Seu pedido #${id} entrou em preparo.`;
  }
  if (status === 'saiu_entrega') {
    return `Olá ${nome}! Seu pedido #${id} saiu para entrega.`;
  }
  if (status === 'concluido') {
    if (order.tipo === 'delivery') {
      return `Olá ${nome}! Seu pedido #${id} foi entregue. Obrigado pela preferência!`;
    }
    return `Olá ${nome}! Seu pedido #${id} está pronto para retirada.`;
  }

  return `Olá ${nome}! Atualização do seu pedido #${id}.`;
}

/** Resumo completo do pedido para a loja enviar ao cliente pelo WhatsApp. */
export function buildOrderSummaryWhatsAppMessage(order) {
  if (!order) return '';

  const nome = order.clienteNome || 'Cliente';
  const lines = [
    `Olá ${firstName(nome)}! Segue o resumo do seu pedido:`,
    '',
    `*Pedido #${order.id}*`,
    `Tipo: ${TIPO_LABEL[order.tipo] || order.tipo || '—'}`,
  ];

  if (order.tipo === 'delivery' && order.enderecoTexto) {
    lines.push(`Endereço: ${order.enderecoTexto}`);
  }

  const itens = Array.isArray(order.itens) ? order.itens : [];
  if (itens.length) {
    lines.push('', '*Itens:*');
    for (const item of itens) {
      const optsBlock = formatCartObsWhatsAppBlock({ obs: item.obs });
      lines.push(`• ${item.qtd}x ${item.nome}${optsBlock} — ${formatMoney(item.subtotal)}`);
    }
  }

  const pay = PAYMENT_LABEL[order.pagamento?.metodo] || order.pagamento?.metodo || '—';
  lines.push('', `Pagamento: ${pay}`, `*Total: ${formatMoney(order.total)}*`);

  if (order.prazo) {
    lines.push(
      order.tipo === 'delivery'
        ? `Previsão de entrega: até ${order.prazo}`
        : `Previsão para retirada: até ${order.prazo}`
    );
  }

  return lines.join('\n');
}

export function buildOrderStatusNotifyUrl(order) {
  return buildNotifyCustomerUrl(order?.clienteTelefone, buildOrderStatusNotifyMessage(order));
}

export function buildOrderSummaryWhatsAppUrl(order) {
  return buildNotifyCustomerUrl(order?.clienteTelefone, buildOrderSummaryWhatsAppMessage(order));
}
