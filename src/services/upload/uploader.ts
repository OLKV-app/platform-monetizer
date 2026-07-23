import {
  getDownloadURL,
  ref,
  uploadBytesResumable,
  type UploadTaskSnapshot,
} from "firebase/storage";

import { storage } from "@/lib/firebase";
import { buildStorageMetadata } from "./metadata";
import { buildStoragePath } from "./paths";
import type {
  ProcessedImage,
  UploadProgress,
  UploadProgressCallback,
  UploadRequest,
  UploadResult,
} from "./types";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function uploadOnce(
  request: UploadRequest,
  processed: ProcessedImage,
  onProgress?: UploadProgressCallback,
): Promise<UploadResult> {
  const storagePath = buildStoragePath(request);

  const storageRef = ref(storage, storagePath);

  const metadata = buildStorageMetadata(request);

  const uploadTask = uploadBytesResumable(
    storageRef,
    processed.blob,
    metadata,
  );

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",

      (snapshot: UploadTaskSnapshot) => {
        if (!onProgress) return;

        const progress: UploadProgress = {
          bytesTransferred: snapshot.bytesTransferred,
          totalBytes: snapshot.totalBytes,
          percentage:
            snapshot.totalBytes === 0
              ? 0
              : Math.round(
                  (snapshot.bytesTransferred /
                    snapshot.totalBytes) *
                    100,
                ),
          state: snapshot.state,
        };

        onProgress(progress);
      },

      reject,

      async () => {
        try {
          const downloadURL = await getDownloadURL(
            uploadTask.snapshot.ref,
          );

          resolve({
            url: downloadURL,
            path: storagePath,
            metadata,
            size: processed.size,
            width: processed.width,
            height: processed.height,
            mimeType: processed.mimeType,
          });
        } catch (error) {
          reject(error);
        }
      },
    );
  });
}

export async function uploadProcessedImage(
  request: UploadRequest,
  processed: ProcessedImage,
  onProgress?: UploadProgressCallback,
): Promise<UploadResult> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt < MAX_RETRIES) {
    try {
      return await uploadOnce(
        request,
        processed,
        onProgress,
      );
    } catch (error) {
      lastError = error;
      attempt++;

      if (attempt >= MAX_RETRIES) {
        break;
      }

      await delay(RETRY_DELAY_MS * attempt);
    }
  }

  throw lastError;
}
