'use client';

import { formatCurrency } from '@/lib/admin/reports/reportFormatters';
import PixIcon from '@/components/admin/PixIcon';

function pctOf(value, total) {
  const t = Number(total) || 0;
  const v = Number(value) || 0;
  if (t <= 0) return 0;
  return Math.round((v / t) * 1000) / 10;
}

function formatPct(value, total) {
  const p = pctOf(value, total);
  return `${Number.isInteger(p) ? p : p.toFixed(1).replace('.', ',')}%`;
}

function tipoIconClass(codigo) {
  if (codigo === 'delivery') return 'ph ph-motorcycle';
  if (codigo === 'retirada') return 'ph ph-bag';
  if (codigo === 'balcao') return 'ph ph-storefront';
  return 'ph ph-package';
}

function PayMethodIcon({ codigo }) {
  if (codigo === 'pix' || codigo === 'pix_online') {
    return <PixIcon className="admin-caixa-close-pix-icon" />;
  }
  if (codigo === 'fiado') return <i className="ph ph-user-circle" />;
  if (codigo === 'dinheiro') return <i className="ph ph-currency-circle-dollar" />;
  if (codigo === 'credito' || codigo === 'credito_online' || codigo === 'debito') {
    return <i className="ph ph-credit-card" />;
  }
  return <i className="ph ph-wallet" />;
}

/**
 * Passo 1 do fechamento — layout da mock (KPIs + 2 colunas + footer).
 */
