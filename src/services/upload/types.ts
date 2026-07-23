import type { SettableMetadata } from "firebase/storage";

/**
 * Universal Upload Engine
 * -----------------------
 * Shared types used across the upload service.
 */

export type UploadType =
  | "avatar"
  | "listing"
  | "banner"
  | "receipt"
  | "chat"
  | "review";

export interface UploadUser {
  /**
   * Supabase UUID
   */
  id: string;

  /**
   * Firebase UID
   */
  uid: string;
}

export interface UploadRequest {
  /**
   * Upload category.
   */
  type: UploadType;

  /**
   * Current authenticated user.
   */
  user: UploadUser;

  /**
   * Original file selected by the user.
   */
  file: File;

  /**
   * Required for listing images.
   */
  listingId?: string;

  /**
   * Required for chat images.
   */
  chatId?: string;

  /**
   * Optional custom filename.
   * Normally generated automatically.
   */
  filename?: string;

  /**
   * Additional Firebase metadata.
   */
  metadata?: Record<string, string>;
}

export interface UploadProfile {
  maxWidth: number;

  maxHeight: number;

  maxFileSize: number;

  quality: number;

  format: "image/webp" | "image/jpeg";

  cropSquare: boolean;

  generateThumbnail: boolean;

  allowedMimeTypes: string[];
}

export interface ProcessedImage {
  blob: Blob;

  width: number;

  height: number;

  size: number;

  mimeType: string;
}

export interface UploadResult {
  /**
   * Firebase download URL.
   */
  url: string;

  /**
   * Firebase Storage path.
   */
  path: string;

  /**
   * Metadata stored with the uploaded object.
   */
  metadata: SettableMetadata;

  /**
   * Final uploaded image width.
   */
  width: number;

  /**
   * Final uploaded image height.
   */
  height: number;

  /**
   * Final uploaded file size.
   */
  size: number;

  /**
   * Uploaded MIME type.
   */
  mimeType: string;
}

export interface UploadProgress {
  /**
   * Uploaded bytes.
   */
  bytesTransferred: number;

  /**
   * Total bytes.
   */
  totalBytes: number;

  /**
   * Progress percentage (0-100).
   */
  percentage: number;

  /**
   * Firebase upload state.
   */
  state: "running" | "paused" | "success";
}

export type UploadProgressCallback = (
  progress: UploadProgress,
) => void;

export interface UploadController {
  /**
   * Upload promise.
   */
  promise: Promise<UploadResult>;

  /**
   * Cancel the upload.
   */
  cancel: () => void;
}
