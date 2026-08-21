/** Assets e geometria do hero interativo (coords em % da imagem). */

export const HERO_DEMO_IMAGES = {
  idle: '/images/landing/hero/devices-idle.webp',
  phone: '/images/landing/hero/devices-phone.webp',
  laptop: '/images/landing/hero/devices-laptop.webp',
  phoneBlank: '/images/landing/hero/devices-phone-blank.webp',
  laptopBlank: '/images/landing/hero/devices-laptop-blank.webp',
  /** Máscara alpha da tela do celular (branco opaco = área visível do iframe). */
  phoneScreenMask: '/images/landing/hero/devices-phone-screen-mask.png',
  /** Cena exclusiva do hero no celular (não reusa a composição desktop). */
  mobilePhone: '/images/landing/hero/devices-mobile-phone-700.webp',
  mobilePhoneScreenMask: '/images/landing/hero/devices-mobile-phone-screen-mask.png',
  /** Hitmaps idle: branco/opaco = clicável. Pode substituir por arte manual. */
  idleHitPhone: '/images/landing/hero/devices-idle-hit-phone.png',
  idleHitLaptop: '/images/landing/hero/devices-idle-hit-laptop.png',
  /** Hitmaps do aparelho alternativo durante a demo (view focada). */
  idleHitPhoneView2: '/images/landing/hero/devices-idle-hit-phone-view-2.png',
  idleHitLaptopView2: '/images/landing/hero/devices-idle-hit-laptop-view-2.png',
};

/**
 * Fallback retangular se as hitmaps não carregarem.
 * Preferir sempre as PNGs de hit.
 */
export const HERO_IDLE_HOTSPOTS = {
  laptop: { left: 1, top: 17, width: 58, height: 72 },
  phone: { left: 51, top: 19, width: 17, height: 74 },
};

/**
 * Retângulo da tela (bounding box) onde o iframe é posicionado.
 * O clip fino (cantos + Dynamic Island) vem da máscara CSS.
 */
export const HERO_SCREEN_RECTS = {
  phone: { left: 52.14, top: 8.61, width: 23.42, height: 71.56, radius: 0 },
  laptop: { left: 18.15, top: 20.53, width: 59.53, height: 56.01, radius: 10 },
};

export const HERO_IFRAME_DESIGN = {
  phone: { width: 390, height: 844 },
  laptop: { width: 1280, height: 800 },
};

/** Dimensões nativas das artes idle/phone (para mapear clique → pixel da hitmap). */
export const HERO_IDLE_NATIVE = { width: 2528, height: 1684 };

export const HERO_MOBILE_NATIVE = { width: 723, height: 1346 };

/**
 * Bounding box da máscara alpha (arte 723×1346).
 * Precisa coincidir com a região opaca da PNG — o recorte fino
 * (cantos e Dynamic Island) vem da máscara, não deste retângulo.
 */
export const HERO_MOBILE_SCREEN_RECT = {
  left: 8.3,
  top: 4.2,
  width: 83.1,
  height: 90.5,
  radius: 0,
};

export const HERO_MOBILE_HOTSPOT = {
  left: 6.9,
  top: 3.7,
  width: 86.2,
  height: 92.6,
};

/** Deslocamento vertical da arte na demo do celular (mesmo valor do CSS translateY). */
export const HERO_PHONE_DEMO_OFFSET_Y = 8;

export const HERO_TRANSITION_MS = 720;
