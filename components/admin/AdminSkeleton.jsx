'use client';

import { useEffect, useState } from 'react';

/** Tempo mínimo do skeleton de catálogo para ser perceptível na navegação. */
const CATALOG_SKELETON_MIN_MS = 380;

/**
 * Mostra skeleton no mount (SSR + client iguais) e só libera depois de `ready`
 * + um tempo mínimo — assim aparece de verdade ao abrir produtos/adicionais/etc.
 */
export function useAdminMountSkeleton(ready = false, minMs = CATALOG_SKELETON_MIN_MS) {
  const [showSkeleton, setShowSkeleton] = useState(true);

  useEffect(() => {
    if (!ready) {
      setShowSkeleton(true);
      return undefined;
    }
    const timer = window.setTimeout(() => setShowSkeleton(false), minMs);
    return () => window.clearTimeout(timer);
  }, [ready, minMs]);

  return showSkeleton;
}

/** Bloco cinza reutilizável para placeholders de carregamento. */
export function AdminSkeletonBlock({ className = '', style, ...props }) {
  return (
    <div
      className={`admin-skeleton-block ${className}`.trim()}
      style={style}
      aria-hidden="true"
      {...props}
    />
  );
}

export function AdminSkeletonLines({ count = 3, className = '' }) {
  return (
    <div className={`admin-skeleton-lines ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <AdminSkeletonBlock
          key={index}
          className={`admin-skeleton-line${index === count - 1 ? ' is-short' : ''}`}
        />
      ))}
    </div>
  );
}

/** Envolve o conteúdo e aplica fade-in quando `ready`. */
export function AdminContentReveal({ ready = false, className = '', children }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ready) {
      setVisible(false);
      return undefined;
    }
    let cancelled = false;
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (!cancelled) setVisible(true);
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [ready]);

  return (
    <div className={`admin-content-reveal${visible ? ' is-ready' : ''} ${className}`.trim()}>
      {children}
    </div>
  );
}

export function AdminIntegracoesSkeleton() {
  return (
    <div className="admin-integration-sections" aria-busy="true" aria-label="Carregando integrações">
      <section className="admin-integration-section">
        <div className="admin-integration-section-header">
          <AdminSkeletonBlock style={{ width: 140, height: 22 }} />
          <AdminSkeletonBlock style={{ width: '70%', maxWidth: 360, height: 14, marginTop: 8 }} />
        </div>
        <div className="admin-integration-cards-grid admin-integration-cards-grid-payments">
          {[0, 1, 2].map((key) => (
            <div
              key={key}
              className="admin-card admin-store-block-card admin-compact-page-card admin-integration-card"
            >
              <AdminSkeletonBlock style={{ width: 160, height: 40 }} />
              <AdminSkeletonLines count={2} className="admin-skeleton-card-body" />
            </div>
          ))}
        </div>
      </section>
      <section className="admin-integration-section">
        <div className="admin-integration-section-header">
          <AdminSkeletonBlock style={{ width: 120, height: 22 }} />
          <AdminSkeletonBlock style={{ width: '65%', maxWidth: 320, height: 14, marginTop: 8 }} />
        </div>
        <div className="admin-integration-cards-grid">
          {[0, 1].map((key) => (
            <div
              key={key}
              className="admin-card admin-store-block-card admin-compact-page-card admin-integration-card"
            >
              <AdminSkeletonBlock style={{ width: 140, height: 32 }} />
              <AdminSkeletonLines count={3} className="admin-skeleton-card-body" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function AdminLojaSkeleton() {
  return (
    <div className="admin-loja-skeleton" aria-busy="true" aria-label="Carregando Minha loja">
      <div className="admin-loja-skeleton-actions">
        <AdminSkeletonBlock />
      </div>
      <div className="admin-card admin-store-section-card admin-loja-skeleton-profile">
        <AdminSkeletonBlock style={{ width: 180, height: 22, marginBottom: 20 }} />
        <div className="admin-loja-skeleton-personalizacao">
          <div className="admin-loja-skeleton-brand">
            <AdminSkeletonBlock className="admin-loja-skeleton-logo" />
            <AdminSkeletonBlock className="admin-loja-skeleton-palette" />
          </div>
          <AdminSkeletonBlock className="admin-loja-skeleton-cover" />
        </div>
      </div>
      <div className="admin-card admin-store-block-card admin-compact-page-card">
        <AdminSkeletonBlock style={{ width: 160, height: 18, marginBottom: 16 }} />
        <AdminSkeletonLines count={5} />
      </div>
      <div className="admin-card admin-store-block-card admin-compact-page-card">
        <AdminSkeletonBlock style={{ width: 140, height: 18, marginBottom: 16 }} />
        <AdminSkeletonLines count={4} />
      </div>
      <div className="admin-card admin-store-block-card admin-compact-page-card">
        <AdminSkeletonBlock style={{ width: 180, height: 18, marginBottom: 16 }} />
        <AdminSkeletonLines count={3} />
      </div>
    </div>
  );
}

export function AdminEntregaSkeleton() {
  return (
    <div className="admin-delivery-layout" aria-busy="true" aria-label="Carregando Entrega">
      <section className="admin-delivery-cards-grid admin-delivery-primary-grid">
        {[0, 1].map((key) => (
          <div key={key} className="admin-card admin-store-block-card admin-compact-page-card">
            <AdminSkeletonBlock style={{ width: 160, height: 18, marginBottom: 14 }} />
            <AdminSkeletonLines count={4} />
          </div>
        ))}
      </section>
      <div className="admin-card admin-store-block-card admin-compact-page-card">
        <AdminSkeletonBlock style={{ width: 180, height: 18, marginBottom: 14 }} />
        <AdminSkeletonLines count={3} />
      </div>
      <div className="admin-card admin-store-block-card admin-compact-page-card">
        <AdminSkeletonBlock style={{ width: 200, height: 18, marginBottom: 14 }} />
        <AdminSkeletonLines count={4} />
      </div>
    </div>
  );
}

export function AdminReportsBodySkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando relatório">
      <section className="admin-reports-kpi-grid admin-reports-kpi-grid-skeleton">
        {Array.from({ length: 3 }, (_, index) => (
          <article key={index} className="admin-reports-kpi is-skeleton">
            <AdminSkeletonBlock style={{ width: '45%', height: 12 }} />
            <AdminSkeletonBlock style={{ width: '70%', height: 24, marginTop: 10 }} />
            <AdminSkeletonBlock style={{ width: '35%', height: 18, marginTop: 10, borderRadius: 999 }} />
          </article>
        ))}
      </section>
      <section className="admin-reports-card" style={{ marginTop: 16, minHeight: 280 }}>
        <AdminSkeletonBlock style={{ width: 200, height: 18, marginBottom: 16 }} />
        <AdminSkeletonLines count={6} />
      </section>
      <section className="admin-reports-grid-2" style={{ marginTop: 16 }}>
        <div className="admin-reports-card">
          <AdminSkeletonBlock style={{ width: 160, height: 16, marginBottom: 14 }} />
          <AdminSkeletonLines count={4} />
        </div>
        <div className="admin-reports-card">
          <AdminSkeletonBlock style={{ width: 140, height: 16, marginBottom: 14 }} />
          <AdminSkeletonLines count={4} />
        </div>
      </section>
    </div>
  );
}

export function AdminListSkeleton({ rows = 4 }) {
  return (
    <div className="admin-list-skeleton" aria-busy="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="admin-list-skeleton-row">
          <AdminSkeletonBlock className="admin-list-skeleton-avatar" />
          <AdminSkeletonLines count={2} className="admin-skeleton-card-body" />
        </div>
      ))}
    </div>
  );
}

/** Placeholder de catálogo (produtos, adicionais, marmitas, pizzas). */
export function AdminCatalogSkeleton() {
  return (
    <div
      className="admin-content admin-content-pedidos admin-catalog-page"
      aria-busy="true"
      aria-label="Carregando catálogo"
    >
      <div className="admin-pedidos-search-row">
        <AdminSkeletonBlock style={{ width: '100%', maxWidth: 420, height: 42, borderRadius: 12 }} />
      </div>
      <div className="admin-catalog-top-row admin-catalog-skeleton-top">
        <div className="admin-catalog-cats admin-catalog-skeleton-pills">
          {[120, 96, 110, 88].map((width) => (
            <AdminSkeletonBlock key={width} style={{ width, height: 34, borderRadius: 999 }} />
          ))}
        </div>
        <div className="admin-catalog-top-actions">
          <AdminSkeletonBlock style={{ width: 140, height: 38, borderRadius: 10 }} />
          <AdminSkeletonBlock style={{ width: 110, height: 38, borderRadius: 10 }} />
        </div>
      </div>
      <div className="admin-card admin-catalog-skeleton-list">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="admin-catalog-skeleton-row">
            <AdminSkeletonBlock className="admin-catalog-skeleton-thumb" />
            <div className="admin-catalog-skeleton-meta">
              <AdminSkeletonBlock style={{ width: '42%', height: 16 }} />
              <AdminSkeletonBlock style={{ width: '68%', height: 12, marginTop: 10 }} />
            </div>
            <AdminSkeletonBlock style={{ width: 72, height: 18, marginLeft: 'auto' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Placeholder do kanban de pedidos (primeira carga da sessão). */
export function AdminPedidosKanbanSkeleton() {
  return (
    <div className="admin-kanban admin-pedidos-kanban-skeleton" aria-busy="true" aria-label="Carregando pedidos">
      {['Novos', 'Em preparo', 'Saiu para entrega'].map((label) => (
        <div key={label} className="admin-kanban-col">
          <div className="admin-kanban-col-header">
            <AdminSkeletonBlock style={{ width: 120, height: 18 }} />
            <AdminSkeletonBlock style={{ width: 28, height: 22, borderRadius: 8 }} />
          </div>
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="admin-order-card admin-pedidos-skeleton-card">
              <AdminSkeletonBlock style={{ width: '48%', height: 14 }} />
              <AdminSkeletonBlock style={{ width: '72%', height: 12, marginTop: 12 }} />
              <AdminSkeletonBlock style={{ width: '36%', height: 12, marginTop: 10 }} />
              <AdminSkeletonBlock style={{ width: '100%', height: 34, marginTop: 16, borderRadius: 10 }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
