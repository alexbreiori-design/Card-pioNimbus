export function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

/**
 * Renderiza a área visível do frame (5:1) em um JPEG/data URL.
 */
export function renderCoverImage(image, { frameW, frameH, offsetX, offsetY, zoom, outW = 1240, outH = 248 }) {
  const baseScale = Math.max(frameW / image.naturalWidth, frameH / image.naturalHeight);
  const scale = baseScale * zoom;
  const renderedW = image.naturalWidth * scale;
  const renderedH = image.naturalHeight * scale;
  const imgX = frameW / 2 + offsetX - renderedW / 2;
  const imgY = frameH / 2 + offsetY - renderedH / 2;

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas não disponível.');

  ctx.scale(outW / frameW, outH / frameH);
  ctx.beginPath();
  ctx.rect(0, 0, frameW, frameH);
  ctx.clip();
  ctx.drawImage(image, imgX, imgY, renderedW, renderedH);

  return canvas.toDataURL('image/jpeg', 0.9);
}

export const COVER_FRAME_WIDTH = 620;
export const COVER_FRAME_HEIGHT = 124;
export const COVER_OUTPUT_WIDTH = 1240;
export const COVER_OUTPUT_HEIGHT = 248;
