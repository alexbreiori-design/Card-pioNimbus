export const COVER_ASPECT = 5;
export const COVER_OUTPUT_WIDTH = 1240;
export const COVER_OUTPUT_HEIGHT = 248;

/** @deprecated Mantido para compatibilidade com código legado. */
export const COVER_FRAME_WIDTH = 620;
export const COVER_FRAME_HEIGHT = 124;

export function loadImageElement(src) {
  return createImage(src);
}

export function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => reject(new Error('Não foi possível carregar a imagem.')));
    if (!String(url).startsWith('data:') && !String(url).startsWith('blob:')) {
      image.crossOrigin = 'anonymous';
    }
    image.src = url;
  });
}

/** Converte URL remota em blob local para evitar bloqueio de canvas (CORS). */
export async function resolveEditableImageSrc(src) {
  const value = String(src || '').trim();
  if (!value) throw new Error('Imagem inválida.');
  if (value.startsWith('data:') || value.startsWith('blob:')) return { src: value, revoke: null };

  const response = await fetch(value);
  if (!response.ok) throw new Error('Não foi possível carregar a imagem.');
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  return {
    src: objectUrl,
    revoke: () => URL.revokeObjectURL(objectUrl),
  };
}

export async function getCroppedCoverImage(imageSrc, pixelCrop) {
  if (!pixelCrop?.width || !pixelCrop?.height) {
    throw new Error('Área de recorte inválida.');
  }

  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = COVER_OUTPUT_WIDTH;
  canvas.height = COVER_OUTPUT_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas não disponível.');

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    COVER_OUTPUT_WIDTH,
    COVER_OUTPUT_HEIGHT
  );

  return canvas.toDataURL('image/jpeg', 0.9);
}
