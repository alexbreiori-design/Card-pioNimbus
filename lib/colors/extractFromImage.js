/**
 * Extrai cores dominantes de uma imagem (100% client-side, canvas).
 * @param {string} src URL ou data URL
 * @param {number} count
 * @returns {Promise<string[]>} hex colors
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

function colorDistance(a, b) {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

export async function extractDominantColors(src, count = 7) {
  if (!src) return [];
  const img = await loadImage(src);
  const size = 72;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  const buckets = new Map();

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 120) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r > 245 && g > 245 && b > 245) continue;
    if (r < 12 && g < 12 && b < 12) continue;
    const key = `${Math.round(r / 16)},${Math.round(g / 16)},${Math.round(b / 16)}`;
    const prev = buckets.get(key) || { r: 0, g: 0, b: 0, n: 0 };
    prev.r += r;
    prev.g += g;
    prev.b += b;
    prev.n += 1;
    buckets.set(key, prev);
  }

  const ranked = [...buckets.values()]
    .sort((a, b) => b.n - a.n)
    .map((bucket) => ({
      r: bucket.r / bucket.n,
      g: bucket.g / bucket.n,
      b: bucket.b / bucket.n,
      hex: rgbToHex(bucket.r / bucket.n, bucket.g / bucket.n, bucket.b / bucket.n),
    }));

  const picked = [];
  for (const candidate of ranked) {
    if (picked.some((p) => colorDistance(p, candidate) < 36)) continue;
    picked.push(candidate);
    if (picked.length >= count) break;
  }

  return picked.map((p) => p.hex);
}
