import sharp from 'sharp';

/** Max width sent to local vision models — keeps Ollama RAM usage manageable */
const OLLAMA_MAX_WIDTH = 768;
const OLLAMA_JPEG_QUALITY = 82;

export interface VisionImagePayload {
  base64: string;
  mimeType: string;
}

/**
 * Downscale and compress images before sending to Ollama.
 * Figma exports at 2x can be 2400px+ and cause llava OOM on CPU.
 */
export async function prepareImageForOllama(buffer: Buffer): Promise<VisionImagePayload> {
  const resized = await sharp(buffer)
    .rotate()
    .resize({
      width: OLLAMA_MAX_WIDTH,
      height: OLLAMA_MAX_WIDTH,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: OLLAMA_JPEG_QUALITY, mozjpeg: true })
    .toBuffer();

  return {
    base64: resized.toString('base64'),
    mimeType: 'image/jpeg',
  };
}

export async function prepareVisionImagesForOllama(
  images: VisionImagePayload[]
): Promise<VisionImagePayload[]> {
  return Promise.all(
    images.map(async (img) => {
      const buffer = Buffer.from(img.base64, 'base64');
      return prepareImageForOllama(buffer);
    })
  );
}
