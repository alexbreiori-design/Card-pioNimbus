'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAdminOverlayClose } from '@/hooks/useAdminOverlayClose';

const CIRCLE_COLOR = '#4e48dd';
const EXCLUSION_COLOR = '#dc2626';
const RAIO_MIN = 0.5;
const RAIO_MAX = 40;
const RAIO_STEP = 0.5;
const DEFAULT_RAIO = 3;
const MAX_EXCLUSIONS = 20;

const EXCLUSION_PATH = {
  color: EXCLUSION_COLOR,
  weight: 2,
  fillColor: EXCLUSION_COLOR,
  fillOpacity: 0.18,
  dashArray: '6 5',
};

const EXCLUSION_PATH_SELECTED = {
  color: EXCLUSION_COLOR,
  weight: 3,
  fillColor: EXCLUSION_COLOR,
  fillOpacity: 0.28,
  dashArray: '',
};

function createStoreIcon() {
  const width = 22;
  const height = 20;
  return L.divIcon({
    className: 'delivery-route-store-pin',
    html: `<img src="/icons/store-pin.svg" alt="" class="delivery-route-store-icon" width="${width}" height="${height}" draggable="false" />`,
    iconSize: [width, height],
    iconAnchor: [width / 2, height / 2],
  });
}

function parseRaio(value) {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampRaio(km) {
  if (!Number.isFinite(km) || km <= 0) return RAIO_MIN;
  return Math.min(RAIO_MAX, Math.max(RAIO_MIN, km));
}

function snapRaio(km) {
  const clamped = clampRaio(km);
  return Math.round(clamped / RAIO_STEP) * RAIO_STEP;
}

function boundsForRadiusKm(lat, lng, km) {
  const radius = clampRaio(km);
  const dLat = radius / 111;
  const cos = Math.cos((lat * Math.PI) / 180);
  const dLng = radius / (111 * Math.max(0.2, Math.abs(cos)));
  return L.latLngBounds([lat - dLat, lng - dLng], [lat + dLat, lng + dLng]);
}

function zoomForRadiusKm(km) {
  const radius = clampRaio(km);
  if (radius >= 30) return 9;
  if (radius >= 15) return 10;
  if (radius >= 8) return 11;
  if (radius >= 4) return 12;
  if (radius >= 2) return 13;
  return 14;
}

function formatRaioInput(km) {
  if (!Number.isFinite(km) || km <= 0) return '';
  return String(Number(km.toFixed(2))).replace('.', ',');
}

function moneyToInput(value) {
  if (value === undefined || value === null || value === '') return '';
  return String(value).replace('.', ',');
}

function inputToMoney(value) {
  const parsed = Number(
    String(value || '')
      .replace(/[^\d,.-]/g, '')
      .replace(/\./g, '')
      .replace(',', '.')
  );
  return Number.isFinite(parsed) ? parsed : 0;
}

function makeTempId() {
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function boundsToPayload(bounds) {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  return {
    sul: Number(sw.lat.toFixed(7)),
    oeste: Number(sw.lng.toFixed(7)),
    norte: Number(ne.lat.toFixed(7)),
    leste: Number(ne.lng.toFixed(7)),
  };
}

function payloadToLatLngBounds(item) {
  return L.latLngBounds(
    [Number(item.sul), Number(item.oeste)],
    [Number(item.norte), Number(item.leste)]
  );
}

function normalizeExclusionRows(rows) {
  return (rows || []).map((row, index) => ({
    id: row.id,
    nome: row.nome || `Exclusão ${index + 1}`,
    sul: Number(row.sul),
    oeste: Number(row.oeste),
    norte: Number(row.norte),
    leste: Number(row.leste),
    ativo: row.ativo !== false,
  }));
}

/**
 * Modal de criar/editar área de entrega com mapa, raio e exclusões.
 */
export default function DeliveryZoneModal({
  open,
  onClose,
  onSave,
  initialDraft = null,
  initialExclusions = [],
  editing = false,
  storeLat = null,
  storeLng = null,
  storeLabel = 'Loja',
  saving = false,
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const circleRef = useRef(null);
  const storeMarkerRef = useRef(null);
  const exclusionsLayerRef = useRef(null);
  const rectangleByIdRef = useRef(new Map());
  const handlesLayerRef = useRef(null);
  const drawStateRef = useRef({ start: null, preview: null });
  const ignoreNextMapClickRef = useRef(false);
  const exclusionsRef = useRef([]);
  const selectedExclusionIdRef = useRef(null);
  const exclusionModeRef = useRef(false);

  const [nome, setNome] = useState('');
  const [raioKm, setRaioKm] = useState(DEFAULT_RAIO);
  const [raioInput, setRaioInput] = useState(formatRaioInput(DEFAULT_RAIO));
  const [taxaEntrega, setTaxaEntrega] = useState('');
  const [error, setError] = useState('');
  const [exclusionMode, setExclusionMode] = useState(false);
  const [exclusions, setExclusions] = useState([]);
  const [selectedExclusionId, setSelectedExclusionId] = useState(null);

  exclusionsRef.current = exclusions;
  selectedExclusionIdRef.current = selectedExclusionId;
  exclusionModeRef.current = exclusionMode;

  const hasStoreCoords = useMemo(() => {
    const lat = Number(storeLat);
    const lng = Number(storeLng);
    return Number.isFinite(lat) && Number.isFinite(lng);
  }, [storeLat, storeLng]);

  const storePoint = useMemo(() => {
    if (!hasStoreCoords) return null;
    return { lat: Number(storeLat), lng: Number(storeLng) };
  }, [hasStoreCoords, storeLat, storeLng]);

  const { overlayPointerDown, overlayClick, requestClose } = useAdminOverlayClose({
    onClose,
    isDirty: false,
  });

  const clearHandles = useCallback(() => {
    if (handlesLayerRef.current) {
      handlesLayerRef.current.clearLayers();
    }
  }, []);

  const attachHandles = useCallback(
    (exclusionId) => {
      const map = mapInstanceRef.current;
      const rect = rectangleByIdRef.current.get(exclusionId);
      if (!map || !rect || !handlesLayerRef.current) return;
      clearHandles();

      const bounds = rect.getBounds();
      const corners = [
        bounds.getNorthWest(),
        bounds.getNorthEast(),
        bounds.getSouthEast(),
        bounds.getSouthWest(),
      ];

      corners.forEach((latlng, cornerIndex) => {
        const handle = L.marker(latlng, {
          draggable: true,
          zIndexOffset: 1200,
          icon: L.divIcon({
            className: 'admin-delivery-exclusion-handle',
            iconSize: [12, 12],
            iconAnchor: [6, 6],
          }),
        });

        handle.on('drag', (event) => {
          const current = rect.getBounds();
          let south = current.getSouth();
          let west = current.getWest();
          let north = current.getNorth();
          let east = current.getEast();
          const { lat, lng } = event.latlng;

          if (cornerIndex === 0) {
            north = lat;
            west = lng;
          } else if (cornerIndex === 1) {
            north = lat;
            east = lng;
          } else if (cornerIndex === 2) {
            south = lat;
            east = lng;
          } else {
            south = lat;
            west = lng;
          }

          const nextBounds = L.latLngBounds(
            [Math.min(south, north), Math.min(west, east)],
            [Math.max(south, north), Math.max(west, east)]
          );
          if (!nextBounds.isValid()) return;
          if (nextBounds.getNorth() - nextBounds.getSouth() < 0.00008) return;
          if (nextBounds.getEast() - nextBounds.getWest() < 0.00008) return;

          rect.setBounds(nextBounds);
          const nextCorners = [
            nextBounds.getNorthWest(),
            nextBounds.getNorthEast(),
            nextBounds.getSouthEast(),
            nextBounds.getSouthWest(),
          ];
          handlesLayerRef.current?.eachLayer((layer) => {
            const index = layer._exclusionCornerIndex;
            if (typeof index === 'number' && index !== cornerIndex && nextCorners[index]) {
              layer.setLatLng(nextCorners[index]);
            }
          });
        });

        handle.on('dragend', () => {
          ignoreNextMapClickRef.current = true;
          const payload = boundsToPayload(rect.getBounds());
          setExclusions((prev) =>
            prev.map((item) => (item.id === exclusionId ? { ...item, ...payload } : item))
          );
          attachHandles(exclusionId);
        });

        handle._exclusionCornerIndex = cornerIndex;

        handlesLayerRef.current.addLayer(handle);
      });
    },
    [clearHandles]
  );

  const syncExclusionLayers = useCallback(() => {
    const map = mapInstanceRef.current;
    const layer = exclusionsLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    rectangleByIdRef.current.clear();
    clearHandles();

    exclusionsRef.current.forEach((item) => {
      const rect = L.rectangle(payloadToLatLngBounds(item), {
        ...(item.id === selectedExclusionIdRef.current ? EXCLUSION_PATH_SELECTED : EXCLUSION_PATH),
        interactive: true,
      });
      rect.on('click', (event) => {
        L.DomEvent.stopPropagation(event);
        setSelectedExclusionId(item.id);
        if (!exclusionModeRef.current) {
          setExclusionMode(true);
        }
      });
      rect.on('mousedown', (event) => {
        L.DomEvent.stopPropagation(event);
      });
      layer.addLayer(rect);
      rectangleByIdRef.current.set(item.id, rect);
    });

    if (selectedExclusionIdRef.current && rectangleByIdRef.current.has(selectedExclusionIdRef.current)) {
      attachHandles(selectedExclusionIdRef.current);
    }
  }, [attachHandles, clearHandles]);

  useEffect(() => {
    if (!open) return;
    const draftRaio = parseRaio(initialDraft?.raio_km);
    const nextRaio = draftRaio > 0 ? clampRaio(draftRaio) : DEFAULT_RAIO;
    setNome(initialDraft?.nome || '');
    setRaioKm(nextRaio);
    setRaioInput(formatRaioInput(nextRaio));
    setTaxaEntrega(moneyToInput(initialDraft?.taxa_entrega ?? ''));
    setExclusions(normalizeExclusionRows(initialExclusions));
    setSelectedExclusionId(null);
    setExclusionMode(false);
    setError('');
  }, [open, initialDraft, initialExclusions]);

  useEffect(() => {
    if (!open || !mapInstanceRef.current) return;
    syncExclusionLayers();
  }, [open, exclusions, selectedExclusionId, syncExclusionLayers]);

  const syncCircle = useCallback(
    (km, { fit = false } = {}) => {
      const map = mapInstanceRef.current;
      const circle = circleRef.current;
      if (!map || !circle || !storePoint) return;
      const safeKm = clampRaio(km);
      circle.setLatLng([storePoint.lat, storePoint.lng]);
      circle.setRadius(safeKm * 1000);
      if (fit) {
        map.invalidateSize();
        map.fitBounds(boundsForRadiusKm(storePoint.lat, storePoint.lng, safeKm), {
          padding: [48, 48],
          maxZoom: 15,
        });
      }
    },
    [storePoint]
  );

  const destroyMap = useCallback(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    circleRef.current = null;
    storeMarkerRef.current = null;
    exclusionsLayerRef.current = null;
    handlesLayerRef.current = null;
    rectangleByIdRef.current.clear();
    drawStateRef.current = { start: null, preview: null };
  }, []);

  const initMap = useCallback(() => {
    if (!mapRef.current || mapInstanceRef.current || !storePoint) return;

    const initialKm = clampRaio(parseRaio(initialDraft?.raio_km) || DEFAULT_RAIO);

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    map.setView([storePoint.lat, storePoint.lng], zoomForRadiusKm(initialKm));
    mapInstanceRef.current = map;

    exclusionsLayerRef.current = L.layerGroup().addTo(map);
    handlesLayerRef.current = L.layerGroup().addTo(map);

    storeMarkerRef.current = L.marker([storePoint.lat, storePoint.lng], {
      icon: createStoreIcon(),
      zIndexOffset: 1000,
    })
      .bindPopup(`<strong>${storeLabel || 'Loja'}</strong>`)
      .addTo(map);

    circleRef.current = L.circle([storePoint.lat, storePoint.lng], {
      radius: initialKm * 1000,
      color: CIRCLE_COLOR,
      weight: 2,
      fillColor: CIRCLE_COLOR,
      fillOpacity: 0.14,
      interactive: false,
    }).addTo(map);

    const onMouseDown = (event) => {
      if (!exclusionModeRef.current) return;
      if (event.originalEvent?.target?.closest?.('.admin-delivery-exclusion-handle')) return;
      L.DomEvent.preventDefault(event);
      drawStateRef.current.start = event.latlng;
      if (drawStateRef.current.preview) {
        map.removeLayer(drawStateRef.current.preview);
      }
      drawStateRef.current.preview = L.rectangle(L.latLngBounds(event.latlng, event.latlng), {
        ...EXCLUSION_PATH,
        dashArray: '4 4',
      }).addTo(map);
    };

    const onMouseMove = (event) => {
      const { start, preview } = drawStateRef.current;
      if (!start || !preview) return;
      preview.setBounds(L.latLngBounds(start, event.latlng));
    };

    const onMouseUp = (event) => {
      const { start, preview } = drawStateRef.current;
      if (!start || !preview) return;
      const bounds = L.latLngBounds(start, event.latlng);
      map.removeLayer(preview);
      drawStateRef.current = { start: null, preview: null };

      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const tooSmall =
        Math.abs(ne.lat - sw.lat) < 0.00015 && Math.abs(ne.lng - sw.lng) < 0.00015;
      if (tooSmall) return;

      if (exclusionsRef.current.length >= MAX_EXCLUSIONS) {
        setError(`Limite de ${MAX_EXCLUSIONS} exclusões por loja.`);
        return;
      }

      const id = makeTempId();
      const payload = boundsToPayload(bounds);
      const nextItem = {
        id,
        nome: `Exclusão ${exclusionsRef.current.length + 1}`,
        ...payload,
        ativo: true,
      };
      setExclusions((prev) => [...prev, nextItem]);
      setSelectedExclusionId(id);
      setError('');
      ignoreNextMapClickRef.current = true;
    };

    map.on('mousedown', onMouseDown);
    map.on('mousemove', onMouseMove);
    map.on('mouseup', onMouseUp);
    map.on('click', () => {
      if (ignoreNextMapClickRef.current) {
        ignoreNextMapClickRef.current = false;
        return;
      }
      if (drawStateRef.current.start || drawStateRef.current.preview) return;
      setSelectedExclusionId(null);
    });

    const fitToRadius = () => {
      if (!mapInstanceRef.current || mapInstanceRef.current !== map) return;
      map.invalidateSize();
      map.fitBounds(boundsForRadiusKm(storePoint.lat, storePoint.lng, initialKm), {
        padding: [48, 48],
        maxZoom: 15,
      });
    };

    requestAnimationFrame(() => {
      fitToRadius();
      window.setTimeout(() => {
        fitToRadius();
        syncExclusionLayers();
      }, 120);
    });
  }, [storePoint, storeLabel, initialDraft?.raio_km, syncExclusionLayers]);

  useEffect(() => {
    if (!open) {
      destroyMap();
      return undefined;
    }
    if (!storePoint) return undefined;

    const timer = window.setTimeout(() => {
      initMap();
    }, 80);

    return () => {
      window.clearTimeout(timer);
      destroyMap();
    };
  }, [open, storePoint, initMap, destroyMap]);

  useEffect(() => {
    if (!open || !mapInstanceRef.current) return;
    syncCircle(raioKm, { fit: false });
  }, [open, raioKm, syncCircle]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const container = map.getContainer();
    if (exclusionMode) {
      map.dragging.disable();
      container.classList.add('is-exclusion-draw');
    } else {
      map.dragging.enable();
      container.classList.remove('is-exclusion-draw');
      drawStateRef.current = { start: null, preview: null };
    }
  }, [exclusionMode, open]);

  function handleRaioInputChange(event) {
    const raw = event.target.value;
    setRaioInput(raw);
    const parsed = parseRaio(raw);
    if (parsed > 0) {
      setRaioKm(clampRaio(parsed));
    }
  }

  function handleRaioInputBlur() {
    const parsed = parseRaio(raioInput);
    const next = parsed > 0 ? clampRaio(parsed) : raioKm;
    setRaioKm(next);
    setRaioInput(formatRaioInput(next));
    syncCircle(next, { fit: true });
  }

  function handleSliderChange(event) {
    const next = snapRaio(Number(event.target.value));
    setRaioKm(next);
    setRaioInput(formatRaioInput(next));
  }

  function handleSliderCommit(event) {
    const next = snapRaio(Number(event.currentTarget.value));
    setRaioKm(next);
    setRaioInput(formatRaioInput(next));
    syncCircle(next, { fit: true });
  }

  function nudgeRaio(delta) {
    const next = snapRaio(clampRaio(raioKm) + delta);
    setRaioKm(next);
    setRaioInput(formatRaioInput(next));
    syncCircle(next, { fit: true });
  }

  function focusExclusion(item) {
    const map = mapInstanceRef.current;
    if (!map) return;
    setSelectedExclusionId(item.id);
    setExclusionMode(true);
    map.fitBounds(payloadToLatLngBounds(item), { padding: [40, 40], maxZoom: 16 });
  }

  function renameExclusion(id, nomeValue) {
    setExclusions((prev) => prev.map((item) => (item.id === id ? { ...item, nome: nomeValue } : item)));
  }

  function removeExclusion(id) {
    setExclusions((prev) => prev.filter((item) => item.id !== id));
    if (selectedExclusionId === id) setSelectedExclusionId(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nomeTrim = nome.trim();
    const raio = parseRaio(raioInput) > 0 ? clampRaio(parseRaio(raioInput)) : raioKm;
    if (!nomeTrim || raio <= 0) {
      setError('Informe nome e raio (km) válidos.');
      return;
    }
    if (!hasStoreCoords) {
      setError(
        'A loja ainda não tem coordenadas. Use “Endereço da loja” no menu de Entrega para recalcular.'
      );
      return;
    }
    setError('');
    await onSave?.({
      nome: nomeTrim,
      raio_km: raio,
      taxa_entrega: inputToMoney(taxaEntrega),
      exclusoes: exclusions,
    });
  }

  if (!open) return null;

  return (
    <div
      className="admin-delivery-zone-overlay"
      onPointerDown={overlayPointerDown}
      onClick={overlayClick}
    >
      <div
        className="admin-delivery-zone-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-zone-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="admin-delivery-zone-header">
          <div>
            <h2 id="delivery-zone-modal-title">
              {editing ? 'Editar área de entrega' : 'Nova área de entrega'}
            </h2>
            <p>Ajuste o raio e, se precisar, marque exclusões vermelhas no mapa.</p>
          </div>
          <button
            type="button"
            className="admin-order-detail-close"
            onClick={requestClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </header>

        <div className="admin-delivery-zone-body">
          <div className="admin-delivery-zone-map-wrap">
            {!hasStoreCoords ? (
              <div className="admin-delivery-zone-map-empty">
                <strong>Coordenadas da loja não configuradas</strong>
                <span>
                  Salve o endereço em Minha loja ou use “Endereço da loja” no menu de Entrega para
                  recalcular as coordenadas.
                </span>
              </div>
            ) : null}
            {exclusionMode && hasStoreCoords ? (
              <div className="admin-delivery-zone-map-hint" role="status">
                Clique e arraste para marcar onde não entregar
              </div>
            ) : null}
            <div
              className={`admin-delivery-zone-map-toolbar${exclusionMode ? ' is-active' : ''}`}
            >
              <button
                type="button"
                className={`admin-delivery-zone-map-tool${exclusionMode ? ' is-active' : ''}`}
                onClick={() => {
                  setExclusionMode((value) => {
                    if (value) setSelectedExclusionId(null);
                    return !value;
                  });
                }}
                aria-pressed={exclusionMode}
              >
                {exclusionMode ? 'Desenhando exclusão' : 'Área de exclusão'}
              </button>
              <span className="admin-delivery-zone-map-count">
                {exclusions.length} exclus{exclusions.length === 1 ? 'ão' : 'ões'}
              </span>
            </div>
            <div ref={mapRef} className="admin-delivery-zone-map" />
          </div>

          <form className="admin-delivery-zone-panel" onSubmit={handleSubmit}>
            <div className="admin-form-group">
              <label className="admin-label" htmlFor="delivery-zone-nome">
                Nome da área
              </label>
              <input
                id="delivery-zone-nome"
                className="admin-input"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                placeholder="Ex: Centro"
                autoFocus
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-label" htmlFor="delivery-zone-raio">
                Raio máximo (km)
              </label>
              <div className="admin-delivery-zone-radius-row">
                <input
                  id="delivery-zone-raio"
                  className="admin-input admin-delivery-zone-raio-input"
                  value={raioInput}
                  onChange={handleRaioInputChange}
                  onBlur={handleRaioInputBlur}
                  inputMode="decimal"
                  placeholder="3"
                  aria-describedby="delivery-zone-raio-hint"
                />
                <span className="admin-delivery-zone-raio-unit">km</span>
              </div>
              <div
                className="admin-addon-passo-zoom-control admin-delivery-zone-raio-control"
                role="group"
                aria-label="Ajustar raio no mapa"
              >
                <button
                  type="button"
                  className="admin-addon-passo-zoom-btn"
                  aria-label="Diminuir raio"
                  disabled={clampRaio(raioKm) <= RAIO_MIN}
                  onClick={() => nudgeRaio(-RAIO_STEP)}
                >
                  −
                </button>
                <input
                  type="range"
                  className="admin-addon-passo-zoom-slider"
                  min={RAIO_MIN}
                  max={RAIO_MAX}
                  step={RAIO_STEP}
                  value={clampRaio(raioKm)}
                  onChange={handleSliderChange}
                  onMouseUp={handleSliderCommit}
                  onTouchEnd={handleSliderCommit}
                  onKeyUp={handleSliderCommit}
                  aria-label="Raio em quilômetros"
                />
                <button
                  type="button"
                  className="admin-addon-passo-zoom-btn"
                  aria-label="Aumentar raio"
                  disabled={clampRaio(raioKm) >= RAIO_MAX}
                  onClick={() => nudgeRaio(RAIO_STEP)}
                >
                  +
                </button>
              </div>
              <p id="delivery-zone-raio-hint" className="admin-help-text admin-delivery-zone-raio-hint">
                Arraste o controle ou digite o valor ({RAIO_MIN}–{RAIO_MAX} km). O círculo no mapa
                acompanha o raio.
              </p>
            </div>

            <div className="admin-form-group">
              <label className="admin-label" htmlFor="delivery-zone-taxa">
                Taxa de entrega
              </label>
              <input
                id="delivery-zone-taxa"
                className="admin-input"
                value={taxaEntrega}
                onChange={(event) => setTaxaEntrega(event.target.value)}
                placeholder="R$ 4,25"
              />
            </div>

            <div className="admin-delivery-zone-exclusions">
              <div className="admin-delivery-zone-exclusions-head">
                <h3>Exclusões</h3>
                <button
                  type="button"
                  className="admin-link-btn"
                  onClick={() => setExclusionMode(true)}
                >
                  + Desenhar
                </button>
              </div>
              {exclusions.length === 0 ? (
                <p className="admin-help-text">
                  Nenhuma exclusão. Ative o modo e arraste no mapa para bloquear uma região.
                </p>
              ) : (
                <ul className="admin-delivery-zone-exclusions-list">
                  {exclusions.map((item) => {
                    const isSelected = selectedExclusionId === item.id;
                    return (
                      <li
                        key={item.id}
                        className={`admin-delivery-zone-exclusion-item${
                          isSelected ? ' is-selected' : ''
                        }`}
                      >
                        <span className="admin-delivery-zone-exclusion-dot" aria-hidden="true" />
                        {isSelected ? (
                          <input
                            className="admin-input admin-delivery-zone-exclusion-name"
                            value={item.nome}
                            onChange={(event) => renameExclusion(item.id, event.target.value)}
                            aria-label="Nome da exclusão"
                            autoFocus
                          />
                        ) : (
                          <button
                            type="button"
                            className="admin-delivery-zone-exclusion-label"
                            onClick={() => setSelectedExclusionId(item.id)}
                          >
                            {item.nome}
                          </button>
                        )}
                        <button
                          type="button"
                          className="admin-link-btn"
                          onClick={() => focusExclusion(item)}
                        >
                          Ver
                        </button>
                        <button
                          type="button"
                          className="admin-addon-passo-summary-remove"
                          onClick={() => removeExclusion(item.id)}
                          aria-label={`Remover ${item.nome}`}
                        >
                          ×
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {error ? (
              <p className="admin-delivery-zone-error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="admin-delivery-zone-actions">
              <button type="button" className="admin-btn" onClick={requestClose} disabled={saving}>
                Cancelar
              </button>
              <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
                {saving
                  ? 'Salvando…'
                  : editing
                    ? 'Salvar alterações'
                    : 'Cadastrar área'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
