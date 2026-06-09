'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminToast } from '@/context/AdminToastContext';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminIcon from '@/components/admin/AdminIcon';
import { getSegmentoLabel } from '@/lib/empresaSegmentos';
import { activityStatusLabel } from '@/lib/superAdmin/storeActivity';
import CreateStoreModal from './CreateStoreModal';
import CreateStoreSuccess from './CreateStoreSuccess';
import StoreDetailDrawer from './StoreDetailDrawer';

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('pt-BR');
  } catch {
    return '—';
  }
}

function StoreAvatar({ nome, logoUrl, large = false }) {
  const initial = String(nome || 'L').trim().charAt(0).toUpperCase() || 'L';
  const className = `admin-sistema-store-avatar${large ? ' is-large' : ''}${logoUrl ? '' : ' is-fallback'}`;
  if (logoUrl) {
    return (
      <div className={className}>
        <img src={logoUrl} alt="" />
      </div>
    );
  }
  return <div className={className}>{initial}</div>;
}

export default function StoresPanel({ initialSelectedSlug = null, onSelectedSlugChange }) {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [successResult, setSuccessResult] = useState(null);
  const [selectedSlug, setSelectedSlug] = useState(initialSelectedSlug);

  useEffect(() => {
    setSelectedSlug(initialSelectedSlug);
  }, [initialSelectedSlug]);

  const loadStores = useCallback(async (searchQuery = '', { silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams();
      const needle = String(searchQuery || '').trim();
      if (needle) params.set('q', needle);
      const suffix = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`/api/super-admin/stores${suffix}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível carregar as lojas.');
      }
      setStores(payload.stores || []);
    } catch (loadError) {
      if (!silent) {
        toast.error(loadError?.message || 'Erro ao carregar lojas.');
        setStores([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadStores(query);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [loadStores, query]);

  useEffect(() => {
    const interval = window.setInterval(() => loadStores(query, { silent: true }), 15_000);
    return () => window.clearInterval(interval);
  }, [loadStores, query]);

  function openStore(slug) {
    setSelectedSlug(slug);
    onSelectedSlugChange?.(slug);
  }

  function closeDrawer() {
    setSelectedSlug(null);
    onSelectedSlugChange?.(null);
  }

  function handleCreated(payload) {
    setSuccessResult(payload);
    loadStores(query);
  }

  const clientCount = stores.filter((store) => !store.isModel).length;

  return (
    <div className="admin-content admin-sistema-page">
      <AdminPageHeader
        title="Lojas"
        icon="category"
        actions={
          <button type="button" className="admin-btn admin-btn-primary" onClick={() => setModalOpen(true)}>
            <AdminIcon name="plus" />
            Nova loja
          </button>
        }
      />

      <div className="admin-sistema-stores-shell">
        <p className="admin-sistema-intro">
          {clientCount} loja(s) cliente{clientCount === 1 ? '' : 's'} — clique para abrir detalhes, métricas e
          ações.
        </p>

        <div className="admin-card admin-store-block-card admin-sistema-panel-card">
          <div className="admin-sistema-toolbar">
            <label className="admin-sistema-search-wrap">
              <AdminIcon name="search" />
              <input
                type="search"
                className="admin-sistema-search"
                placeholder="Buscar slug, nome, cidade, e-mail do dono..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          </div>

          {loading ? <p className="admin-sistema-muted">Carregando lojas...</p> : null}

          {!loading && !stores.length ? (
            <p className="admin-sistema-muted">Nenhuma loja encontrada.</p>
          ) : null}

          <ul className="admin-sistema-store-list-rich">
            {stores.map((store) => {
              const segmentLabel = getSegmentoLabel(store.segmento);
              return (
                <li key={store.id}>
                  <button
                    type="button"
                    className={`admin-sistema-store-row-rich admin-sistema-store-btn${
                      selectedSlug === store.slug ? ' is-selected' : ''
                    }${store.isModel ? ' is-model' : ''}`}
                    onClick={() => openStore(store.slug)}
                  >
                    <StoreAvatar nome={store.nome} logoUrl={store.logoUrl} large />
                    <div className="admin-sistema-store-main">
                      <div className="admin-sistema-store-headline">
                        <h3 className="admin-sistema-store-name">{store.nome}</h3>
                        <div className="admin-sistema-store-badges">
                          <span className="admin-sistema-store-slug">/{store.slug}</span>
                          <span className={`admin-store-pill ${store.aberta ? 'open' : 'closed'}`}>
                            {store.aberta ? 'Aberta' : 'Fechada'}
                          </span>
                          {store.suspensa ? (
                            <span className="admin-sistema-suspended-pill">Suspensa</span>
                          ) : null}
                          {store.isModel ? (
                            <span className="admin-sistema-model-pill">Loja modelo</span>
                          ) : (
                            <span className={`admin-sistema-activity-pill is-${store.activityStatus}`}>
                              {activityStatusLabel(store.activityStatus)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="admin-sistema-store-facts">
                        {segmentLabel ? (
                          <span className="admin-sistema-store-fact is-segment">{segmentLabel}</span>
                        ) : null}
                        {store.endereco_cidade ? (
                          <span className="admin-sistema-store-fact is-city">{store.endereco_cidade}</span>
                        ) : null}
                        <span className="admin-sistema-store-fact is-members">
                          {store.memberCount} membro{store.memberCount === 1 ? '' : 's'}
                        </span>
                        <span className="admin-sistema-store-fact is-created">
                          Criada em {formatDate(store.created_at)}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <CreateStoreModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={handleCreated} />
      <CreateStoreSuccess result={successResult} onClose={() => setSuccessResult(null)} />
      <StoreDetailDrawer slug={selectedSlug} onClose={closeDrawer} />
    </div>
  );
}
