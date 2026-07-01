function normalizeHex(hex) {
  const raw = String(hex || '').trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return '#4e48dd';
  return `#${raw.toLowerCase()}`;
}

function hexToRgb(hex) {
  const normalized = normalizeHex(hex).replace('#', '');
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`;
}

export function mixColors(hex, target, weight) {
  const from = hexToRgb(hex);
  const to = hexToRgb(target);
  if (!from || !to) return hex;
  return rgbToHex({
    r: from.r * (1 - weight) + to.r * weight,
    g: from.g * (1 - weight) + to.g * weight,
    b: from.b * (1 - weight) + to.b * weight,
  });
}

function hexToHsl(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;

  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: l * 100 };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;

  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    default:
      h = ((r - g) / d + 4) / 6;
      break;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h, s, l) {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return rgbToHex({
    r: (r + m) * 255,
    g: (g + m) * 255,
    b: (b + m) * 255,
  });
}

function wrapHue(h) {
  let value = h % 360;
  if (value < 0) value += 360;
  return value;
}

/**
 * Desloca matiz na roda de cores conforme a família da cor base.
 * Ajuste dh (graus), ds (saturação) e dl (luminosidade) por faixa abaixo.
 */
function getBrandGradientShift(h) {
  if (h >= 52 && h < 75) return { dh: -22, ds: 10, dl: 1 };
  if (h >= 75 && h < 95) return { dh: -14, ds: 8, dl: 0 };
  if (h >= 28 && h < 52) return { dh: -18, ds: 12, dl: 0 };
  if (h >= 12 && h < 28) return { dh: -16, ds: 10, dl: -6 };
  if (h >= 0 && h < 12) return { dh: -14, ds: 8, dl: -14 };
  if (h >= 345) return { dh: -6, ds: 10, dl: -12 };
  if (h >= 320 && h < 345) return { dh: -14, ds: 10, dl: -10 };
  if (h >= 300 && h < 320) return { dh: -20, ds: 8, dl: -6 };
  if (h >= 260 && h < 300) return { dh: -24, ds: 6, dl: -8 };
  if (h >= 230 && h < 260) return { dh: -14, ds: 8, dl: -4 };
  if (h >= 195 && h < 230) return { dh: -10, ds: 6, dl: -3 };
  if (h >= 165 && h < 195) return { dh: +12, ds: 6, dl: 0 };
  if (h >= 140 && h < 165) return { dh: -10, ds: 8, dl: 0 };
  if (h >= 95 && h < 140) return { dh: -15, ds: 8, dl: 0 };
  return { dh: +14, ds: 8, dl: 0 };
}

/** Tom da esquerda do gradiente — deslocamento de matiz, não só escurecer. */
export function getBrandVividColor(hex) {
  const brand = normalizeHex(hex);
  const hsl = hexToHsl(brand);
  if (!hsl) return brand;

  if (hsl.s < 8) {
    return mixColors(brand, '#6366f1', 0.32);
  }

  const h = wrapHue(hsl.h);
  const { dh, ds, dl } = getBrandGradientShift(h);
  const nextH = wrapHue(h + dh);
  const nextS = Math.min(100, Math.max(0, hsl.s + ds));
  const nextL = Math.min(80, Math.max(24, hsl.l + dl));

  const vivid = hslToHex(nextH, nextS, nextL);
  if (vivid.toLowerCase() === brand.toLowerCase()) {
    return hslToHex(wrapHue(h + dh * 1.4), Math.min(100, nextS + 8), nextL);
  }
  return vivid;
}

export function getBrandGradient(hex) {
  const brand = normalizeHex(hex);
  const vivid = getBrandVividColor(brand);
  return `linear-gradient(90deg, ${vivid} 0%, ${brand} 100%)`;
}

export function applyBrandThemeTargets(targets, hex) {
  const brand = normalizeHex(hex);
  const vivid = getBrandVividColor(brand);
  const gradient = getBrandGradient(brand);

  targets.forEach((target) => {
    if (!target) return;
    target.style.setProperty('--brand', brand);
    target.style.setProperty('--brand-vivid', vivid);
    target.style.setProperty('--brand-gradient', gradient);
    target.style.setProperty('--brand-hover', mixColors(brand, '#000000', 0.18));
    target.style.setProperty('--brand-light', mixColors(brand, '#ffffff', 0.9));
    target.style.setProperty('--brand-mid', mixColors(brand, '#ffffff', 0.42));
    target.style.setProperty(
      '--brand-soft',
      `color-mix(in srgb, ${brand} 18%, transparent)`
    );
  });
}
