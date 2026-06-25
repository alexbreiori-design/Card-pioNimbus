'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAdminOverlayClose } from '@/hooks/useAdminOverlayClose';
import { useAdminToast } from '@/context/AdminToastContext';
import { useAdminData } from '@/hooks/useAdminData';
import { MAX_STOPS_PER_ROUTE } from '@/lib/delivery/routeOptimization';

const STATUS_META = {
  em_preparo: {
    label: 'Em preparo',
    pin: '#8b5cf6',
    ring: 'rgba(139, 92, 246, 0.35)',
    selectable: true,
  },
  saiu_entrega: {
    label: 'Saiu para entrega',
    pin: '#5b21b6',
    ring: 'rgba(91, 33, 182, 0.35)',
    selectable: true,
  },
  concluido: {
    label: 'Concluídos',
    pin: '#94a3b8',
    ring: 'rgba(148, 163, 184, 0.35)',
    selectable: false,
  },
};

function createPinIcon(status, selected = false) {
  const meta = STATUS_META[status] || STATUS_META.em_preparo;
  const size = selected ? 34 : 28;
  const border = selected ? '3px solid #fff' : '2px solid #fff';
  const shadow = selected
    ? `0 0 0 4px ${meta.ring}, 0 8px 18px rgba(15, 23, 42, 0.28)`
    : '0 4px 12px rgba(15, 23, 42, 0.22)';

  return L.divIcon({
    className: 'delivery-route-pin',
    html: `<span style="
      display:block;
      width:${size}px;
      height:${size}px;
      border-radius:999px;
      background:${meta.pin};
      border:${border};
      box-shadow:${shadow};
    "></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function createStoreIcon() {
  return L.divIcon({
    className: 'delivery-route-store-pin',
    html: `<span style="
      display:flex;
      align-items:center;
      justify-content:center;
      width:36px;
      height:36px;
      border-radius:12px;
      background:#4e48dd;
      color:#fff;
      font-size:11px;
      font-weight:700;
      border:2px solid #fff;
      box-shadow:0 8px 20px rgba(78, 72, 221, 0.35);
    ">L</span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

export default function DeliveryRoutesModal({ open, onClose, onRoutesChanged }) {
  const { data } = useAdminData();
  const toast = useAdminToast();
  const slug = (data?.loja?.slug || '').toLowerCase();

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const storeMarkerRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [store, setStore] = useState(null);
  const [orders, setOrders] = useState([]);
  const [pendingGeocode, setPendingGeocode] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filters, setFilters] = useState({
    em_preparo: true,
    saiu_entrega: true,
    concluido: false,
  });

  useAdminOverlayClose(open, onClose);

  const loadMapData = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/delivery-routes?slug=${encodeURIComponent(slug)}`);
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Erro ao carregar mapa.');
      setStore(json.store);
      setOrders(json.orders || []);
      setPendingGeocode(json.pendingGeocode || []);
      if (json.geocodedCount > 0) {
        toast.success(`${json.geocodedCount} endereço(s) localizado(s) no mapa.`);
      }
    } catch (error) {
      toast.error(error?.message || 'Erro ao carregar rotas.');
    } finally {
      setLoading(false);
    }
  }, [slug, toast]);

  useEffect(() => {
    if (!open) return;
    setSelectedIds([]);
    void loadMapData();
  }, [open, loadMapData]);

  const visibleOrders = useMemo(
    () => orders.filter((order) => filters[order.status] && order.lat != null && order.lng != null),
    [orders, filters]
  );

  const selectableOrders = useMemo(
    () => visibleOrders.filter((order) => STATUS_META[order.status]?.selectable),
    [visibleOrders]
  );

  const toggleFilter = (key) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSelection = (dbId) => {
    setSelectedIds((prev) => {
      if (prev.includes(dbId)) return prev.filter((id) => id !== dbId);
      if (prev.length >= MAX_STOPS_PER_ROUTE) {
        toast.error(`Selecione no máximo ${MAX_STOPS_PER_ROUTE} pedidos por rota.`);
        return prev;
      }
      return [...prev, dbId];
    });
  };

  const initMap = useCallback(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const timer = window.setTimeout(() => {
      initMap();
      mapInstanceRef.current?.invalidateSize();
    }, 80);

    return () => window.clearTimeout(timer);
  }, [open, initMap]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!open || !map || !layer) return;

    layer.clearLayers();
    if (storeMarkerRef.current) {
      map.removeLayer(storeMarkerRef.current);
      storeMarkerRef.current = null;
    }

    visibleOrders.forEach((order) => {
      const selected = selectedIds.includes(order.dbId);
      const marker = L.marker([order.lat, order.lng], {
        icon: createPinIcon(order.status, selected),
      });
      marker.bindPopup(
        `<strong>#${order.codigo}</strong><br>${order.clienteNome}<br><span style="opacity:.75">${order.enderecoTexto || ''}</span>`
      );
      marker.on('click', () => {
        if (!STATUS_META[order.status]?.selectable) return;
        toggleSelection(order.dbId);
      });
      layer.addLayer(marker);
    });

    const points = [];
    if (store?.lat && store?.lng) {
      storeMarkerRef.current = L.marker([store.lat, store.lng], {
        icon: createStoreIcon(),
        zIndexOffset: 1000,
      })
        .bindPopup(`<strong>${store.label || 'Loja'}</strong>`)
        .addTo(map);
      points.push([store.lat, store.lng]);
    }

    visibleOrders.forEach((order) => points.push([order.lat, order.lng]));

    if (points.length === 1) {
      map.setView(points[0], 14);
    } else if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 15 });
    } else if (store?.lat && store?.lng) {
      map.setView([store.lat, store.lng], 13);
    }
  }, [open, visibleOrders, selectedIds, store]);

  useEffect(() => {
    if (open) return undefined;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
      storeMarkerRef.current = null;
    }
    return undefined;
  }, [open]);

  async function handleCreateRoute() {
    if (!selectedIds.length) {
      toast.error('Selecione ao menos um pedido no mapa.');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/delivery-routes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, pedidoDbIds: selectedIds }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Erro ao criar rota.');

      await navigator.clipboard.writeText(json.mapsUrl);
      toast.success(`${json.titulo} criada · link copiado.`);
      setSelectedIds([]);
      await loadMapData();
      onRoutesChanged?.();
    } catch (error) {
      toast.error(error?.message || 'Erro ao criar rota.');
    } finally {
      setCreating(false);
    }
  }

  if (!open) return null;

  return (
    <div className="admin-delivery-routes-overlay" onClick={onClose}>
      <div
        className="admin-delivery-routes-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-routes-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="admin-delivery-routes-header">
          <div>
            <h2 id="delivery-routes-title">Rotas de entrega</h2>
            <p>Monte rotas de até {MAX_STOPS_PER_ROUTE} pedidos e envie o link do Google Maps.</p>
          </div>
          <button type="button" className="admin-order-detail-close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </header>

        <div className="admin-delivery-routes-body">
          <aside className="admin-delivery-routes-panel">
            <div className="admin-delivery-routes-filters">
              {Object.entries(STATUS_META).map(([key, meta]) => (
                <button
                  key={key}
                  type="button"
                  className={`admin-delivery-routes-filter${filters[key] ? ' is-active' : ''}`}
                  onClick={() => toggleFilter(key)}
                >
                  <span className="admin-delivery-routes-filter-dot" style={{ background: meta.pin }} />
                  {meta.label}
                </button>
              ))}
            </div>

            <div className="admin-delivery-routes-legend">
              <span>Toque no mapa ou na lista para selecionar (máx. {MAX_STOPS_PER_ROUTE}).</span>
            </div>

            <div className="admin-delivery-routes-list">
              {loading ? (
                <p className="admin-delivery-routes-empty">Carregando pedidos…</p>
              ) : selectableOrders.length === 0 ? (
                <p className="admin-delivery-routes-empty">
                  Nenhum pedido delivery com localização nos filtros atuais.
                </p>
              ) : (
                selectableOrders.map((order) => {
                  const selected = selectedIds.includes(order.dbId);
                  return (
                    <button
                      key={order.dbId}
                      type="button"
                      className={`admin-delivery-routes-item${selected ? ' is-selected' : ''}`}
                      onClick={() => toggleSelection(order.dbId)}
                    >
                      <span
                        className="admin-delivery-routes-item-dot"
                        style={{ background: STATUS_META[order.status]?.pin }}
                      />
                      <span className="admin-delivery-routes-item-copy">
                        <strong>#{order.codigo} · {order.clienteNome}</strong>
                        <span>{order.enderecoTexto}</span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {pendingGeocode.length ? (
              <p className="admin-delivery-routes-note">
                {pendingGeocode.length} pedido(s) sem localização — confira o endereço ou tente recarregar.
              </p>
            ) : null}
          </aside>

          <div className="admin-delivery-routes-map-wrap">
            {!store?.lat ? (
              <div className="admin-delivery-routes-map-empty">
                <strong>Coordenadas da loja não configuradas</strong>
                <span>Salve o endereço em Minha loja ou recalcule em Entrega.</span>
              </div>
            ) : null}
            <div ref={mapRef} className="admin-delivery-routes-map" />
          </div>
        </div>

        <footer className="admin-delivery-routes-footer">
          <div className="admin-delivery-routes-footer-meta">
            <strong>{selectedIds.length}</strong> de {MAX_STOPS_PER_ROUTE} selecionados
          </div>
          <div className="admin-delivery-routes-footer-actions">
            <button type="button" className="admin-btn admin-btn-ghost" onClick={() => void loadMapData()}>
              Atualizar mapa
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              disabled={creating || !selectedIds.length}
              onClick={() => void handleCreateRoute()}
            >
              {creating ? 'Criando rota…' : 'Criar rota e copiar link'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
