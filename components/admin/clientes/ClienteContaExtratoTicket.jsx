'use client';

/* eslint-disable @next/next/no-img-element */

import '@/styles/orderTicket.css';
import { currency, fmtPhone } from '@/components/admin/orders/orderDraftUtils';
import {
  formatContaPedidoWhen,
  formatFiadoMoney,
  formatSaldoDevedor,
  formatSignedContaMoney,
} from '@/lib/fiado/clienteConta';

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

function ContaMovimentoBlock({ mov }) {
  const when = formatContaPedidoWhen(mov.pedidoCreatedAt || mov.createdAt);
  const isPedido = mov.tipo === 'debito_pedido';

  if (isPedido) {
    return (
      <div className="order-ticket-conta-block">
        <div className="order-ticket-conta-block-title">
          Pedido{mov.pedidoCodigo ? ` #${mov.pedidoCodigo}` : ''} — {when}
        </div>
        {(mov.itens || []).length ? (
          mov.itens.map((item, idx) => (
            <div key={`${mov.id}-${idx}`} className="order-ticket-item">
              <div className="order-ticket-item-head">
                <span className="order-ticket-item-name">
                  {item.qtd}x {item.nome}
                </span>
                <span className="order-ticket-item-price">{currency(item.subtotal)}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="order-ticket-meta">Itens não disponíveis</div>
        )}
        <div className="order-ticket-row order-ticket-conta-total">
          <strong>TOTAL</strong>
          <strong>{formatSignedContaMoney(mov.signedValor)}</strong>
        </div>
        <div className="order-ticket-conta-sep" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="order-ticket-conta-block">
      <div className="order-ticket-conta-block-title">
        {mov.tipoLabel}
        {mov.formaRecebimentoLabel ? ` · ${mov.formaRecebimentoLabel}` : ''} — {when}
      </div>
      {mov.observacao ? <div className="order-ticket-meta">{mov.observacao}</div> : null}
      <div className="order-ticket-row order-ticket-conta-total">
        <strong>TOTAL</strong>
        <strong>{formatSignedContaMoney(mov.signedValor)}</strong>
      </div>
      <div className="order-ticket-conta-sep" aria-hidden="true" />
    </div>
  );
}

/**
 * Extrato térmico da conta do cliente.
 */
export default function ClienteContaExtratoTicket({
  store = {},
  customer = null,
  movimentos = [],
  saldo = 0,
  widthMm = 80,
  mode = 'print',
}) {
  if (!customer) return null;

  const widthClass = widthMm === 58 ? 'order-ticket--58' : 'order-ticket--80';
  const rootClass =
    mode === 'preview'
      ? `order-ticket-preview-root ${widthClass}`
      : `order-ticket-print-root ${widthClass}`;

  const totalDebitos = movimentos
    .filter((m) => m.tipo === 'debito_pedido')
    .reduce((sum, m) => sum + Number(m.valor || 0), 0);
  const totalCreditos = movimentos
    .filter((m) => m.tipo === 'credito_baixa' || m.tipo === 'estorno')
    .reduce((sum, m) => sum + Number(m.valor || 0), 0);

  const logoSrc = store?.logoComandaUrl || store?.logoUrl || '';

  return (
    <div className={rootClass} aria-hidden={mode === 'print' ? 'true' : undefined}>
      <div className="order-ticket">
        <header className="order-ticket-center order-ticket-header">
          {logoSrc ? <img src={logoSrc} alt="" className="order-ticket-logo" /> : null}
          <p className="order-ticket-store">{store?.nome || 'Minha loja'}</p>
          <p className="order-ticket-store-phone">Extrato de conta</p>
          <p className="order-ticket-store-phone">{formatDateTime(new Date().toISOString())}</p>
        </header>

        <section className="order-ticket-section">
          <div className="order-ticket-block-title">Cliente</div>
          <div className="order-ticket-row">
            <span>Nome</span>
            <strong>{customer.name || '—'}</strong>
          </div>
          <div className="order-ticket-row">
            <span>Telefone</span>
            <strong>{fmtPhone(customer.phone) || '—'}</strong>
          </div>
        </section>

        <section className="order-ticket-section">
          <div className="order-ticket-block-title">Movimentações</div>
          {!movimentos.length ? (
            <div className="order-ticket-meta">Nenhum lançamento.</div>
          ) : (
            movimentos.map((mov) => <ContaMovimentoBlock key={mov.id} mov={mov} />)
          )}
        </section>

        <section className="order-ticket-section">
          <div className="order-ticket-row">
            <span>Total consumido</span>
            <strong>− {formatFiadoMoney(totalDebitos)}</strong>
          </div>
          <div className="order-ticket-row">
            <span>Total recebido</span>
            <strong>+ {formatFiadoMoney(totalCreditos)}</strong>
          </div>
          <div className="order-ticket-row order-ticket-total">
            <span>Saldo</span>
            <strong>{formatSaldoDevedor(saldo)}</strong>
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
