'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { buildReportCsv } from '@/lib/admin/reports/reportCsv';
import {
  REPORT_FILTER_LABELS,
  formatCurrency,
  formatNumber,
} from '@/lib/admin/reports/reportFormatters';
import { useAdminData } from '@/hooks/useAdminData';
import { useAdminOverlayClose } from '@/hooks/useAdminOverlayClose';
import ReportPrintDocument from '@/components/admin/reports/ReportPrintDocument';
import ReportsKpiRow from '@/components/admin/reports/ReportsKpiRow';
import ReportsPerformanceChart from '@/components/admin/reports/ReportsPerformanceChart';
import ReportsSectionTitle from '@/components/admin/reports/ReportsSectionTitle';
import CaixaHistoricoPanel from '@/components/admin/caixa/CaixaHistoricoPanel';
import {
  AdminContentReveal,
  AdminReportsBodySkeleton,
} from '@/components/admin/AdminSkeleton';
import { formatDateKeyLabel } from '@/lib/admin/reports/reportPeriod';

const TIPO_ROWS = [
  { key: 'delivery', label: 'Delivery' },
  { key: 'retirada', label: 'Retirada' },
  { key: 'balcao', label: 'Balcão' },
];

const ORIGEM_ROWS = [
  { key: 'cardapio_online', label: 'Cardápio online' },
  { key: 'admin_manual', label: 'Balcão/Admin' },
];

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

