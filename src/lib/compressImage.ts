const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.7;

export async function compressImageToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selected file is not an image.');
  }
  const dataUrl = await readAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const { width, height } = scaleToFit(image.naturalWidth, image.naturalHeight, MAX_DIMENSION);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context unavailable.');
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

function scaleToFit(width: number, height: number, max: number) {
  if (width <= max && height <= max) return { width, height };
  const ratio = width >= height ? max / width : max / height;
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image'));
    image.src = src;
  });
}
