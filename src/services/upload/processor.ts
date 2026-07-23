import { getUploadProfile } from "./profiles";
import type {
  ProcessedImage,
  UploadRequest,
} from "./types";
import { validateUpload } from "./validator";

function calculateSize(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
) {
  const ratio = Math.min(
    maxWidth / width,
    maxHeight / height,
    1,
  );

  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

function createCanvas(
  width: number,
  height: number,
): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  return canvas;
}

async function canvasToBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  quality: number,
): Promise<Blob> {
  if (canvas instanceof OffscreenCanvas) {
    return await canvas.convertToBlob({
      type: "image/webp",
      quality,
    });
  }

  return await new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to process image."));
          return;
        }

        resolve(blob);
      },
      "image/webp",
      quality,
    );
  });
}

export async function processImage(
  request: UploadRequest,
): Promise<ProcessedImage> {
  const profile = getUploadProfile(request.type);

  const validated = await validateUpload(request);

  let source:
    | ImageBitmap
    | HTMLImageElement;

  if (typeof createImageBitmap !== "undefined") {
    source = await createImageBitmap(request.file);
  } else {
    source = validated.image;
  }

  const originalWidth =
    "width" in source
      ? source.width
      : validated.width;

  const originalHeight =
    "height" in source
      ? source.height
      : validated.height;

  let drawX = 0;
  let drawY = 0;

  let drawWidth = originalWidth;
  let drawHeight = originalHeight;

  let targetWidth = originalWidth;
  let targetHeight = originalHeight;

  if (profile.cropSquare) {
    const size = Math.min(
      originalWidth,
      originalHeight,
    );

    drawX = (originalWidth - size) / 2;
    drawY = (originalHeight - size) / 2;

    drawWidth = size;
    drawHeight = size;

    targetWidth = profile.maxWidth;
    targetHeight = profile.maxHeight;
  } else {
    const resized = calculateSize(
      originalWidth,
      originalHeight,
      profile.maxWidth,
      profile.maxHeight,
    );

    targetWidth = resized.width;
    targetHeight = resized.height;
  }

  const canvas = createCanvas(
    targetWidth,
    targetHeight,
  );

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error(
      "Unable to create canvas context.",
    );
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
    source,
    drawX,
    drawY,
    drawWidth,
    drawHeight,
    0,
    0,
    targetWidth,
    targetHeight,
  );

  if (source instanceof ImageBitmap) {
    source.close();
  }

  const blob = await canvasToBlob(
    canvas,
    profile.quality,
  );

  return {
    blob,
    width: targetWidth,
    height: targetHeight,
    size: blob.size,
    mimeType: "image/webp",
  };
}
