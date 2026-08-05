'use client';

import { AdminSkeletonBlock, AdminSkeletonLines } from '@/components/admin/AdminSkeleton';

function SaSkeletonCard({ children, className = '' }) {
  return (
    <div className={`admin-card admin-sistema-panel-card admin-sa-skeleton-card ${className}`.trim()}>
      {children}
    </div>
  );
}

export function SaComandoSkeleton() {
  return (
    <div className="admin-sa-skeleton" aria-busy="true" aria-label="Carregando comando">
      <div className="admin-sistema-kpi-grid admin-comando-pulse-grid">
        {Array.from({ length: 8 }, (_, index) => (
          <article key={index} className="admin-sistema-kpi-card admin-sa-skeleton-kpi">
            <AdminSkeletonBlock style={{ width: '48%', height: 11 }} />
            <AdminSkeletonBlock style={{ width: '62%', height: 26, marginTop: 12 }} />
          </article>
        ))}
      </div>
      <div className="admin-sistema-inicio-grid">
        <SaSkeletonCard>
          <AdminSkeletonBlock style={{ width: 160, height: 18, marginBottom: 16 }} />
          <AdminSkeletonLines count={5} />
        </SaSkeletonCard>
        <SaSkeletonCard>
          <AdminSkeletonBlock style={{ width: 180, height: 18, marginBottom: 16 }} />
          <AdminSkeletonBlock style={{ width: 140, height: 28, borderRadius: 999, marginBottom: 18 }} />
          <AdminSkeletonLines count={4} />
        </SaSkeletonCard>
      </div>
    </div>
  );
}

