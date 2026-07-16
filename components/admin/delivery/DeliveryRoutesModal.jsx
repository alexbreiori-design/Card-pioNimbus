'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAdminOverlayClose } from '@/hooks/useAdminOverlayClose';
import { useAdminToast } from '@/context/AdminToastContext';
import { useAdminData } from '@/hooks/useAdminData';
import { useEmpresa } from '@/hooks/useEmpresa';
import { restoreArchivedOrder } from '@/lib/orders/adminOrdersClient';
import { buildRouteShareMessage } from '@/lib/delivery/routeShareMessage';
import { MAX_STOPS_PER_ROUTE } from '@/lib/delivery/routeOptimization';

const TAB_META = {
  preparo: {
    label: 'Preparo',
    pin: '#8b5cf6',
    hint: 'Pedidos prontos para montar uma rota.',
  },
  em_rota: {
    label: 'Em rota',
    pin: '#5b21b6',
    hint: 'Rotas ativas com entregador e pedidos da carga.',
  },
  concluido: {
    label: 'Concluídos',
    pin: '#64748b',
    hint: 'Entregas recentes no mapa (ver ou restaurar).',
  },
};

const STORE_PURPLE = '#6d28d9';

function createPinIcon(status, selected = false) {
  const pin =
    status === 'concluido'
      ? TAB_META.concluido.pin
      : status === 'saiu_entrega'
        ? TAB_META.em_rota.pin
        : TAB_META.preparo.pin;
  const size = selected ? 38 : 32;
  const iconClass = status === 'concluido' ? 'ph-fill ph-map-pin' : 'ph-fill ph-map-pin-plus';

  return L.divIcon({
    className: `delivery-route-pin${selected ? ' is-selected' : ''}`,
    html: `<i class="${iconClass} delivery-route-pin-icon" style="font-size:${size}px;color:${pin};"></i>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function createStoreIcon() {
  const size = 34;
  return L.divIcon({
    className: 'delivery-route-store-pin',
    html: `<i class="ph-fill ph-house-line delivery-route-store-icon" style="font-size:${size}px;color:${STORE_PURPLE};"></i>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function formatRouteWhen(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function stopStatusLabel(stop) {
  if (stop.entregue || stop.status === 'concluido') return 'Entregue';
  if (stop.status === 'saiu_entrega') return 'A caminho';
  if (stop.status === 'em_preparo') return 'Preparo';
  return 'Pendente';
}

export default function DeliveryRoutesModal({ open, onClose, onRoutesChanged, onViewOrder }) {
  const { data } = useAdminData();
  const { empresa } = useEmpresa();
  const toast = useAdminToast();
  const slug = (data?.loja?.slug || '').toLowerCase();

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const storeMarkerRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [concludingId, setConcludingId] = useState('');
  const [releasingKey, setReleasingKey] = useState('');
  const [restoringId, setRestoringId] = useState('');
  const [store, setStore] = useState(null);
  const [orders, setOrders] = useState([]);
  const [pendingGeocode, setPendingGeocode] = useState([]);
  const [entregadores, setEntregadores] = useState([]);
  const [rotasAtivas, setRotasAtivas] = useState([]);
  const [selectedEntregadorId, setSelectedEntregadorId] = useState('');
  const [driverPickerOpen, setDriverPickerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [sideTab, setSideTab] = useState('preparo');
  const [expandedRouteId, setExpandedRouteId] = useState('');

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
      setEntregadores(json.entregadores || []);
      setRotasAtivas(json.rotasAtivas || []);
      setSelectedEntregadorId('');
      setDriverPickerOpen(false);
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
    setDriverPickerOpen(false);
    setSideTab('preparo');
    setExpandedRouteId('');
    void loadMapData();
  }, [open, loadMapData]);

  const routePedidoIds = useMemo(() => {
    const ids = new Set();
    rotasAtivas.forEach((rota) => {
      (rota.pedidoIds || []).forEach((id) => ids.add(id));
      (rota.stops || []).forEach((stop) => ids.add(stop.pedidoId));
    });
    return ids;
  }, [rotasAtivas]);

  const activeRotaIds = useMemo(() => new Set(rotasAtivas.map((rota) => rota.id)), [rotasAtivas]);

  const preparoOrders = useMemo(
    () =>
      orders.filter((order) => {
        if (order.lat == null || order.lng == null) return false;
        if (order.status !== 'em_preparo' && order.status !== 'saiu_entrega') return false;
        if (routePedidoIds.has(order.dbId)) return false;
        if (order.entregaRotaId && activeRotaIds.has(order.entregaRotaId)) return false;
        return true;
      }),
    [orders, routePedidoIds, activeRotaIds]
  );

  const emRotaMapOrders = useMemo(() => {
    const fromStops = [];
    rotasAtivas.forEach((rota) => {
      (rota.stops || []).forEach((stop) => {
        if (stop.lat == null || stop.lng == null) return;
        if (stop.entregue) return;
        fromStops.push({
          dbId: stop.pedidoId,
          codigo: stop.codigo,
          status: stop.status || 'saiu_entrega',
          clienteNome: stop.clienteNome,
          enderecoTexto: stop.enderecoTexto,
          lat: stop.lat,
          lng: stop.lng,
        });
      });
    });
    return fromStops;
  }, [rotasAtivas]);

  const concludedOrders = useMemo(
    () =>
      orders.filter(
        (order) => order.status === 'concluido' && order.lat != null && order.lng != null
      ),
    [orders]
  );

  const mapOrders = useMemo(() => {
    if (sideTab === 'preparo') return preparoOrders;
    if (sideTab === 'em_rota') return emRotaMapOrders;
    return concludedOrders;
  }, [sideTab, preparoOrders, emRotaMapOrders, concludedOrders]);

  const selectedEntregador = useMemo(
    () => entregadores.find((item) => item.id === selectedEntregadorId) || null,
    [entregadores, selectedEntregadorId]
  );

  const tabCounts = {
    preparo: preparoOrders.length,
    em_rota: rotasAtivas.length,
    concluido: concludedOrders.length,
  };

  const toggleSelection = useCallback(
    (dbId) => {
      if (sideTab !== 'preparo') return;
      setSelectedIds((prev) => {
        if (prev.includes(dbId)) return prev.filter((id) => id !== dbId);
        if (prev.length >= MAX_STOPS_PER_ROUTE) {
          toast.error(`Selecione no máximo ${MAX_STOPS_PER_ROUTE} pedidos por rota.`);
          return prev;
        }
        return [...prev, dbId];
      });
    },
    [toast, sideTab]
  );

  const initMap = useCallback(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
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

    mapOrders.forEach((order) => {
      const selected = selectedIds.includes(order.dbId);
      const marker = L.marker([order.lat, order.lng], {
        icon: createPinIcon(order.status, selected),
      });
      const canSelect = sideTab === 'preparo';
      marker.bindPopup(
        `<strong>#${order.codigo}</strong><br>${order.clienteNome}<br><span style="opacity:.8">${order.enderecoTexto || ''}</span>`
      );
      marker.on('click', () => {
        if (!canSelect) {
          marker.openPopup();
          return;
        }
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

    mapOrders.forEach((order) => points.push([order.lat, order.lng]));

    if (points.length === 1) {
      map.setView(points[0], 14);
    } else if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [56, 56], maxZoom: 15 });
    } else if (store?.lat && store?.lng) {
      map.setView([store.lat, store.lng], 13);
    }
  }, [open, mapOrders, selectedIds, store, toggleSelection, sideTab]);

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
      toast.error('Selecione ao menos um pedido em Preparo.');
      return;
    }
    if (!selectedEntregadorId) {
      toast.error('Selecione o entregador responsável pela rota.');
      setDriverPickerOpen(true);
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/delivery-routes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          pedidoDbIds: selectedIds,
          entregadorId: selectedEntregadorId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Erro ao criar rota.');

      await navigator.clipboard.writeText(
        buildRouteShareMessage(
          json.titulo,
          json.mapsUrl,
          json.entregador?.nome,
          json.driverUrl || ''
        )
      );
      toast.success(`${json.titulo} · ${json.entregador?.nome || 'rota'} · link copiado.`);
      setSelectedIds([]);
      setSelectedEntregadorId('');
      setDriverPickerOpen(false);
      setSideTab('em_rota');
      setExpandedRouteId(json.rotaId || json.id || '');
      await loadMapData();
      onRoutesChanged?.();
    } catch (error) {
      toast.error(error?.message || 'Erro ao criar rota.');
    } finally {
      setCreating(false);
    }
  }

  async function handleConcludeRoute(rotaId) {
    setConcludingId(rotaId);
    try {
      const res = await fetch('/api/admin/delivery-routes/conclude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, rotaId }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Erro ao concluir rota.');
      toast.success('Rota encerrada. Pedidos restantes foram para Concluídos.');
      await loadMapData();
      onRoutesChanged?.();
    } catch (error) {
      toast.error(error?.message || 'Erro ao concluir rota.');
    } finally {
      setConcludingId('');
    }
  }

  async function handleRelease({ rotaId, pedidoId } = {}) {
    if (!rotaId || !pedidoId) {
      toast.error('Selecione um pedido para devolver ao preparo.');
      return;
    }
    const key = `${rotaId}:${pedidoId}`;
    setReleasingKey(key);
    try {
      const res = await fetch('/api/admin/delivery-routes/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, rotaId, pedidoId }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Erro ao devolver ao preparo.');
      toast.success('Pedido devolvido ao Preparo. Pode atribuir a outro entregador.');
      setSelectedEntregadorId('');
      setDriverPickerOpen(false);
      if (json.rotaClosed) setSideTab('preparo');
      await loadMapData();
      onRoutesChanged?.();
    } catch (error) {
      toast.error(error?.message || 'Erro ao devolver ao preparo.');
    } finally {
      setReleasingKey('');
    }
  }

  async function handleRestoreOrder(order) {
    if (!empresa?.id || !order?.dbId) return;
    setRestoringId(order.dbId);
    try {
      await restoreArchivedOrder({ empresaId: empresa.id, dbId: order.dbId, codigo: order.codigo });
      toast.success(`Pedido #${order.codigo} restaurado em Preparo.`);
      setSideTab('preparo');
      await loadMapData();
      onRoutesChanged?.();
    } catch (error) {
      toast.error(error?.message || 'Erro ao restaurar pedido.');
    } finally {
      setRestoringId('');
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
            <p>
              Monte a carga em Preparo, acompanhe Em rota por entregador e use Concluídos só para
              consulta no mapa.
            </p>
          </div>
          <button type="button" className="admin-order-detail-close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </header>

        <div className="admin-delivery-routes-body">
          <aside className="admin-delivery-routes-panel">
            <div className="admin-delivery-routes-tabs" role="tablist">
              {Object.entries(TAB_META).map(([key, meta]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={sideTab === key}
                  className={`admin-delivery-routes-tab${sideTab === key ? ' is-active' : ''}`}
                  onClick={() => {
                    setSideTab(key);
                    if (key !== 'preparo') {
                      setSelectedIds([]);
                      setDriverPickerOpen(false);
                    }
                  }}
                >
                  <span
                    className="admin-delivery-routes-tab-dot"
                    style={{ background: meta.pin }}
                    aria-hidden="true"
                  />
                  {meta.label}
                  <em>{tabCounts[key]}</em>
                </button>
              ))}
            </div>

            <p className="admin-delivery-routes-legend">{TAB_META[sideTab].hint}</p>

            {sideTab === 'preparo' ? (
              <div className="admin-delivery-routes-list">
                {loading ? (
                  <p className="admin-delivery-routes-empty">Carregando pedidos…</p>
                ) : preparoOrders.length === 0 ? (
                  <p className="admin-delivery-routes-empty">
                    Nenhum pedido em preparo com localização. Quando criar a rota, eles passam para
                    Em rota.
                  </p>
                ) : (
                  preparoOrders.map((order) => {
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
                          style={{ background: TAB_META.preparo.pin }}
                        />
                        <span className="admin-delivery-routes-item-copy">
                          <strong>
                            #{order.codigo} · {order.clienteNome}
                          </strong>
                          {order.clienteTelefone ? <span>{order.clienteTelefone}</span> : null}
                          <span>{order.enderecoTexto}</span>
                          {selected ? (
                            <span className="admin-delivery-routes-item-meta">Selecionado</span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            ) : null}

            {sideTab === 'em_rota' ? (
              <div className="admin-delivery-routes-list">
                {loading ? (
                  <p className="admin-delivery-routes-empty">Carregando rotas…</p>
                ) : rotasAtivas.length === 0 ? (
                  <p className="admin-delivery-routes-empty">
                    Nenhuma rota ativa. Selecione pedidos em Preparo, escolha o entregador e copie o
                    link.
                  </p>
                ) : (
                  rotasAtivas.map((rota) => {
                    const expanded = expandedRouteId === rota.id || rotasAtivas.length === 1;
                    return (
                      <div key={rota.id} className="admin-delivery-routes-active-card">
                        <button
                          type="button"
                          className="admin-delivery-routes-active-card-toggle"
                          onClick={() =>
                            setExpandedRouteId((prev) => (prev === rota.id ? '' : rota.id))
                          }
                        >
                          <span className="admin-delivery-routes-active-card-head">
                            <strong>{rota.entregadorNome || 'Sem entregador'}</strong>
                            <span>
                              {rota.pendingCount ?? rota.pedidoCount} pendente
                              {(rota.pendingCount ?? rota.pedidoCount) === 1 ? '' : 's'}
                              {' · '}
                              {rota.pedidoCount} no total · {formatRouteWhen(rota.createdAt)}
                            </span>
                          </span>
                          <i
                            className={`ph ${expanded ? 'ph-caret-up' : 'ph-caret-down'}`}
                            aria-hidden="true"
                          />
                        </button>

                        {expanded ? (
                          <>
                            <ul className="admin-delivery-routes-stops">
                              {(rota.stops || []).map((stop) => (
                                <li
                                  key={stop.pedidoId}
                                  className={`admin-delivery-routes-stop${
                                    stop.entregue ? ' is-done' : ''
                                  }`}
                                >
                                  <div>
                                    <strong>
                                      #{stop.codigo} · {stop.clienteNome}
                                    </strong>
                                    {stop.clienteTelefone ? <span>{stop.clienteTelefone}</span> : null}
                                    <span>{stop.enderecoTexto || 'Sem endereço'}</span>
                                    {!stop.entregue ? (
                                      <button
                                        type="button"
                                        className="admin-link-btn admin-delivery-routes-stop-release"
                                        disabled={releasingKey === `${rota.id}:${stop.pedidoId}`}
                                        onClick={() =>
                                          void handleRelease({
                                            rotaId: rota.id,
                                            pedidoId: stop.pedidoId,
                                          })
                                        }
                                      >
                                        {releasingKey === `${rota.id}:${stop.pedidoId}`
                                          ? '…'
                                          : 'Devolver ao preparo'}
                                      </button>
                                    ) : null}
                                  </div>
                                  <em>{stopStatusLabel(stop)}</em>
                                </li>
                              ))}
                            </ul>

                            <div className="admin-delivery-routes-active-actions">
                              {rota.driverUrl ? (
                                <button
                                  type="button"
                                  className="admin-link-btn"
                                  onClick={() => {
                                    void navigator.clipboard.writeText(
                                      buildRouteShareMessage(
                                        rota.titulo,
                                        rota.mapsUrl,
                                        rota.entregadorNome,
                                        rota.driverUrl
                                      )
                                    );
                                    toast.success('Link do entregador copiado.');
                                  }}
                                >
                                  Link
                                </button>
                              ) : null}
                              {rota.mapsUrl ? (
                                <a
                                  href={rota.mapsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="admin-link-btn"
                                >
                                  Maps
                                </a>
                              ) : null}
                              <button
                                type="button"
                                className="admin-link-btn"
                                disabled={concludingId === rota.id}
                                onClick={() => void handleConcludeRoute(rota.id)}
                              >
                                {concludingId === rota.id ? '…' : 'Encerrar rota'}
                              </button>
                            </div>
                          </>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            ) : null}

            {sideTab === 'concluido' ? (
              <div className="admin-delivery-routes-list">
                {loading ? (
                  <p className="admin-delivery-routes-empty">Carregando…</p>
                ) : concludedOrders.length === 0 ? (
                  <p className="admin-delivery-routes-empty">
                    Nenhum delivery concluído recente com localização.
                  </p>
                ) : (
                  concludedOrders.map((order) => (
                    <div key={order.dbId} className="admin-delivery-routes-item is-readonly">
                      <span
                        className="admin-delivery-routes-item-dot"
                        style={{ background: TAB_META.concluido.pin }}
                      />
                      <span className="admin-delivery-routes-item-copy">
                        <strong>
                          #{order.codigo} · {order.clienteNome}
                        </strong>
                        {order.clienteTelefone ? <span>{order.clienteTelefone}</span> : null}
                        <span>{order.enderecoTexto}</span>
                        <span className="admin-delivery-routes-item-actions">
                          <button
                            type="button"
                            className="admin-link-btn"
                            onClick={() => onViewOrder?.(order)}
                          >
                            Ver
                          </button>
                          <button
                            type="button"
                            className="admin-link-btn"
                            disabled={restoringId === order.dbId}
                            onClick={() => void handleRestoreOrder(order)}
                          >
                            {restoringId === order.dbId ? '…' : 'Restaurar'}
                          </button>
                        </span>
                      </span>
                    </div>
                  ))
                )}
              </div>
            ) : null}

            {pendingGeocode.length && sideTab === 'preparo' ? (
              <p className="admin-delivery-routes-note">
                {pendingGeocode.length} pedido(s) sem localização — confira o endereço ou atualize o
                mapa.
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
            {sideTab === 'preparo' ? (
              <>
                <strong>{selectedIds.length}</strong> de {MAX_STOPS_PER_ROUTE} selecionados
                {selectedEntregador ? (
                  <span className="admin-delivery-routes-footer-driver">
                    · {selectedEntregador.nome}
                  </span>
                ) : null}
              </>
            ) : sideTab === 'em_rota' ? (
              <span>
                {rotasAtivas.length} rota{rotasAtivas.length === 1 ? '' : 's'} ativa
                {rotasAtivas.length === 1 ? '' : 's'}
              </span>
            ) : (
              <span>
                {concludedOrders.length} no mapa · use Ver concluídos no kanban para o histórico
                completo
              </span>
            )}
          </div>

          <div className="admin-delivery-routes-footer-stack">
            {sideTab === 'preparo' && driverPickerOpen ? (
              <div className="admin-delivery-routes-driver-picker">
                {!entregadores.length ? (
                  <p className="admin-help-text">
                    Cadastre entregadores em <strong>Entrega</strong> antes de criar a rota.
                  </p>
                ) : (
                  <ul className="admin-delivery-routes-driver-list">
                    {entregadores.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className={`admin-delivery-routes-driver-option${
                            selectedEntregadorId === item.id ? ' is-selected' : ''
                          }`}
                          onClick={() => setSelectedEntregadorId(item.id)}
                        >
                          <span>{item.nome}</span>
                          {item.telefone ? <em>{item.telefone}</em> : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

            <div className="admin-delivery-routes-footer-actions">
              <button type="button" className="admin-btn admin-btn-ghost" onClick={() => void loadMapData()}>
                Atualizar
              </button>
              {sideTab === 'preparo' ? (
                <>
                  <button
                    type="button"
                    className={`admin-btn${driverPickerOpen ? ' admin-btn-ghost' : ' admin-btn-primary'}`}
                    disabled={!selectedIds.length || !entregadores.length}
                    onClick={() => setDriverPickerOpen((openPicker) => !openPicker)}
                  >
                    {driverPickerOpen ? 'Fechar entregadores' : 'Selecionar entregador'}
                  </button>
                  {selectedEntregadorId ? (
                    <button
                      type="button"
                      className="admin-btn admin-btn-primary"
                      disabled={creating || !selectedIds.length}
                      onClick={() => void handleCreateRoute()}
                    >
                      {creating ? 'Criando rota…' : 'Criar rota e copiar link'}
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
