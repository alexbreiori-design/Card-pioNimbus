/** Estilos de mapa base para Leaflet no admin (raster + vetorial Nimbus). */

export const DELIVERY_BASEMAP_STORAGE_KEY = 'nimbus.delivery.mapBasemap.v3';

export const DELIVERY_BASEMAPS = [
  {
    id: 'nimbus',
    label: 'Nimbus',
    kind: 'vector',
    /** Positron (OpenFreeMap) com tinta suave da marca — carregado sob demanda. */
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://openfreemap.org/">OpenFreeMap</a>',
  },
  {
    id: 'ruas',
    label: 'Ruas',
    kind: 'raster',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: 'abc',
    maxZoom: 19,
  },
  {
    id: 'satelite',
    label: 'Satélite',
    kind: 'raster',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    maxZoom: 19,
  },
];

const DEFAULT_BASEMAP_ID = 'ruas';
const OPENFREEMAP_POSITRON = 'https://tiles.openfreemap.org/styles/positron';

/** Tons alinhados ao brand (#4e48dd). Hierarquia: fundo < mata < rios (mais escuro). */
const ROAD_INNER = '#ffffff';
const NIMBUS_BG = '#e6e3f0';
const NIMBUS_GREEN = '#d4d0e8';
const NIMBUS_WATER = '#b8b0d0';
const NIMBUS_WATERWAY = '#9e95bc';

const NIMBUS_LAYER_PAINT = {
  background: { 'background-color': NIMBUS_BG },
  park: { 'fill-color': NIMBUS_GREEN },
  water: { 'fill-color': NIMBUS_WATER },
  landuse_residential: { 'fill-color': NIMBUS_BG },
  landcover_wood: { 'fill-color': NIMBUS_GREEN },
  landcover_ice_shelf: { 'fill-color': NIMBUS_GREEN },
  landcover_glacier: { 'fill-color': NIMBUS_GREEN },
  waterway: { 'line-color': NIMBUS_WATERWAY },
  highway_minor: { 'line-color': ROAD_INNER, 'line-opacity': 1 },
  highway_major_inner: { 'line-color': ROAD_INNER },
  highway_major_subtle: { 'line-color': ROAD_INNER, 'line-opacity': 0.85 },
  highway_motorway_subtle: { 'line-color': ROAD_INNER, 'line-opacity': 0.85 },
  tunnel_motorway_inner: { 'line-color': ROAD_INNER },
  highway_motorway_bridge_inner: { 'line-color': ROAD_INNER },
  road_area_pier: { 'fill-color': NIMBUS_BG },
  road_pier: { 'line-color': ROAD_INNER },
};

const NIMBUS_HIDE_LAYERS = [
  'building',
  'highway_path',
  'highway_major_casing',
  'highway_motorway_casing',
  'tunnel_motorway_casing',
  'highway_motorway_bridge_casing',
  'railway_transit',
  'railway_transit_dashline',
  'railway_service',
  'railway_service_dashline',
  'railway',
  'railway_dashline',
  'aeroway-taxiway',
  'aeroway-runway-casing',
  'aeroway-area',
  'aeroway-runway',
  'airport',
];

function roadWidth(at13, at20) {
  return ['interpolate', ['exponential', 1.4], ['zoom'], 13, at13, 20, at20];
}

let mapLibreReadyPromise = null;
let nimbusStylePromise = null;