export function SaStoresSkeleton({ rows = 5 }) {
  return (
    <div className="admin-sa-skeleton" aria-busy="true" aria-label="Carregando lojas">
      <div className="admin-sa-skeleton-toolbar">
        <AdminSkeletonBlock style={{ width: '100%', maxWidth: 360, height: 40, borderRadius: 12 }} />
      </div>
      <ul className="admin-sa-skeleton-store-list">
        {Array.from({ length: rows }, (_, index) => (
          <li key={index} className="admin-sa-skeleton-store-row">
            <AdminSkeletonBlock className="admin-sa-skeleton-avatar" />
            <div className="admin-sa-skeleton-store-main">
              <AdminSkeletonBlock style={{ width: '38%', height: 16 }} />
              <AdminSkeletonBlock style={{ width: '72%', height: 12, marginTop: 10 }} />
              <div className="admin-sa-skeleton-pills">
                <AdminSkeletonBlock style={{ width: 64, height: 22, borderRadius: 999 }} />
                <AdminSkeletonBlock style={{ width: 78, height: 22, borderRadius: 999 }} />
                <AdminSkeletonBlock style={{ width: 90, height: 22, borderRadius: 999 }} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SaComercialSkeleton() {
  return (
    <div className="admin-sa-skeleton" aria-busy="true" aria-label="Carregando comercial">
      <div className="admin-sistema-plan-catalog">
        {Array.from({ length: 3 }, (_, index) => (
          <article key={index} className="admin-sistema-plan-catalog-card admin-sa-skeleton-plan">
            <AdminSkeletonBlock style={{ width: '42%', height: 11 }} />
            <AdminSkeletonBlock style={{ width: '58%', height: 22, marginTop: 10 }} />
            <AdminSkeletonBlock style={{ width: '80%', height: 12, marginTop: 10 }} />
          </article>
        ))}
      </div>
      <div className="admin-sistema-kpi-grid admin-sistema-kpi-grid-ops">
        {Array.from({ length: 5 }, (_, index) => (
          <article key={index} className="admin-sistema-kpi-card admin-sa-skeleton-kpi">
            <AdminSkeletonBlock style={{ width: '50%', height: 11 }} />
            <AdminSkeletonBlock style={{ width: '55%', height: 24, marginTop: 12 }} />
          </article>
        ))}
      </div>
      <SaSkeletonCard className="admin-sistema-panel-card-wide">
        <div className="admin-sa-skeleton-toolbar">
          <AdminSkeletonBlock style={{ width: 220, height: 38, borderRadius: 12 }} />
          <AdminSkeletonBlock style={{ width: 280, height: 34, borderRadius: 999 }} />
        </div>
        <div className="admin-sa-skeleton-table">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="admin-sa-skeleton-table-row">
              <AdminSkeletonBlock style={{ width: '22%', height: 14 }} />
              <AdminSkeletonBlock style={{ width: '14%', height: 14 }} />
              <AdminSkeletonBlock style={{ width: '16%', height: 14 }} />
              <AdminSkeletonBlock style={{ width: '12%', height: 14 }} />
              <AdminSkeletonBlock style={{ width: '18%', height: 14 }} />
            </div>
          ))}
        </div>
      </SaSkeletonCard>
    </div>
  );
}

export function SaInboxSkeleton({ rows = 4 }) {
  return (
    <div className="admin-sa-skeleton" aria-busy="true" aria-label="Carregando inbox">
      <div className="admin-sa-skeleton-toolbar">
        <AdminSkeletonBlock style={{ width: 260, height: 34, borderRadius: 999 }} />
        <AdminSkeletonBlock style={{ width: 96, height: 34, borderRadius: 10 }} />
      </div>
      <div className="admin-sa-skeleton-inbox-list">
        {Array.from({ length: rows }, (_, index) => (
          <article key={index} className="admin-sa-skeleton-inbox-card">
            <div className="admin-sa-skeleton-inbox-head">
              <AdminSkeletonBlock style={{ width: 120, height: 14 }} />
              <AdminSkeletonBlock style={{ width: 72, height: 22, borderRadius: 999 }} />
            </div>
            <AdminSkeletonBlock style={{ width: '88%', height: 12, marginTop: 12 }} />
            <AdminSkeletonBlock style={{ width: '64%', height: 12, marginTop: 8 }} />
            <div className="admin-sa-skeleton-pills" style={{ marginTop: 14 }}>
              <AdminSkeletonBlock style={{ width: 72, height: 30, borderRadius: 10 }} />
              <AdminSkeletonBlock style={{ width: 88, height: 30, borderRadius: 10 }} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function SaRelatoriosSkeleton() {
  return (
    <div className="admin-sa-skeleton" aria-busy="true" aria-label="Carregando relatórios">
      <SaSkeletonCard className="admin-sistema-panel-card-wide">
        <div className="admin-sa-skeleton-toolbar">
          <AdminSkeletonBlock style={{ width: 180, height: 18 }} />
          <AdminSkeletonBlock style={{ width: 120, height: 34, borderRadius: 10 }} />
        </div>
        <div className="admin-sa-skeleton-table">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="admin-sa-skeleton-table-row">
              <AdminSkeletonBlock style={{ width: 28, height: 14 }} />
              <AdminSkeletonBlock style={{ width: '28%', height: 14 }} />
              <AdminSkeletonBlock style={{ width: '16%', height: 14 }} />
              <AdminSkeletonBlock style={{ width: '14%', height: 14 }} />
              <AdminSkeletonBlock style={{ width: '18%', height: 14 }} />
            </div>
          ))}
        </div>
      </SaSkeletonCard>
    </div>
  );
}

export function SaSistemaSkeleton() {
  return (
    <div className="admin-sa-skeleton" aria-busy="true" aria-label="Carregando sistema">
      <div className="admin-sa-skeleton-sistema-grid">
        {Array.from({ length: 4 }, (_, index) => (
          <SaSkeletonCard key={index}>
            <AdminSkeletonBlock style={{ width: '46%', height: 16, marginBottom: 14 }} />
            <AdminSkeletonLines count={index === 0 ? 4 : 3} />
            <AdminSkeletonBlock
              style={{ width: 120, height: 34, borderRadius: 10, marginTop: 16 }}
            />
          </SaSkeletonCard>
        ))}
      </div>
    </div>
  );
}

/** Skeleton do corpo do drawer da loja (qualquer aba). */
export function SaStoreDrawerSkeleton() {
  return (
    <div className="admin-sa-drawer-skeleton" aria-busy="true" aria-label="Carregando loja">
      <div className="admin-sa-drawer-skeleton-grid">
        <div className="admin-sa-drawer-skeleton-panel">
          <AdminSkeletonBlock style={{ width: 90, height: 11, marginBottom: 14 }} />
          <AdminSkeletonBlock style={{ width: '55%', height: 18, marginBottom: 12 }} />
          <AdminSkeletonLines count={3} />
        </div>
        <div className="admin-sa-drawer-skeleton-panel">
          <AdminSkeletonBlock style={{ width: 100, height: 11, marginBottom: 14 }} />
          <div className="admin-sa-drawer-skeleton-stats">
            {Array.from({ length: 4 }, (_, index) => (
              <AdminSkeletonBlock key={index} style={{ height: 54, borderRadius: 12 }} />
            ))}
          </div>
        </div>
      </div>
      <div className="admin-sa-drawer-skeleton-panel">
        <AdminSkeletonBlock style={{ width: 120, height: 11, marginBottom: 14 }} />
        <AdminSkeletonLines count={3} />
        <AdminSkeletonBlock style={{ width: 140, height: 36, borderRadius: 10, marginTop: 14 }} />
      </div>
      <div className="admin-sa-drawer-skeleton-panel">
        <AdminSkeletonBlock style={{ width: 140, height: 11, marginBottom: 14 }} />
        <div className="admin-sa-drawer-skeleton-stats">
          {Array.from({ length: 4 }, (_, index) => (
            <AdminSkeletonBlock key={index} style={{ height: 48, borderRadius: 12 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SaStoreDrawerHeroSkeleton() {
  return (
    <div className="admin-sa-drawer-hero-skeleton" aria-hidden="true">
      <AdminSkeletonBlock className="admin-sa-drawer-hero-avatar" />
      <div className="admin-sa-drawer-hero-copy">
        <AdminSkeletonBlock style={{ width: 180, height: 22 }} />
        <AdminSkeletonBlock style={{ width: 120, height: 12, marginTop: 10 }} />
      </div>
    </div>
  );
}

export function SaFeedbackSkeleton({ rows = 3 }) {
  return (
    <div className="admin-sa-skeleton-inbox-list" aria-busy="true" aria-label="Carregando feedback">
      {Array.from({ length: rows }, (_, index) => (
        <article key={index} className="admin-sa-skeleton-inbox-card">
          <div className="admin-sa-skeleton-inbox-head">
            <AdminSkeletonBlock style={{ width: 100, height: 14 }} />
            <AdminSkeletonBlock style={{ width: 64, height: 20, borderRadius: 999 }} />
          </div>
          <AdminSkeletonBlock style={{ width: '90%', height: 12, marginTop: 12 }} />
          <AdminSkeletonBlock style={{ width: '60%', height: 12, marginTop: 8 }} />
        </article>
      ))}
    </div>
  );
}