export default function CaixaCloseSummary({
  summary,
  busy = false,
  onBack,
  onPrint,
  onContinue,
}) {
  const totalVendas = Number(summary?.totalVendas || 0);
  const totalPedidos = Number(summary?.totalPedidos || 0);
  const esperado = Number(summary?.esperadoDinheiro || 0);

  const tiposBase = (summary?.tipos || []).filter((row) => Number(row.pedidos) > 0);
  // Só tipos reais de pedido (delivery / retirada / balcão) — conta não é tipo.
  const tipoRows = tiposBase.filter((row) => row.codigo !== 'fiado');

  const pagamentos = (summary?.pagamentos || []).filter((row) => Number(row.valor) > 0);
  const entregadores = (summary?.entregadores || []).filter((row) => Number(row.pedidos) > 0);
  const sangrias = Number(summary?.sangrias || 0);
  const suprimentos = Number(summary?.suprimentos || 0);
  const recebimentos = summary?.recebimentosContaLista || [];
  const showMovimentos = sangrias > 0 || suprimentos > 0 || recebimentos.length > 0;

  return (
    <div className="admin-caixa-close-ui">
      <header className="admin-caixa-close-header">
        <div className="admin-caixa-close-header-main">
          <span className="admin-caixa-close-header-icon" aria-hidden="true">
            <i className="ph ph-vault" />
          </span>
          <div>
            <h3>Fechar caixa</h3>
            <p>Confira o resumo da movimentação antes da contagem física.</p>
          </div>
        </div>
        <button
          type="button"
          className="admin-caixa-close-x"
          onClick={onBack}
          disabled={busy}
          aria-label="Voltar"
        >
          ×
        </button>
      </header>

      <div className="admin-caixa-close-kpis">
        <div className="admin-caixa-close-kpi">
          <span className="admin-caixa-close-kpi-icon" aria-hidden="true">
            <i className="ph ph-shopping-bag" />
          </span>
          <div className="admin-caixa-close-kpi-copy">
            <span className="admin-caixa-close-kpi-label">Pedidos</span>
            <strong className="admin-caixa-close-kpi-value">{totalPedidos}</strong>
          </div>
        </div>
        <div className="admin-caixa-close-kpi">
          <span className="admin-caixa-close-kpi-icon" aria-hidden="true">
            <i className="ph ph-chart-bar" />
          </span>
          <div className="admin-caixa-close-kpi-copy">
            <span className="admin-caixa-close-kpi-label">Vendas</span>
            <strong className="admin-caixa-close-kpi-value">{formatCurrency(totalVendas)}</strong>
            <span className="admin-caixa-close-kpi-meta">Total do período</span>
          </div>
        </div>
        <div className="admin-caixa-close-kpi">
          <span className="admin-caixa-close-kpi-icon" aria-hidden="true">
            <i className="ph ph-wallet" />
          </span>
          <div className="admin-caixa-close-kpi-copy">
            <span className="admin-caixa-close-kpi-label">Dinheiro esperado</span>
            <strong className="admin-caixa-close-kpi-value">{formatCurrency(esperado)}</strong>
            <span className="admin-caixa-close-kpi-meta">Para conferência física</span>
          </div>
        </div>
      </div>

      <div className="admin-caixa-close-body">
        <div className="admin-caixa-close-col">
          {tipoRows.length ? (
            <section className="admin-caixa-close-block">
              <div className="admin-caixa-close-block-head">
                <h4 className="admin-caixa-close-block-title admin-caixa-close-block-title--tipo">
                  Resumo por tipo
                </h4>
                <span className="admin-caixa-close-block-aside">
                  {totalPedidos} pedido{totalPedidos === 1 ? '' : 's'}
                </span>
              </div>
              <div className="admin-caixa-close-tipo-list">
                {tipoRows.map((row) => {
                  const pct = pctOf(row.valor, totalVendas);
                  return (
                    <div key={row.codigo} className="admin-caixa-close-tipo-row">
                      <div className="admin-caixa-close-tipo-row-top">
                        <span
                          className={`admin-caixa-close-tipo-icon${
                            row.codigo === 'balcao' ? ' is-balcao' : ''
                          }`}
                          aria-hidden="true"
                        >
                          <i className={tipoIconClass(row.codigo)} />
                        </span>
                        <div className="admin-caixa-close-tipo-copy">
                          <strong>{row.label}</strong>
                          <span>
                            {row.pedidos} pedido{row.pedidos === 1 ? '' : 's'}
                          </span>
                        </div>
                        <div className="admin-caixa-close-tipo-figures">
                          <strong>{formatCurrency(row.valor)}</strong>
                          <span className="admin-caixa-close-pct-badge">{formatPct(row.valor, totalVendas)}</span>
                        </div>
                      </div>
                      <div className="admin-caixa-close-bar" aria-hidden="true">
                        <span style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {entregadores.length ? (
            <section className="admin-caixa-close-block">
              <div className="admin-caixa-close-block-head">
                <h4 className="admin-caixa-close-block-title admin-caixa-close-block-title--entrega">
                  Entregas
                </h4>
              </div>
              <div className="admin-caixa-close-entregas-card">
                {entregadores.map((row) => (
                  <div key={row.id || row.nome} className="admin-caixa-close-entrega-cell">
                    <strong>{row.nome}</strong>
                    <span>
                      {row.pedidos} entrega{row.pedidos === 1 ? '' : 's'}
                    </span>
                    <em>{formatCurrency(row.valor)}</em>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div className="admin-caixa-close-col">
          {pagamentos.length ? (
            <section className="admin-caixa-close-block">
              <div className="admin-caixa-close-block-head">
                <h4 className="admin-caixa-close-block-title admin-caixa-close-block-title--pay">
                  Pagamentos
                </h4>
                <span className="admin-caixa-close-block-aside is-strong">
                  Total: {formatCurrency(totalVendas)}
                </span>
              </div>
              <div className="admin-caixa-close-pay-grid">
                {pagamentos.map((row) => {
                  const isConta = row.codigo === 'fiado';
                  return (
                    <div
                      key={row.codigo}
                      className={`admin-caixa-close-pay-card${isConta ? ' is-conta' : ''}`}
                    >
                      <span
                        className={`admin-caixa-close-pay-icon${isConta ? ' is-conta' : ''}`}
                        aria-hidden="true"
                      >
                        <PayMethodIcon codigo={row.codigo} />
                      </span>
                      <div className="admin-caixa-close-pay-copy">
                        <span className="admin-caixa-close-pay-label">{row.label}</span>
                        <strong>{formatCurrency(row.valor)}</strong>
                        {isConta ? (
                          <span className="admin-caixa-close-pay-meta">A receber</span>
                        ) : null}
                      </div>
                      <span className="admin-caixa-close-pct-badge">
                        {formatPct(row.valor, totalVendas)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {showMovimentos ? (
            <section className="admin-caixa-close-block">
              <div className="admin-caixa-close-block-head">
                <h4 className="admin-caixa-close-block-title admin-caixa-close-block-title--mov">
                  Movimentos
                </h4>
              </div>
              <div className="admin-caixa-close-mov-grid">
                {sangrias > 0 ? (
                  <div className="admin-caixa-close-mov-card is-sangria">
                    <span className="admin-caixa-close-mov-icon" aria-hidden="true">
                      <i className="ph ph-minus" />
                    </span>
                    <div>
                      <span className="admin-caixa-close-mov-label">Sangrias</span>
                      <strong>− {formatCurrency(sangrias)}</strong>
                      <span className="admin-caixa-close-mov-meta">Saída da gaveta</span>
                    </div>
                  </div>
                ) : null}
                {suprimentos > 0 ? (
                  <div className="admin-caixa-close-mov-card is-suprimento">
                    <span className="admin-caixa-close-mov-icon" aria-hidden="true">
                      <i className="ph ph-plus" />
                    </span>
                    <div>
                      <span className="admin-caixa-close-mov-label">Suprimentos</span>
                      <strong>{formatCurrency(suprimentos)}</strong>
                      <span className="admin-caixa-close-mov-meta">Entrada na gaveta</span>
                    </div>
                  </div>
                ) : null}
                {recebimentos.map((row) => (
                  <div key={`rec-${row.codigo}`} className="admin-caixa-close-mov-card is-recebimento">
                    <span className="admin-caixa-close-mov-icon" aria-hidden="true">
                      <i className="ph ph-arrow-down" />
                    </span>
                    <div>
                      <span className="admin-caixa-close-mov-label">Recebido ({row.label})</span>
                      <strong>{formatCurrency(row.valor)}</strong>
                      <span className="admin-caixa-close-mov-meta">Baixa de contas</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>

      <footer className="admin-caixa-close-footer">
        <div className="admin-caixa-close-footer-card">
          <div className="admin-caixa-close-footer-info">
            <span className="admin-caixa-close-kpi-icon" aria-hidden="true">
              <i className="ph ph-wallet" />
            </span>
            <div>
              <strong>Dinheiro esperado em caixa</strong>
              <span>Valor para conferência física</span>
            </div>
          </div>
          <strong className="admin-caixa-close-footer-value">{formatCurrency(esperado)}</strong>
        </div>
        <div className="admin-caixa-close-footer-actions">
          <button
            type="button"
            className="admin-btn admin-caixa-close-print"
            onClick={onPrint}
            disabled={busy || !summary}
          >
            <i className="ph ph-printer" aria-hidden="true" />
            Imprimir resumo
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary admin-caixa-close-continue"
            onClick={onContinue}
            disabled={busy}
          >
            Continuar
            <i className="ph ph-caret-right" aria-hidden="true" />
          </button>
        </div>
      </footer>
    </div>
  );
}