export function readStoredBasemapId() {
  if (typeof window === 'undefined') return DEFAULT_BASEMAP_ID;
  try {
    const raw = window.localStorage.getItem(DELIVERY_BASEMAP_STORAGE_KEY);
    if (DELIVERY_BASEMAPS.some((item) => item.id === raw)) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_BASEMAP_ID;
}

export function persistBasemapId(id) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DELIVERY_BASEMAP_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

export function getBasemapConfig(id) {
  return DELIVERY_BASEMAPS.find((item) => item.id === id) || DELIVERY_BASEMAPS.find((item) => item.id === DEFAULT_BASEMAP_ID);
}

async function ensureMapLibre(L) {
  if (typeof L.maplibreGL === 'function') return;
  if (!mapLibreReadyPromise) {
    mapLibreReadyPromise = import('@/lib/delivery/loadMapLibreLeaflet');
  }
  await mapLibreReadyPromise;
  if (typeof L.maplibreGL !== 'function') {
    throw new Error('MapLibre GL Leaflet não carregou.');
  }
}

function applyPaintOverrides(layer, paints) {
  if (!paints || !layer.paint) return;
  layer.paint = { ...layer.paint };
  Object.entries(paints).forEach(([key, value]) => {
    layer.paint[key] = value;
  });
}

function buildNimbusStyle(baseStyle) {
  const style = structuredClone(baseStyle);
  style.name = 'Nimbus';
  const layers = [];

  for (const layer of style.layers || []) {
    if (NIMBUS_HIDE_LAYERS.includes(layer.id)) {
      layers.push({
        ...layer,
        layout: { ...(layer.layout || {}), visibility: 'none' },
      });
      continue;
    }

    const next = { ...layer };
    const paints = NIMBUS_LAYER_PAINT[layer.id];
    if (paints) {
      applyPaintOverrides(next, paints);
    }

    // Só traço branco — sem contorno (casing some no fundo).
    if (layer.id === 'highway_minor' && next.paint) {
      next.paint = {
        ...next.paint,
        'line-color': ROAD_INNER,
        'line-opacity': 1,
        'line-width': roadWidth(1.4, 10),
      };
    }
    if (layer.id === 'highway_major_inner' && next.paint) {
      next.paint = {
        ...next.paint,
        'line-color': ROAD_INNER,
        'line-width': roadWidth(1.6, 11),
      };
    }
    if (
      (layer.id === 'highway_motorway_inner' ||
        layer.id === 'tunnel_motorway_inner' ||
        layer.id === 'highway_motorway_bridge_inner') &&
      next.paint
    ) {
      next.paint = {
        ...next.paint,
        'line-color': ROAD_INNER,
        'line-width': roadWidth(1.8, 12),
      };
    }

    if (layer.type === 'symbol' && layer.paint) {
      next.paint = { ...(next.paint || layer.paint) };
      if (next.paint['text-color']) next.paint['text-color'] = '#5c5678';
      if (next.paint['text-halo-color']) next.paint['text-halo-color'] = NIMBUS_BG;
      if (next.paint['icon-opacity'] == null) next.paint['icon-opacity'] = 0.75;
    }

    layers.push(next);
  }

  style.layers = layers;
  return style;
}

async function loadNimbusStyle() {
  if (!nimbusStylePromise) {
    nimbusStylePromise = (async () => {
      const res = await fetch(OPENFREEMAP_POSITRON);
      if (!res.ok) throw new Error('Não foi possível carregar o estilo Nimbus.');
      const base = await res.json();
      return buildNimbusStyle(base);
    })().catch((error) => {
      nimbusStylePromise = null;
      throw error;
    });
  }
  return nimbusStylePromise;
}

/**
 * Cria a layer Leaflet do estilo informado.
 * Vector (Nimbus) carrega MapLibre sob demanda.
 */
export async function createBasemapLayer(L, id) {
  const config = getBasemapConfig(id);

  if (config.kind === 'vector') {
    await ensureMapLibre(L);
    const style = await loadNimbusStyle();
    return L.maplibreGL({
      style,
      interactive: false,
      attribution: config.attribution,
    });
  }

  const options = {
    attribution: config.attribution,
    maxZoom: config.maxZoom || 19,
  };
  if (config.maxNativeZoom) options.maxNativeZoom = config.maxNativeZoom;
  if (config.subdomains) options.subdomains = config.subdomains;
  return L.tileLayer(config.url, options);
}
