import { getUploadProfile, isAllowedMimeType } from "./profiles";
import type { UploadRequest } from "./types";

export interface ValidatedImage {
  image: HTMLImageElement;
  width: number;
  height: number;
}

export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadValidationError";
  }
}

/**
 * Reads a File into an HTMLImageElement.
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);

    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new UploadValidationError(
          "The selected image is invalid or corrupted.",
        ),
      );
    };

    image.src = url;
  });
}

/**
 * Validates an upload before processing.
 */
export async function validateUpload(
  request: UploadRequest,
): Promise<ValidatedImage> {
  const profile = getUploadProfile(request.type);

  const file = request.file;

  // Empty file
  if (file.size === 0) {
    throw new UploadValidationError(
      "The selected file is empty.",
    );
  }

  // MIME type
  if (!isAllowedMimeType(request.type, file.type)) {
    throw new UploadValidationError(
      "Only JPEG, PNG and WebP images are supported.",
    );
  }

  // Maximum upload size
  if (file.size > profile.maxFileSize) {
    const mb = (
      profile.maxFileSize /
      1024 /
      1024
    ).toFixed(0);

    throw new UploadValidationError(
      `Image exceeds the ${mb} MB upload limit.`,
    );
  }

  // Decode image
  const image = await loadImage(file);

  const width = image.naturalWidth;
  const height = image.naturalHeight;

  if (width <= 0 || height <= 0) {
    throw new UploadValidationError(
      "Image dimensions are invalid.",
    );
  }

  // Prevent huge images that can crash mobile browsers
  const pixels = width * height;

  if (pixels > 50000000) {
    throw new UploadValidationError(
      "Image resolution is too large.",
    );
  }

  return {
    image,
    width,
    height,
  };
}

/**
 * Returns true if the file looks like an image.
 */
export function isImage(file: File): boolean {
  return file.type.startsWith("image/");
}

/**
 * Human readable file size.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
