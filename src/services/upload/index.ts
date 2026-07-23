import { processImage } from "./processor";
import { uploadProcessedImage } from "./uploader";

import type {
  UploadProgressCallback,
  UploadRequest,
  UploadResult,
} from "./types";

/**
 * Complete upload pipeline.
 *
 * Validate
 * → Process
 * → Upload
 */
export async function uploadImage(
  request: UploadRequest,
  onProgress?: UploadProgressCallback,
): Promise<UploadResult> {
  const processed = await processImage(request);

  return uploadProcessedImage(
    request,
    processed,
    onProgress,
  );
}

export * from "./types";
export * from "./profiles";
