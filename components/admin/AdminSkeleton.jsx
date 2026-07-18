'use client';

import { useEffect, useState } from 'react';

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
      <AdminSkeletonBlock className="admin-loja-skeleton-cover" />
      <div className="admin-loja-skeleton-row">
        <AdminSkeletonBlock className="admin-loja-skeleton-logo" />
        <AdminSkeletonLines count={4} className="admin-skeleton-card-body" />
      </div>
      <div className="admin-card admin-store-block-card admin-compact-page-card">
        <AdminSkeletonLines count={5} />
      </div>
      <div className="admin-card admin-store-block-card admin-compact-page-card">
        <AdminSkeletonLines count={4} />
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
        {Array.from({ length: 6 }, (_, index) => (
          <article key={index} className="admin-reports-kpi is-skeleton">
            <AdminSkeletonBlock style={{ width: 36, height: 36, borderRadius: 10 }} />
            <AdminSkeletonBlock style={{ width: '55%', height: 12, marginTop: 14 }} />
            <AdminSkeletonBlock style={{ width: '70%', height: 22, marginTop: 10 }} />
            <AdminSkeletonBlock style={{ width: '45%', height: 10, marginTop: 10 }} />
          </article>
        ))}
      </section>
      <section className="admin-reports-card" style={{ marginTop: 16 }}>
        <AdminSkeletonBlock style={{ width: 180, height: 18, marginBottom: 16 }} />
        <AdminSkeletonLines count={5} />
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
