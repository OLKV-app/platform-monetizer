import { FirebaseError } from "firebase/app";
import {
  getDownloadURL,
  ref,
  uploadBytesResumable,
  type UploadTaskSnapshot,
} from "firebase/storage";

import { storage } from "@/lib/firebase";

import {
  NetworkUploadError,
  UploadCancelledError,
  UploadFailedError,
} from "./errors";

import { buildStorageMetadata } from "./metadata";
import { buildStoragePath } from "./paths";

import type {
  ProcessedImage,
  UploadProgress,
  UploadProgressCallback,
  UploadRequest,
  UploadResult,
} from "./types";

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 1000;

/**
 * Wait for a given duration.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Convert Firebase errors into application errors.
 */
function mapFirebaseError(error: unknown): never {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "storage/canceled":
        throw new UploadCancelledError();

      case "storage/network-request-failed":
      case "storage/retry-limit-exceeded":
        throw new NetworkUploadError();

      default:
        throw new UploadFailedError(error.message);
    }
  }

  if (error instanceof Error) {
    throw new UploadFailedError(error.message);
  }

  throw new UploadFailedError();
}

/**
 * Upload a processed image to Firebase Storage.
 */
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

      (error) => {
        try {
          mapFirebaseError(error);
        } catch (mappedError) {
          reject(mappedError);
        }
      },

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
          try {
            mapFirebaseError(error);
          } catch (mappedError) {
            reject(mappedError);
          }
        }
      },
    );
  });
}

/**
 * Upload with automatic retry.
 *
 * Only retries transient network failures.
 */
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

      // Never retry if the user cancelled.
      if (error instanceof UploadCancelledError) {
        throw error;
      }

      // Retry only network-related failures.
      if (!(error instanceof NetworkUploadError)) {
        throw error;
      }

      attempt++;

      if (attempt >= MAX_RETRIES) {
        break;
      }

      // Exponential backoff with jitter.
      const backoff =
        RETRY_DELAY_MS * Math.pow(2, attempt - 1);

      const jitter = Math.random() * 300;

      await delay(backoff + jitter);
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new UploadFailedError();
}
