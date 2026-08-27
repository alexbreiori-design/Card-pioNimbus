/**
 * MapLibre v6 + Next/Turbopack: o worker precisa ficar em public/ junto do shared.
 * Sem isso o mapa monta o fundo e não puxa tiles de rua.
 * @see https://maplibre.org/maplibre-gl-js/docs/ (aba Turbopack)
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const dist = path.join(path.dirname(require.resolve('maplibre-gl/package.json')), 'dist');
const dest = path.join(process.cwd(), 'public', 'maplibre');

mkdirSync(dest, { recursive: true });
for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  copyFileSync(path.join(dist, file), path.join(dest, file));
}

console.log('[maplibre] worker copiado para public/maplibre/');
