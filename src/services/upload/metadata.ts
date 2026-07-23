import type { SettableMetadata } from "firebase/storage";
import type { UploadRequest } from "./types";

/**
 * Builds Firebase Storage metadata for every upload.
 *
 * Only technical metadata is stored.
 * Never store passwords, tokens, emails or phone numbers.
 */
export function buildStorageMetadata(
  request: UploadRequest,
): SettableMetadata {
  const metadata: Record<string, string> = {
    firebaseUid: request.user.uid,
    supabaseUid: request.user.id,
    uploadType: request.type,
    uploadedAt: new Date().toISOString(),
    app: "Service Master",
    version: "1",
  };

  if (request.listingId) {
    metadata.listingId = request.listingId;
  }

  if (request.chatId) {
    metadata.chatId = request.chatId;
  }

  // Merge any caller-supplied metadata
  if (request.metadata) {
    Object.assign(metadata, request.metadata);
  }

  return {
    contentType: "image/webp",

    cacheControl:
      request.type === "avatar"
        ? "public,max-age=3600"
        : "public,max-age=31536000,immutable",

    customMetadata: metadata,
  };
}

/**
 * Metadata keys reserved by the upload engine.
 * Prevent pages from accidentally overwriting them.
 */
export const ReservedMetadataKeys = [
  "firebaseUid",
  "supabaseUid",
  "uploadType",
  "uploadedAt",
  "listingId",
  "chatId",
  "app",
  "version",
] as const;