function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function todayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function daysAgoKey(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function productInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function HorizontalBars({ rows, maxValue, valueKey = 'faturamento', showPct = true }) {
  const max = maxValue > 0 ? maxValue : 1;
  return (
    <ul className="admin-reports-hbar-list">
      {rows.map((row) => {
        const value = Number(row[valueKey]) || 0;
        const pct = Math.min(100, (value / max) * 100);
        return (
          <li key={row.key || row.label}>
            <div className="admin-reports-hbar-top">
              <span className="admin-reports-hbar-label">{row.label}</span>
              <span className="admin-reports-hbar-value">
                {valueKey === 'pedidos' ? formatNumber(value) : formatCurrency(value)}
                {showPct && row.sharePct != null ? (
                  <em>{formatNumber(row.sharePct, 1)}%</em>
                ) : null}
              </span>
            </div>
            <div className="admin-reports-hbar-track-wrap">
              <div className="admin-reports-hbar-track">
                <span style={{ width: `${pct}%` }} />
              </div>
            </div>
            {row.meta ? <p className="admin-reports-hbar-meta">{row.meta}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}

function ProductThumb({ nome, imagemUrl }) {
  if (imagemUrl) {
    return (
      <span className="admin-reports-bestsellers-thumb has-image">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imagemUrl} alt="" loading="lazy" decoding="async" />
      </span>
    );
  }
  return (
    <span className="admin-reports-bestsellers-thumb" aria-hidden="true">
      {productInitials(nome)}
    </span>
  );
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

function ProductsDetailModal({ products, periodLabel, resolveImage, onClose }) {
  const { overlayPointerDown, overlayClick } = useAdminOverlayClose({
    onClose,
    isDirty: false,
  });
  const rows = Array.isArray(products) ? products : [];

  return (
    <div
      className="admin-confirm-overlay"
      role="presentation"
      onPointerDown={overlayPointerDown}
      onClick={overlayClick}
    >
      <div
        className="admin-order-detail-modal admin-reports-products-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reports-products-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-order-detail-head">
          <div>
            <span className="admin-order-detail-kicker">
              Relatório · {periodLabel || 'Período'}
            </span>
            <h2 id="reports-products-modal-title">Detalhamento de produtos</h2>
            <p className="admin-help-text" style={{ margin: '6px 0 0' }}>
              {formatNumber(rows.length)} produto{rows.length === 1 ? '' : 's'} vendido
              {rows.length === 1 ? '' : 's'} no período
            </p>
          </div>
          <button type="button" className="admin-order-detail-close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>

        <div className="admin-reports-products-modal-body">
          {!rows.length ? (
            <p className="admin-help-text">Nenhum produto vendido no período com os filtros selecionados.</p>
          ) : (
            <div className="admin-reports-table-wrap">
              <table className="admin-reports-table admin-reports-products-modal-table">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Qtd vendida</th>
                    <th>Faturamento</th>
                    <th>% do faturamento</th>
                    <th>Pedidos</th>
                    <th>Ticket médio</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.nome}>
                      <td>
                        <div className="admin-reports-products-modal-product">
                          <span className="admin-reports-products-modal-rank">{index + 1}</span>
                          <ProductThumb nome={row.nome} imagemUrl={resolveImage?.(row)} />
                          <strong>{row.nome}</strong>
                        </div>
                      </td>
                      <td>{formatNumber(row.quantidade)}</td>
                      <td>
                        <strong>{formatCurrency(row.faturamento)}</strong>
                      </td>
                      <td>
                        <span className="admin-reports-badge brand">
                          {formatNumber(row.sharePct, 1)}%
                        </span>
                      </td>
                      <td>{formatNumber(row.pedidosComProduto)}</td>
                      <td>{formatCurrency(row.ticketMedioNoPedido)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReportsDashboard() {
  const { activeSlug, data } = useAdminData();
  const [period, setPeriod] = useState(30);
  const [customFrom, setCustomFrom] = useState(daysAgoKey(29));
  const [customTo, setCustomTo] = useState(todayKey());
  const [customOpen, setCustomOpen] = useState(false);
  const [origem, setOrigem] = useState('all');
  const [tipo, setTipo] = useState('all');
  const [pagamento, setPagamento] = useState('all');
  const [exportOpen, setExportOpen] = useState(false);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [printJob, setPrintJob] = useState(null);
  const [entregadorDetail, setEntregadorDetail] = useState(null);
  const [productsOpen, setProductsOpen] = useState(false);
  const [showAllCouriers, setShowAllCouriers] = useState(false);
  const exportRef = useRef(null);
  const customRef = useRef(null);
  const canPortal = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    if (!exportOpen && !customOpen) return undefined;
    function onDocClick(event) {
      if (exportOpen && exportRef.current && !exportRef.current.contains(event.target)) {
        setExportOpen(false);
      }
      if (customOpen && customRef.current && !customRef.current.contains(event.target)) {
        setCustomOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [customOpen, exportOpen]);

  const loadReport = useCallback(
    async ({ silent = false } = {}) => {
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
        if (period === 'custom') {
          params.set('from', customFrom);
          params.set('to', customTo);
        }
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
    },
    [activeSlug, customFrom, customTo, origem, pagamento, period, tipo]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadReport();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadReport]);

  useEffect(() => {
    if (period !== 0) return undefined;
    const interval = window.setInterval(() => {
      void loadReport({ silent: true });
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [loadReport, period]);

  const hasData = (report?.summary?.pedidos || 0) > 0;
  const storeName = data?.loja?.nome || activeSlug || 'Loja';
  const topProducts = report?.topProducts || [];
  const podium = report?.podium || [];
  const payments = useMemo(() => report?.payments || [], [report?.payments]);
  const entregadores = report?.entregadores || [];
  const visibleCouriers = showAllCouriers ? entregadores : entregadores.slice(0, 5);

  const catalogImageByName = useMemo(() => {
    const map = new Map();
    const remember = (nome, image) => {
      const name = String(nome || '')
        .trim()
        .toLowerCase();
      const url = String(image || '').trim();
      if (name && url && !map.has(name)) map.set(name, url);
    };

    (data?.produtos || []).forEach((product) => {
      remember(product?.nome, product?.imagemUrl || product?.imagem_url);
    });

    (data?.marmitas || []).forEach((item) => {
      remember(item?.nomePublico || item?.nome, item?.imagemUrl || item?.imagem_url);
    });

    const pizzaSabores =
      data?.pizzaCardapio?.sabores ||
      data?.pizzaCardapio?.pizzaSabores ||
      [];
    if (Array.isArray(pizzaSabores)) {
      pizzaSabores.forEach((sabor) => {
        remember(sabor?.nome, sabor?.imagemUrl || sabor?.imagem_url);
      });
    }

    const pizzaCats = data?.pizzaCardapio?.categorias || [];
    if (Array.isArray(pizzaCats)) {
      pizzaCats.forEach((cat) => {
        (cat?.sabores || []).forEach((sabor) => {
          remember(sabor?.nome, sabor?.imagemUrl || sabor?.imagem_url);
        });
      });
    }

    return map;
  }, [data?.marmitas, data?.pizzaCardapio, data?.produtos]);

  function resolveProductImage(item) {
    if (item?.imagemUrl) return item.imagemUrl;
    const key = String(item?.nome || '')
      .trim()
      .toLowerCase();
    return catalogImageByName.get(key) || null;
  }

  const customPeriodLabel =
    period === 'custom'
      ? customFrom === customTo
        ? formatDateKeyLabel(customFrom)
        : `${formatDateKeyLabel(customFrom)} – ${formatDateKeyLabel(customTo)}`
      : 'Personalizado';

  const tipoBars = useMemo(() => {
    const byTipo = report?.summary?.byTipo || {};
    const total = report?.summary?.faturamento || 0;
    return TIPO_ROWS.map((row) => {
      const faturamento = Number(byTipo[row.key]?.faturamento) || 0;
      return {
        ...row,
        faturamento,
        sharePct: total > 0 ? (faturamento / total) * 100 : 0,
      };
    }).filter((row) => row.faturamento > 0 || hasData);
  }, [hasData, report]);

  const origemBars = useMemo(() => {
    const byOrigem = report?.summary?.byOrigem || {};
    const total = report?.summary?.faturamento || 0;
    return ORIGEM_ROWS.map((row) => {
      const faturamento = Number(byOrigem[row.key]?.faturamento) || 0;
      return {
        ...row,
        faturamento,
        sharePct: total > 0 ? (faturamento / total) * 100 : 0,
      };
    }).filter((row) => row.faturamento > 0 || hasData);
  }, [hasData, report]);

  const paymentBars = useMemo(() => {
    const total = report?.summary?.faturamento || 0;
    return payments.map((row) => ({
      key: row.code,
      label: row.label,
      faturamento: row.faturamento,
      sharePct: total > 0 ? (row.faturamento / total) * 100 : 0,
    }));
  }, [payments, report]);

  const courierBars = useMemo(
    () =>
      visibleCouriers.map((row) => ({
        key: row.id || row.nome,
        label: row.nome,
        pedidos: row.pedidos,
        meta: `Taxa média ${formatCurrency(row.taxaMedia ?? 0)}`,
        raw: row,
      })),
    [visibleCouriers]
  );

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
    setExportOpen(false);
    setPrintJob({ report, storeName });
  }, [hasData, report, storeName]);

  const exportCsv = useCallback(() => {
    if (!report || !hasData) return;
    setExportOpen(false);
    const suffix =
      period === 'custom'
        ? `${customFrom}_${customTo}`
        : period === 0
          ? 'hoje'
          : `${period}d`;
    downloadCsv(`relatorio-${activeSlug}-${suffix}.csv`, buildReportCsv(report));
  }, [activeSlug, customFrom, customTo, hasData, period, report]);

  function selectPeriod(next) {
    setCustomOpen(false);
    setEntregadorDetail(null);
    setProductsOpen(false);
    setShowAllCouriers(false);
    setPeriod(next);
  }

  function applyCustomRange() {
    if (!customFrom || !customTo) return;
    setEntregadorDetail(null);
    setProductsOpen(false);
    setShowAllCouriers(false);
    setPeriod('custom');
    setCustomOpen(false);
  }

  function updateOrigem(value) {
    setEntregadorDetail(null);
    setProductsOpen(false);
    setShowAllCouriers(false);
    setOrigem(value);
  }

  function updateTipo(value) {
    setEntregadorDetail(null);
    setProductsOpen(false);
    setShowAllCouriers(false);
    setTipo(value);
  }

  function updatePagamento(value) {
    setEntregadorDetail(null);
    setProductsOpen(false);
    setShowAllCouriers(false);
    setPagamento(value);
  }

  const maxTipo = Math.max(0, ...tipoBars.map((row) => row.faturamento));
  const maxOrigem = Math.max(0, ...origemBars.map((row) => row.faturamento));
  const maxPayment = Math.max(0, ...paymentBars.map((row) => row.faturamento));
  const maxCourier = Math.max(0, ...courierBars.map((row) => row.pedidos));

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
              <p className="admin-reports-subtitle">Acompanhe o desempenho da sua loja.</p>
            </div>
          </div>

          <div className="admin-reports-export-wrap" ref={exportRef}>
            <button
              type="button"
              className="admin-reports-export-btn is-primary"
              disabled={!report || !hasData}
              aria-expanded={exportOpen}
              onClick={() => setExportOpen((value) => !value)}
            >
              Exportar
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {exportOpen ? (
              <div className="admin-reports-export-menu" role="menu">
                <button type="button" role="menuitem" onClick={exportPdf}>
                  Exportar PDF
                </button>
                <button type="button" role="menuitem" onClick={exportCsv}>
                  Exportar CSV
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="admin-reports-body">
        <section className="admin-reports-period-bar">
          <div className="admin-reports-period-tabs" role="tablist" aria-label="Período">
            <button
              type="button"
              role="tab"
              aria-selected={period === 0}
              className={`admin-reports-period-tab ${period === 0 ? 'active' : ''}`}
              onClick={() => selectPeriod(0)}
            >
              Hoje
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={period === 7}
              className={`admin-reports-period-tab ${period === 7 ? 'active' : ''}`}
              onClick={() => selectPeriod(7)}
            >
              7 dias
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={period === 30}
              className={`admin-reports-period-tab ${period === 30 ? 'active' : ''}`}
              onClick={() => selectPeriod(30)}
            >
              30 dias
            </button>
            <div className="admin-reports-period-custom-wrap" ref={customRef}>
              <button
                type="button"
                role="tab"
                aria-selected={period === 'custom'}
                aria-expanded={customOpen}
                className={`admin-reports-period-tab ${period === 'custom' || customOpen ? 'active' : ''}`}
                onClick={() => setCustomOpen((value) => !value)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 2v4" />
                  <path d="M16 2v4" />
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M3 10h18" />
                </svg>
                <span className="admin-reports-period-custom-label">{customPeriodLabel}</span>
              </button>
              {customOpen ? (
                <div className="admin-reports-period-popover" role="dialog" aria-label="Período personalizado">
                  <p className="admin-reports-period-popover-title">Escolha o intervalo</p>
                  <label>
                    Início
                    <input
                      type="date"
                      className="admin-input"
                      value={customFrom}
                      max={customTo || todayKey()}
                      onChange={(event) => setCustomFrom(event.target.value)}
                    />
                  </label>
                  <label>
                    Fim
                    <input
                      type="date"
                      className="admin-input"
                      value={customTo}
                      min={customFrom}
                      max={todayKey()}
                      onChange={(event) => setCustomTo(event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary admin-reports-period-popover-apply"
                    onClick={applyCustomRange}
                  >
                    Aplicar período
                  </button>
                </div>
              ) : null}
            </div>
          </div>
          <p className="admin-reports-compare-hint">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            {report?.compareLabel || 'Comparado com o período anterior'}
          </p>
        </section>

        <section className="admin-reports-filter-bar">
          <label className="admin-reports-filter-field">
            <span>Origem</span>
            <select
              className="admin-input"
              value={origem}
              onChange={(event) => updateOrigem(event.target.value)}
            >
              {Object.entries(REPORT_FILTER_LABELS.origem).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-reports-filter-field">
            <span>Tipo de pedido</span>
            <select
              className="admin-input"
              value={tipo}
              onChange={(event) => updateTipo(event.target.value)}
            >
              {Object.entries(REPORT_FILTER_LABELS.tipo).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-reports-filter-field">
            <span>Pagamento</span>
            <select
              className="admin-input"
              value={pagamento}
              onChange={(event) => updatePagamento(event.target.value)}
            >
              {Object.entries(REPORT_FILTER_LABELS.pagamento).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="admin-reports-filters-btn" title="Use os filtros ao lado">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
            </svg>
            Filtros
          </button>
        </section>

        {error ? (
          <div className="admin-reports-error" role="alert">
            {error}
          </div>
        ) : null}

        {loading && !report ? (
          <AdminReportsBodySkeleton />
        ) : (
          <AdminContentReveal ready className="admin-reports-content-reveal">
            <ReportsKpiRow kpis={report?.kpis} sparklines={report?.kpiSparklines} />

            <ReportsPerformanceChart series={report?.series || []} />

            <section className="admin-reports-grid-2">
              <article className="admin-reports-card">
                <div className="admin-reports-card-head">
                  <ReportsSectionTitle icon="star">Produtos mais vendidos</ReportsSectionTitle>
                </div>
                {!podium.length ? (
                  <div className="admin-reports-empty">Nenhum produto no período.</div>
                ) : (
                  <ol className="admin-reports-bestsellers">
                    {podium.map((item, index) => (
                      <li key={item.nome}>
                        <span className="admin-reports-bestsellers-rank">{index + 1}</span>
                        <ProductThumb nome={item.nome} imagemUrl={resolveProductImage(item)} />
                        <div className="admin-reports-bestsellers-copy">
                          <strong>{item.nome}</strong>
                          <span>
                            {formatNumber(item.quantidade)} vendas · {formatNumber(item.sharePct, 1)}%
                          </span>
                        </div>
                        <em className="admin-reports-bestsellers-rev">
                          {formatCurrency(item.faturamento)}
                        </em>
                      </li>
                    ))}
                  </ol>
                )}
                <button
                  type="button"
                  className="admin-reports-link-btn"
                  onClick={() => setProductsOpen(true)}
                >
                  Ver todos os produtos
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </button>
              </article>

              <article className="admin-reports-card admin-reports-channels-card">
                <ReportsSectionTitle icon="bag">Por tipo de pedido</ReportsSectionTitle>
                <HorizontalBars rows={tipoBars} maxValue={maxTipo} />
                <div className="admin-reports-channels-split">
                  <ReportsSectionTitle icon="store">Por origem</ReportsSectionTitle>
                </div>
                <HorizontalBars rows={origemBars} maxValue={maxOrigem} />
              </article>
            </section>

            <section className="admin-reports-grid-3">
              <article className="admin-reports-card">
                <ReportsSectionTitle icon="card">Formas de pagamento</ReportsSectionTitle>
                {!paymentBars.length ? (
                  <div className="admin-reports-empty">Sem pagamentos no período.</div>
                ) : (
                  <HorizontalBars rows={paymentBars} maxValue={maxPayment} />
                )}
              </article>

              <article className="admin-reports-card admin-reports-coupons-card">
                <ReportsSectionTitle icon="ticket">Cupons</ReportsSectionTitle>
                <div className="admin-reports-coupons-stats">
                  <div>
                    <span>Pedidos com cupom</span>
                    <strong>{formatNumber(report?.cupons?.pedidosComCupom || 0)}</strong>
                  </div>
                  <div>
                    <span>Descontos concedidos</span>
                    <strong>{formatCurrency(report?.cupons?.totalDesconto || 0)}</strong>
                  </div>
                </div>
                <p className="admin-reports-coupons-foot">
                  {formatNumber(report?.cupons?.sharePct || 0, 1)}% dos pedidos
                </p>
              </article>

              <article className="admin-reports-card">
                <ReportsSectionTitle icon="users">Entregas por entregador</ReportsSectionTitle>
                {!courierBars.length ? (
                  <div className="admin-reports-empty">Nenhuma entrega no período.</div>
                ) : (
                  <ul className="admin-reports-hbar-list">
                    {courierBars.map((row) => {
                      const pct = maxCourier > 0 ? (row.pedidos / maxCourier) * 100 : 0;
                      return (
                        <li key={row.key}>
                          <button
                            type="button"
                            className="admin-reports-courier-row"
                            onClick={() => setEntregadorDetail(row.raw)}
                          >
                            <div className="admin-reports-hbar-top">
                              <span className="admin-reports-hbar-label">{row.label}</span>
                              <span className="admin-reports-hbar-value">
                                {formatNumber(row.pedidos)}
                              </span>
                            </div>
                            <div className="admin-reports-hbar-track-wrap">
                              <div className="admin-reports-hbar-track">
                                <span style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                            <p className="admin-reports-hbar-meta">{row.meta}</p>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {entregadores.length > 5 ? (
                  <button
                    type="button"
                    className="admin-reports-link-btn"
                    onClick={() => setShowAllCouriers((value) => !value)}
                  >
                    {showAllCouriers ? 'Mostrar menos' : 'Ver todos os entregadores'}
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </button>
                ) : null}
              </article>
            </section>

            <section className="admin-reports-grid-bottom">
              <article className="admin-reports-card admin-reports-cash-card">
                <div className="admin-reports-card-head">
                  <ReportsSectionTitle icon="cash">Histórico de caixa</ReportsSectionTitle>
                </div>
                <CaixaHistoricoPanel compact />
              </article>
            </section>
          </AdminContentReveal>
        )}
      </div>

      {canPortal && productsOpen
        ? createPortal(
            <ProductsDetailModal
              products={topProducts}
              periodLabel={report?.periodLabel}
              resolveImage={resolveProductImage}
              onClose={() => setProductsOpen(false)}
            />,
            document.body
          )
        : null}

      {canPortal && entregadorDetail
        ? createPortal(
            <EntregadorDeliveriesModal
              row={entregadorDetail}
              periodLabel={report?.periodLabel}
              onClose={() => setEntregadorDetail(null)}
            />,
            document.body
          )
        : null}

      {canPortal && printJob
        ? createPortal(
            <ReportPrintDocument report={printJob.report} storeName={printJob.storeName} />,
            document.body
          )
        : null}
    </div>
  );
}
