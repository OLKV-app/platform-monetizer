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
  type: UploadType;

  user: UploadUser;

  file: File;

  /**
   * Required for listing images
   */
  listingId?: string;

  /**
   * Required for chat images
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
  url: string;

  storagePath: string;

  downloadUrl: string;

  width: number;

  height: number;

  size: number;

  mimeType: string;
}

export interface UploadProgress {
  stage:
    | "validating"
    | "processing"
    | "compressing"
    | "uploading"
    | "complete";

  progress: number;
}

export type UploadProgressCallback = (
  progress: UploadProgress
) => void;
