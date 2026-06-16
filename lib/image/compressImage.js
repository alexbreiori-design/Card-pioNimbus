function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Não foi possível processar a imagem.'));
    image.src = src;
  });
}

/** Reduz data URLs grandes antes do upload ao Storage. */
export async function compressImageDataUrl(
  dataUrl,
  { maxSize = 900, quality = 0.72, maxLength = 280000 } = {}
) {
  if (!dataUrl?.startsWith('data:image/')) return dataUrl || '';

  const image = await loadImage(dataUrl);
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) return dataUrl;

  context.drawImage(image, 0, 0, width, height);

  let nextQuality = quality;
  let compressed = canvas.toDataURL('image/jpeg', nextQuality);
  while (compressed.length > maxLength && nextQuality > 0.42) {
    nextQuality -= 0.1;
    compressed = canvas.toDataURL('image/jpeg', nextQuality);
  }
  return compressed;
}
