'use client';

import CartItemOptsList from '@/components/cardapio/CartItemOptsList';
import '@/styles/orderTicket.css';
import { currency, fmtPhone } from './orderDraftUtils';
import { paymentLabelForOrder } from '@/lib/orders/mapAdminOrder';

const TIPO_LABEL = { delivery: 'Delivery', retirada: 'Retirada', balcao: 'Balcão' };

function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function deadlineLabel(order) {
  if (order.tipo === 'delivery') return `Entregar até ${order.prazo || '--:--'}`;
  return `Retirar até ${order.prazo || '--:--'}`;
}

function addressText(order) {
  if (order.tipo !== 'delivery') {
    return order.tipo === 'retirada' ? 'Retirada no estabelecimento' : 'Balcão';
  }
  if (order.enderecoTexto) return order.enderecoTexto;
  const e = order.endereco || {};
  const line = `${e.logradouro || ''}${e.numero ? `, ${e.numero}` : ''} - ${e.bairro || ''} - ${e.cidade || ''}`.trim();
  return line || 'Endereço não informado';
}

export default function OrderTicket({ order, store = {}, widthMm = 80, mode = 'print' }) {
  if (!order) return null;

  const pay = paymentLabelForOrder(order);
  const widthClass = widthMm === 58 ? 'order-ticket--58' : 'order-ticket--80';
  const rootClass =
    mode === 'preview'
      ? `order-ticket-preview-root ${widthClass}`
      : `order-ticket-print-root ${widthClass}`;

  return (
    <div className={rootClass} aria-hidden={mode === 'print' ? 'true' : undefined}>
      <div className="order-ticket">
        <header className="order-ticket-center order-ticket-header">
          {store.logoComandaUrl ? (
            <img src={store.logoComandaUrl} alt="" className="order-ticket-logo" />
          ) : null}
          <p className="order-ticket-store">{store.nome || 'Minha loja'}</p>
          {store.telefone || store.whatsapp ? (
            <p className="order-ticket-store-phone">
              {fmtPhone(store.telefone || store.whatsapp)}
            </p>
          ) : null}
        </header>

        <section className="order-ticket-section order-ticket-meta">
          <div className="order-ticket-row">
            <span>Data</span>
            <span>{formatDateTime(order.createdAt)}</span>
          </div>
          <div className="order-ticket-row">
            <span>Prazo</span>
            <strong>{deadlineLabel(order)}</strong>
          </div>
        </section>

        <div className="order-ticket-inverse order-ticket-order-number">
          PEDIDO {order.id}
        </div>

        <section className="order-ticket-section">
          <div className="order-ticket-block-title">Itens</div>
          {(order.itens || []).length === 0 ? (
            <div className="order-ticket-muted">Sem itens</div>
          ) : (
            (order.itens || []).map((item, idx) => (
              <div key={`${item.nome}-${idx}`} className="order-ticket-item">
                <div className="order-ticket-item-head">
                  <span className="order-ticket-item-name">
                    {item.qtd}x {item.nome}
                  </span>
                  <span className="order-ticket-item-price">{currency(item.subtotal ?? item.qtd * item.precoUnit)}</span>
                </div>
                <CartItemOptsList obs={item.obs} className="order-ticket-item-obs" />
              </div>
            ))
          )}
        </section>

        {order.observacao ? (
          <section className="order-ticket-section">
            <div className="order-ticket-block-title">Observações</div>
            <div className="order-ticket-observation">{order.observacao}</div>
          </section>
        ) : null}

        <section className="order-ticket-section">
          <div className="order-ticket-block-title">Cliente</div>
          <div>{order.clienteNome || '—'}</div>
          {order.clienteTelefone ? <div>{fmtPhone(order.clienteTelefone)}</div> : null}
        </section>

        <section className="order-ticket-section">
          <div className="order-ticket-block-title">
            {TIPO_LABEL[order.tipo] || order.tipo}
          </div>
          <div>{addressText(order)}</div>
        </section>

        <section className="order-ticket-section">
          <div className="order-ticket-block-title">Pagamento</div>
          {order.subtotal > 0 ? (
            <div className="order-ticket-row">
              <span>Subtotal</span>
              <span>{currency(order.subtotal)}</span>
            </div>
          ) : null}
          {order.frete > 0 ? (
            <div className="order-ticket-row">
              <span>Entrega</span>
              <span>{currency(order.frete)}</span>
            </div>
          ) : null}
          {order.acrescimo > 0 ? (
            <div className="order-ticket-row">
              <span>Acréscimo</span>
              <span>{currency(order.acrescimo)}</span>
            </div>
          ) : null}
          {order.desconto > 0 ? (
            <div className="order-ticket-row">
              <span>Desconto{order.cupomCodigo ? ` (${order.cupomCodigo})` : ''}</span>
              <span>-{currency(order.desconto)}</span>
            </div>
          ) : null}
          <div className="order-ticket-row order-ticket-total-final">
            <span>TOTAL</span>
            <span>{currency(order.total)}</span>
          </div>
        </section>

        <section className="order-ticket-section">
          <div className="order-ticket-block-title">Forma de pagamento</div>
          <div className="order-ticket-row">
            <strong>{pay}</strong>
          </div>
        </section>

        <footer className="order-ticket-footer">
          <span>Powered by</span>
          <strong>www.cardapionimbus.com.br</strong>
        </footer>
      </div>
    </div>
  );
}
