'use client';

/* eslint-disable @next/next/no-img-element */

import '@/styles/orderTicket.css';
import { currency, fmtPhone } from '@/components/admin/orders/orderDraftUtils';
import { resolveStoreContactPhone } from '@/lib/storeWhatsApp';

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

function formatSignedCurrency(value) {
  const n = Number(value) || 0;
  const abs = currency(Math.abs(n));
  if (n > 0) return `+${abs}`;
  if (n < 0) return `-${abs}`;
  return abs;
}

/**
 * Resumo térmico do turno de caixa (fechamento).
 * Reutiliza classes de `orderTicket.css` (58/80 mm).
 */
export default function CaixaCloseTicket({
  store = {},
  turno = null,
  summary = null,
  extras = null,
  widthMm = 80,
  mode = 'print',
}) {
  if (!summary) return null;

  const widthClass = widthMm === 58 ? 'order-ticket--58' : 'order-ticket--80';
  const rootClass =
    mode === 'preview'
      ? `order-ticket-preview-root ${widthClass}`
      : `order-ticket-print-root ${widthClass}`;

  const pagamentos = (summary.pagamentos || []).filter((row) => Number(row.valor) > 0);
  const tipos = (summary.tipos || []).filter((row) => Number(row.pedidos) > 0);
  const entregadores = (summary.entregadores || []).filter((row) => Number(row.pedidos) > 0);

  const valorContado =
    extras?.valorContado != null
      ? Number(extras.valorContado)
      : turno?.valorFechamentoContado != null
        ? Number(turno.valorFechamentoContado)
        : null;

  const esperado =
    extras?.esperadoDinheiro != null
      ? Number(extras.esperadoDinheiro)
      : summary.esperadoDinheiro != null
        ? Number(summary.esperadoDinheiro)
        : turno?.valorEsperadoDinheiro != null
          ? Number(turno.valorEsperadoDinheiro)
          : null;

  const diferenca =
    extras?.diferenca != null
      ? Number(extras.diferenca)
      : valorContado != null && esperado != null
        ? Math.round((valorContado - esperado) * 100) / 100
        : turno?.diferencaDinheiro != null
          ? Number(turno.diferencaDinheiro)
          : null;

  const observacao = extras?.observacao || turno?.observacaoFechamento || '';
  const storePhone = resolveStoreContactPhone(store);

  return (
    <div className={rootClass} aria-hidden={mode === 'print' ? 'true' : undefined}>
      <div className="order-ticket">
        <header className="order-ticket-center order-ticket-header">
          {store.logoComandaUrl ? (
            <img src={store.logoComandaUrl} alt="" className="order-ticket-logo" />
          ) : null}
          <p className="order-ticket-store">{store.nome || 'Minha loja'}</p>
          {storePhone ? (
            <p className="order-ticket-store-phone">{fmtPhone(storePhone)}</p>
          ) : null}
        </header>

        <div className="order-ticket-inverse order-ticket-order-number">FECHAMENTO</div>
        <p className="order-ticket-center order-ticket-muted" style={{ margin: '0 0 8px' }}>
          Turno {turno?.numeroTurno != null ? `#${turno.numeroTurno}` : '—'}
        </p>

        <section className="order-ticket-section order-ticket-meta">
          <div className="order-ticket-row">
            <span>Abertura</span>
            <span>{formatDateTime(turno?.abertoEm)}</span>
          </div>
          {turno?.fechadoEm ? (
            <div className="order-ticket-row">
              <span>Fechamento</span>
              <span>{formatDateTime(turno.fechadoEm)}</span>
            </div>
          ) : (
            <div className="order-ticket-row">
              <span>Impresso em</span>
              <span>{formatDateTime(new Date().toISOString())}</span>
            </div>
          )}
        </section>

        <section className="order-ticket-section">
          <div className="order-ticket-block-title">Vendas</div>
          <div className="order-ticket-row">
            <span>Pedidos</span>
            <strong>{summary.totalPedidos || 0}</strong>
          </div>
          <div className="order-ticket-row order-ticket-total-final">
            <span>Total</span>
            <strong>{currency(summary.totalVendas || 0)}</strong>
          </div>
        </section>

        {tipos.length ? (
          <section className="order-ticket-section">
            <div className="order-ticket-block-title">Por tipo</div>
            {tipos.map((row) => (
              <div key={row.codigo} className="order-ticket-row">
                <span>
                  {row.label} ({row.pedidos})
                </span>
                <span>{currency(row.valor)}</span>
              </div>
            ))}
          </section>
        ) : null}

        {pagamentos.length ? (
          <section className="order-ticket-section">
            <div className="order-ticket-block-title">Formas de pagamento</div>
            {pagamentos.map((row) => (
              <div key={row.codigo} className="order-ticket-row">
                <span>{row.label}</span>
                <strong>{currency(row.valor)}</strong>
              </div>
            ))}
          </section>
        ) : (
          <section className="order-ticket-section">
            <div className="order-ticket-block-title">Formas de pagamento</div>
            <div className="order-ticket-muted">Sem vendas no turno</div>
          </section>
        )}

        {entregadores.length ? (
          <section className="order-ticket-section">
            <div className="order-ticket-block-title">Entregas</div>
            {entregadores.map((row) => (
              <div key={row.id || row.nome} className="order-ticket-item">
                <div className="order-ticket-item-head">
                  <span className="order-ticket-item-name">{row.nome}</span>
                  <span className="order-ticket-item-price">{row.pedidos}x</span>
                </div>
                <div className="order-ticket-row order-ticket-muted">
                  <span>Vendas</span>
                  <span>{currency(row.valor)}</span>
                </div>
                {Number(row.taxaEntrega) > 0 ? (
                  <div className="order-ticket-row order-ticket-muted">
                    <span>Taxas</span>
                    <span>{currency(row.taxaEntrega)}</span>
                  </div>
                ) : null}
              </div>
            ))}
          </section>
        ) : null}

        <section className="order-ticket-section">
          <div className="order-ticket-block-title">Dinheiro / gaveta</div>
          <div className="order-ticket-row">
            <span>Abertura</span>
            <span>{currency(summary.valorAbertura || 0)}</span>
          </div>
          {Number(summary.cashSales) > 0 ? (
            <div className="order-ticket-row">
              <span>Vendas dinheiro</span>
              <span>{currency(summary.cashSales)}</span>
            </div>
          ) : null}
          {Number(summary.cashTroco) > 0 ? (
            <div className="order-ticket-row">
              <span>Troco dado</span>
              <span>-{currency(summary.cashTroco)}</span>
            </div>
          ) : null}
          {Number(summary.sangrias) > 0 ? (
            <div className="order-ticket-row">
              <span>Sangrias</span>
              <span>-{currency(summary.sangrias)}</span>
            </div>
          ) : null}
          {Number(summary.suprimentos) > 0 ? (
            <div className="order-ticket-row">
              <span>Suprimentos</span>
              <span>{currency(summary.suprimentos)}</span>
            </div>
          ) : null}
          <div className="order-ticket-row">
            <span>Esperado</span>
            <strong>{currency(esperado != null ? esperado : summary.esperadoDinheiro || 0)}</strong>
          </div>
          {valorContado != null ? (
            <div className="order-ticket-row">
              <span>Contado</span>
              <strong>{currency(valorContado)}</strong>
            </div>
          ) : null}
          {diferenca != null && valorContado != null ? (
            <div className="order-ticket-row order-ticket-total-final">
              <span>Diferença</span>
              <strong>{formatSignedCurrency(diferenca)}</strong>
            </div>
          ) : null}
        </section>

        {observacao ? (
          <section className="order-ticket-section">
            <div className="order-ticket-block-title">Observação</div>
            <div className="order-ticket-observation">{observacao}</div>
          </section>
        ) : null}

        <footer className="order-ticket-footer">
          <strong>Cardápio Nimbus</strong>
          <span>Resumo do turno de caixa</span>
        </footer>
      </div>
    </div>
  );
}
