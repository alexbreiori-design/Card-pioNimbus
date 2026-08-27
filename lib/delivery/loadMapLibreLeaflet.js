'use client';

/**
 * Side-effect: MapLibre + ponte Leaflet (sob demanda).
 * No Next/Turbopack é obrigatório setWorkerUrl apontando para public/maplibre/.
 */
import L from 'leaflet';
import { setWorkerUrl } from 'maplibre-gl';
import { maplibreGL } from '@maplibre/maplibre-gl-leaflet';
import 'maplibre-gl/dist/maplibre-gl.css';

setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');

if (typeof L.maplibreGL !== 'function') {
  L.maplibreGL = maplibreGL;
}
