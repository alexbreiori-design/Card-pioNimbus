'use client';

import { useCallback, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createBasemapLayer } from '@/lib/delivery/mapBasemaps';
import { parseCoordinate } from '@/lib/delivery/formatAddress';

const DEFAULT_ZOOM = 16;

function createStoreIcon() {
  const width = 28;
  const height = 26;
  return L.divIcon({
    className: 'delivery-route-store-pin admin-store-map-pin-icon',
    html: `<img src="/icons/store-pin.svg" alt="" class="delivery-route-store-icon" width="${width}" height="${height}" draggable="false" />`,
    iconSize: [width, height],
    iconAnchor: [width / 2, height / 2],
  });
}

function readCoords(latitude, longitude) {
  const lat = parseCoordinate(latitude);
  const lng = parseCoordinate(longitude);
  if (lat == null || lng == null) return null;
  if (lat === 0 && lng === 0) return null;
  return { latitude: lat, longitude: lng };
}

/**
 * Mapa com pin arrastável para posicionar o endereço da loja.
 */
export default function StoreAddressMapPin({
  latitude = null,
  longitude = null,
  onChange,
  loading = false,
  hint = 'Arraste o pin até a porta da loja. Usamos este ponto para calcular as áreas de entrega.',
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const coords = readCoords(latitude, longitude);
  const hasCoords = Boolean(coords);

  const destroyMap = useCallback(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    markerRef.current = null;
  }, []);

  useEffect(() => {
    if (!hasCoords) {
      destroyMap();
      return undefined;
    }
    if (mapInstanceRef.current || !mapRef.current || !coords) return undefined;

    let cancelled = false;
    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: true,
    });
    map.setView([coords.latitude, coords.longitude], DEFAULT_ZOOM);
    mapInstanceRef.current = map;

    const marker = L.marker([coords.latitude, coords.longitude], {
      icon: createStoreIcon(),
      draggable: true,
      zIndexOffset: 1000,
      autoPan: true,
    }).addTo(map);
    markerRef.current = marker;

    marker.on('dragend', () => {
      const next = marker.getLatLng();
      onChangeRef.current?.({
        latitude: Number(next.lat.toFixed(7)),
        longitude: Number(next.lng.toFixed(7)),
      });
    });

    void (async () => {
      try {
        const layer = await createBasemapLayer(L, 'ruas');
        if (cancelled || mapInstanceRef.current !== map) {
          layer?.remove?.();
          return;
        }
        layer.addTo(map);
      } catch {
        if (cancelled || mapInstanceRef.current !== map) return;
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 19,
        }).addTo(map);
      }
      requestAnimationFrame(() => {
        if (!cancelled) map.invalidateSize();
      });
    })();

    return () => {
      cancelled = true;
      destroyMap();
    };
    // Só monta/desmonta quando passa a ter (ou perde) coordenadas.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- coords iniciais só na montagem
  }, [hasCoords, destroyMap]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const marker = markerRef.current;
    if (!map || !marker || !coords) return;
    const current = marker.getLatLng();
    const moved =
      Math.abs(current.lat - coords.latitude) > 0.00001 ||
      Math.abs(current.lng - coords.longitude) > 0.00001;
    if (!moved) return;
    marker.setLatLng([coords.latitude, coords.longitude]);
    map.setView([coords.latitude, coords.longitude], map.getZoom() || DEFAULT_ZOOM);
    map.invalidateSize();
  }, [coords?.latitude, coords?.longitude]);

  return (
    <div className="admin-store-map-pin">
      <p className="admin-help-text admin-store-map-pin-hint">{hint}</p>
      <div className="admin-store-map-pin-wrap">
        {!hasCoords ? (
          <div className="admin-store-map-pin-empty" role="status">
            <strong>Posição ainda não definida</strong>
            <span>
              Preencha o endereço completo (rua, número e cidade). O mapa aparece para você ajustar o
              pin.
            </span>
          </div>
        ) : null}
        {loading ? (
          <div className="admin-store-map-pin-loading" role="status">
            Localizando no mapa…
          </div>
        ) : null}
        <div
          ref={mapRef}
          className="admin-store-map-pin-map"
          aria-label="Mapa para posicionar a loja"
        />
      </div>
    </div>
  );
}
