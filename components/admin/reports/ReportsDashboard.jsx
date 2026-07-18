'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { buildReportCsv } from '@/lib/admin/reports/reportCsv';
import { formatCurrency, formatNumber, formatPct } from '@/lib/admin/reports/reportFormatters';
import { useAdminData } from '@/hooks/useAdminData';
import { useAdminOverlayClose } from '@/hooks/useAdminOverlayClose';
import ReportPrintDocument from '@/components/admin/reports/ReportPrintDocument';
import CaixaHistoricoPanel from '@/components/admin/caixa/CaixaHistoricoPanel';
import { CaixaStatusChip } from '@/components/admin/caixa/CaixaPanels';
import {
  AdminContentReveal,
  AdminReportsBodySkeleton,
} from '@/components/admin/AdminSkeleton';

function formatDeliveryWhen(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function EntregadorDeliveriesModal({ row, periodLabel, onClose }) {
  const { overlayPointerDown, overlayClick } = useAdminOverlayClose({
    onClose,
    isDirty: false,
  });

  if (!row) return null;

  const entregas = Array.isArray(row.entregas) ? row.entregas : [];

  return (
    <div
      className="admin-confirm-overlay"
      role="presentation"
      onPointerDown={overlayPointerDown}
      onClick={overlayClick}
    >
      <div
        className="admin-order-detail-modal admin-delivery-history-modal admin-reports-entregador-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reports-entregador-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-order-detail-head">
          <div>
            <span className="admin-order-detail-kicker">
              Conferência · {periodLabel || 'Período'}
            </span>
            <h2 id="reports-entregador-modal-title">{row.nome}</h2>
            <p className="admin-help-text" style={{ margin: '6px 0 0' }}>
              {formatNumber(row.pedidos)} entrega{row.pedidos === 1 ? '' : 's'} · taxa total{' '}
              {formatCurrency(row.taxaEntrega)} · média {formatCurrency(row.taxaMedia ?? 0)}
            </p>
          </div>
          <button type="button" className="admin-order-detail-close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>

        <div className="admin-delivery-history-modal-body">
          <div className="admin-reports-entregador-modal-totals" aria-hidden="true">
            <span>
              Entregas: <strong>{formatNumber(row.pedidos)}</strong>
            </span>
            <span>
              Taxa total: <strong>{formatCurrency(row.taxaEntrega)}</strong>
            </span>
            <span>
              Taxa média: <strong>{formatCurrency(row.taxaMedia ?? 0)}</strong>
            </span>
          </div>

          {entregas.length === 0 ? (
            <p className="admin-help-text">Nenhuma entrega detalhada neste período.</p>
          ) : (
            <ul className="admin-delivery-history-modal-stops">
              {entregas.map((entrega) => (
                <li key={entrega.id || entrega.codigo}>
                  <div>
                    <strong>
                      #{entrega.codigo} · {entrega.clienteNome}
                    </strong>
                    <span>{entrega.enderecoTexto || 'Sem endereço'}</span>
                    <span>
                      {formatDeliveryWhen(entrega.concluidoEm)} · pedido{' '}
                      {formatCurrency(entrega.total)}
                    </span>
                  </div>
                  <em>{formatCurrency(entrega.taxaEntrega)}</em>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function TrendBadge({ kpi }) {
  if (!kpi) return null;
  return (
    <span className={`admin-reports-kpi-trend ${kpi.positive ? 'positive' : 'negative'}`}>
      {kpi.positive ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
          <polyline points="16 17 22 17 22 11" />
        </svg>
      )}
      {formatPct(kpi.changePct)}
    </span>
  );
}

function KpiCard({ label, value, kpi, format = 'currency', iconTone = 'brand' }) {
  const display =
    format === 'currency'
      ? formatCurrency(value)
      : format === 'decimal'
        ? formatNumber(value, 2)
        : formatNumber(value, 0);

  return (
    <article className="admin-reports-kpi">
      <div className="admin-reports-kpi-top">
        <div className={`admin-reports-kpi-icon ${iconTone === 'green' ? 'is-green' : iconTone === 'red' ? 'is-red' : 'is-brand'}`}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <TrendBadge kpi={kpi} />
      </div>
      <p className="admin-reports-kpi-label">{label}</p>
      <p className="admin-reports-kpi-value">{display}</p>
      <p className="admin-reports-kpi-meta">Período anterior: {format === 'currency' ? formatCurrency(kpi?.previous) : format === 'decimal' ? formatNumber(kpi?.previous, 2) : formatNumber(kpi?.previous, 0)}</p>
      <div className="admin-reports-kpi-bar">
        <span className={kpi?.positive ? '' : 'negative'} style={{ width: `${Math.max(0, Math.min(100, kpi?.progressPct || 0))}%` }} />
      </div>
    </article>
  );
}

const KPI_CONFIG = [
  { key: 'faturamento', label: 'Faturamento', format: 'currency', iconTone: 'brand' },
  { key: 'pedidos', label: 'Pedidos', format: 'number', iconTone: 'brand' },
  { key: 'ticketMedio', label: 'Ticket médio', format: 'currency', iconTone: 'green' },
  { key: 'itensVendidos', label: 'Itens vendidos', format: 'number', iconTone: 'brand' },
  { key: 'itensPorPedido', label: 'Itens por pedido', format: 'decimal', iconTone: 'green' },
  { key: 'taxaEntrega', label: 'Taxa de entrega', format: 'currency', iconTone: 'red' },
];

export default function ReportsDashboard() {
  const { activeSlug, data } = useAdminData();
  const [period, setPeriod] = useState(0);
  const [origem, setOrigem] = useState('all');
  const [tipo, setTipo] = useState('all');
  const [pagamento, setPagamento] = useState('all');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [printJob, setPrintJob] = useState(null);
  const [portalReady, setPortalReady] = useState(false);
  const [entregadorDetail, setEntregadorDetail] = useState(null);

  useEffect(() => {
    setPortalReady(typeof document !== 'undefined');
  }, []);

  const loadReport = useCallback(async ({ silent = false } = {}) => {
    if (!activeSlug) return;
    if (!silent) setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        slug: activeSlug,
        period: String(period),
        origem,
        tipo,
        pagamento,
      });
      const response = await fetch(`/api/admin/reports?${params.toString()}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível carregar o relatório.');
      }
      setReport(payload.report);
    } catch (loadError) {
      setError(loadError?.message || 'Erro ao carregar relatório.');
      setReport(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [activeSlug, origem, pagamento, period, tipo]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  useEffect(() => {
    setEntregadorDetail(null);
  }, [period, origem, tipo, pagamento]);

  useEffect(() => {
    if (period !== 0) return undefined;
    const interval = window.setInterval(() => {
      void loadReport({ silent: true });
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [loadReport, period]);

  const updatedLabel = useMemo(() => {
    if (!report?.generatedAt) return '—';
    return new Date(report.generatedAt).toLocaleString('pt-BR');
  }, [report?.generatedAt]);

  const topProducts = report?.topProducts || [];
  const hasData = (report?.summary?.pedidos || 0) > 0;
  const storeName = data?.loja?.nome || activeSlug || 'Loja';

  useEffect(() => {
    if (!printJob) return;

    document.body.classList.add('report-printing');

    let cancelled = false;
    let fallbackTimer = null;

    const clear = () => {
      if (cancelled) return;
      cancelled = true;
      document.body.classList.remove('report-printing');
      setPrintJob(null);
    };

    const onAfterPrint = () => {
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      clear();
    };

    window.addEventListener('afterprint', onAfterPrint);

    const timer = window.setTimeout(() => {
      if (cancelled) return;
      window.print();
      fallbackTimer = window.setTimeout(clear, 10000);
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      window.removeEventListener('afterprint', onAfterPrint);
      document.body.classList.remove('report-printing');
    };
  }, [printJob]);

  const exportPdf = useCallback(() => {
    if (!report || !hasData) return;
    setPrintJob({ report, storeName });
  }, [hasData, report, storeName]);

  return (
    <div className="admin-reports-page">
      <header className="admin-reports-header">
        <div className="admin-reports-header-inner">
          <div className="admin-reports-header-main">
            <div className="admin-reports-header-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
            </div>
            <div>
              <h1 className="admin-reports-title">Relatórios de vendas</h1>
              <p className="admin-reports-subtitle">
                {report?.periodLabel || 'Hoje'} · {report?.compareLabel || 'Comparado com ontem'}
              </p>
              <CaixaStatusChip />
            </div>
          </div>

          <div className="admin-reports-header-actions">
            <div className="admin-reports-period-tabs" role="tablist" aria-label="Período">
              <button
                type="button"
                role="tab"
                aria-selected={period === 0}
                className={`admin-reports-period-tab ${period === 0 ? 'active' : ''}`}
                onClick={() => setPeriod(0)}
              >
                Hoje
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={period === 7}
                className={`admin-reports-period-tab ${period === 7 ? 'active' : ''}`}
                onClick={() => setPeriod(7)}
              >
                7 dias
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={period === 30}
                className={`admin-reports-period-tab ${period === 30 ? 'active' : ''}`}
                onClick={() => setPeriod(30)}
              >
                30 dias
              </button>
            </div>
            <div className="admin-reports-updated">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 2v4" />
                <path d="M16 2v4" />
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M3 10h18" />
              </svg>
              <span>{updatedLabel}</span>
            </div>
            <button
              type="button"
              className="admin-reports-export-btn is-primary"
              disabled={!report || !hasData}
              onClick={exportPdf}
            >
              Exportar PDF
            </button>
            <button
              type="button"
              className="admin-reports-export-btn is-secondary"
              disabled={!report || !hasData}
              onClick={() =>
                downloadCsv(
                  `relatorio-${activeSlug}-${period === 0 ? 'hoje' : `${period}d`}.csv`,
                  buildReportCsv(report)
                )
              }
            >
              Exportar CSV
            </button>
          </div>
        </div>
      </header>

      <div className="admin-reports-body">
        <section className="admin-reports-card">
          <h2 className="admin-reports-card-title">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z" />
            </svg>
            Filtros
          </h2>
          <div className="admin-reports-filters">
            <div>
              <span className="admin-reports-filter-label">Origem</span>
              <div className="admin-reports-segmented">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'cardapio_online', label: 'Cardápio online' },
                  { id: 'admin_manual', label: 'Balcão/Admin' },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={origem === option.id ? 'active' : ''}
                    onClick={() => setOrigem(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="admin-reports-filter-label">Tipo de pedido</span>
              <select className="admin-reports-select" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="all">Todos</option>
                <option value="delivery">Delivery</option>
                <option value="retirada">Retirada</option>
                <option value="balcao">Balcão</option>
              </select>
            </div>
            <div>
              <span className="admin-reports-filter-label">Pagamento</span>
              <select className="admin-reports-select" value={pagamento} onChange={(e) => setPagamento(e.target.value)}>
                <option value="all">Todas</option>
                <option value="pix">Pix</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="credito">Crédito</option>
                <option value="debito">Débito</option>
              </select>
            </div>
          </div>
        </section>

        {loading ? <AdminReportsBodySkeleton /> : null}
        {error ? <div className="admin-reports-error">{error}</div> : null}

        {!loading && !error && report ? (
          <AdminContentReveal ready>
            <section className="admin-reports-kpi-grid" aria-label="Indicadores">
              {KPI_CONFIG.map((item) => (
                <KpiCard
                  key={item.key}
                  label={item.label}
                  value={report.kpis[item.key]?.value}
                  kpi={report.kpis[item.key]}
                  format={item.format}
                  iconTone={item.iconTone}
                />
              ))}
            </section>

            <section className="admin-reports-card admin-reports-table-card">
              <div className="admin-reports-table-head">
                <h2 className="admin-reports-card-title" style={{ margin: 0 }}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  Top por faturamento
                </h2>
              </div>

              {!topProducts.length ? (
                <div className="admin-reports-empty">Nenhum produto vendido no período com os filtros selecionados.</div>
              ) : (
                <>
                  <div className="admin-reports-table-wrap">
                    <table className="admin-reports-table">
                      <thead>
                        <tr>
                          <th>Produto</th>
                          <th>Qtd vendida</th>
                          <th>Faturamento</th>
                          <th>% do fat.</th>
                          <th>Pedidos</th>
                          <th>Ticket médio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topProducts.map((row) => (
                          <tr key={row.nome}>
                            <td>{row.nome}</td>
                            <td>{formatNumber(row.quantidade)}</td>
                            <td>
                              <strong>{formatCurrency(row.faturamento)}</strong>
                            </td>
                            <td>
                              <span className="admin-reports-badge brand">{formatNumber(row.sharePct, 1)}%</span>
                            </td>
                            <td>{formatNumber(row.pedidosComProduto)}</td>
                            <td>{formatCurrency(row.ticketMedioNoPedido)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="admin-reports-mobile-list">
                    {topProducts.map((row) => (
                      <article key={row.nome} className="admin-reports-mobile-item">
                        <h4>{row.nome}</h4>
                        <div className="admin-reports-mobile-grid">
                          <div>
                            <span>Qtd vendida</span>
                            <strong>{formatNumber(row.quantidade)}</strong>
                          </div>
                          <div>
                            <span>Faturamento</span>
                            <strong>{formatCurrency(row.faturamento)}</strong>
                          </div>
                          <div>
                            <span>% do faturamento</span>
                            <strong>{formatNumber(row.sharePct, 1)}%</strong>
                          </div>
                          <div>
                            <span>Pedidos</span>
                            <strong>{formatNumber(row.pedidosComProduto)}</strong>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section className="admin-reports-bottom-grid">
              <article className="admin-reports-card">
                <h3 className="admin-reports-widget-title is-brand">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 3v16a2 2 0 0 0 2 2h16" />
                    <path d="M18 17V9" />
                    <path d="M13 17V5" />
                    <path d="M8 17v-3" />
                  </svg>
                  Resumo do período
                </h3>
                <div className="admin-reports-summary-list">
                  <div className="admin-reports-summary-row">
                    <div>
                      <span>Delivery</span>
                      <strong>{formatCurrency(report.summary.byTipo.delivery.faturamento)}</strong>
                    </div>
                    <span>{formatNumber(report.summary.byTipo.delivery.pedidos)} pedidos</span>
                  </div>
                  <div className="admin-reports-summary-row">
                    <div>
                      <span>Retirada</span>
                      <strong>{formatCurrency(report.summary.byTipo.retirada.faturamento)}</strong>
                    </div>
                    <span>{formatNumber(report.summary.byTipo.retirada.pedidos)} pedidos</span>
                  </div>
                  <div className="admin-reports-summary-row">
                    <div>
                      <span>Balcão</span>
                      <strong>{formatCurrency(report.summary.byTipo.balcao.faturamento)}</strong>
                    </div>
                    <span>{formatNumber(report.summary.byTipo.balcao.pedidos)} pedidos</span>
                  </div>
                  <div className="admin-reports-summary-highlight">
                    <p>Faturamento total</p>
                    <strong>{formatCurrency(report.summary.faturamento)}</strong>
                  </div>
                  <div className="admin-reports-summary-row">
                    <div>
                      <span>Cardápio online</span>
                      <strong>{formatCurrency(report.summary.byOrigem.cardapio_online.faturamento)}</strong>
                    </div>
                    <span>{formatNumber(report.summary.byOrigem.cardapio_online.pedidos)} pedidos</span>
                  </div>
                  <div className="admin-reports-summary-row">
                    <div>
                      <span>Balcão/Admin</span>
                      <strong>{formatCurrency(report.summary.byOrigem.admin_manual.faturamento)}</strong>
                    </div>
                    <span>{formatNumber(report.summary.byOrigem.admin_manual.pedidos)} pedidos</span>
                  </div>
                </div>
              </article>

              <article className="admin-reports-card">
                <h3 className="admin-reports-widget-title is-amber">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                    <path d="M4 22h16" />
                    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                  </svg>
                  Mais vendidos
                </h3>
                <p className="admin-reports-widget-subtitle">Ranking por quantidade vendida no período</p>
                <div className="admin-reports-podium">
                  {(report.podium || []).map((row, index) => (
                    <div key={row.nome} className="admin-reports-podium-item">
                      <div className={`admin-reports-podium-rank rank-${index + 1}`}>{index + 1}</div>
                      <div className="admin-reports-podium-copy">
                        <strong>{row.nome}</strong>
                        <span>
                          {formatNumber(row.quantidade)} un. · {formatNumber(row.sharePct, 1)}% das
                          vendas
                        </span>
                      </div>
                      <span className="admin-reports-badge brand">{formatCurrency(row.faturamento)}</span>
                    </div>
                  ))}
                  {!report.podium?.length ? <div className="admin-reports-empty">Sem vendas no período.</div> : null}
                </div>
              </article>

              <article className="admin-reports-card">
                <h3 className="admin-reports-widget-title is-purple">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
                    <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                    <path d="M12 17.5v-11" />
                  </svg>
                  Pagamentos e cupons
                </h3>
                <div className="admin-reports-payments-highlight">
                  <p>Pedidos concluídos</p>
                  <strong>{formatNumber(report.cupons.pedidos)}</strong>
                </div>
                <div className="admin-reports-mini-grid">
                  <div className="admin-reports-mini-stat">
                    <span>Com cupom</span>
                    <strong>{formatNumber(report.cupons.pedidosComCupom)}</strong>
                  </div>
                  <div className="admin-reports-mini-stat">
                    <span>Descontos</span>
                    <strong>{formatCurrency(report.cupons.totalDesconto)}</strong>
                  </div>
                </div>
                <div className="admin-reports-progress-block">
                  <div className="admin-reports-progress-head">
                    <span>Pedidos com cupom</span>
                    <span>{formatNumber(report.cupons.sharePct, 1)}%</span>
                  </div>
                  <div className="admin-reports-progress-bar">
                    <span style={{ width: `${Math.min(100, report.cupons.sharePct || 0)}%` }} />
                  </div>
                </div>
                <div className="admin-reports-summary-list" style={{ marginTop: 12 }}>
                  {(report.payments || []).slice(0, 4).map((row) => (
                    <div key={row.code} className="admin-reports-summary-row">
                      <div>
                        <span>{row.label}</span>
                        <strong>{formatCurrency(row.faturamento)}</strong>
                      </div>
                      <span>{formatNumber(row.pedidos)} pedidos</span>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="admin-reports-bottom-grid" style={{ marginTop: 16 }}>
              <article className="admin-reports-card" style={{ gridColumn: '1 / -1' }}>
                <h3 className="admin-reports-widget-title is-brand">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  Entregas por entregador
                </h3>
                {(report.entregadores || []).length ? (
                  <div className="admin-reports-summary-list">
                    {report.entregadores.map((row) => (
                      <button
                        key={row.id || row.nome}
                        type="button"
                        className="admin-reports-summary-row is-clickable"
                        onClick={() => setEntregadorDetail(row)}
                      >
                        <div>
                          <span>{row.nome}</span>
                          <strong>{formatCurrency(row.taxaEntrega)}</strong>
                        </div>
                        <span>
                          {formatNumber(row.pedidos)} ped. · taxa média{' '}
                          {formatCurrency(row.taxaMedia ?? 0)}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="admin-reports-empty">
                    Nenhum delivery concluído com entregador no período.
                  </div>
                )}
              </article>
            </section>
          </AdminContentReveal>
        ) : null}

        <CaixaHistoricoPanel />
      </div>

      {portalReady && entregadorDetail
        ? createPortal(
            <EntregadorDeliveriesModal
              row={entregadorDetail}
              periodLabel={report?.periodLabel || 'Hoje'}
              onClose={() => setEntregadorDetail(null)}
            />,
            document.body
          )
        : null}

      {portalReady && printJob
        ? createPortal(
            <ReportPrintDocument report={printJob.report} storeName={printJob.storeName} />,
            document.body
          )
        : null}
    </div>
  );
}
