import type { UploadRequest } from "./types";

/**
 * Returns a cryptographically secure filename.
 */
function generateFilename(extension = "webp"): string {
  return `${crypto.randomUUID()}.${extension}`;
}

/**
 * Builds the Firebase Storage path for an upload.
 */
export function buildStoragePath(request: UploadRequest): string {
  const { type, user } = request;

  switch (type) {
    case "avatar":
      // Always overwrite the user's avatar
      return `users/${user.uid}/avatar/avatar.webp`;

    case "listing": {
      if (!request.listingId) {
        throw new Error("Listing uploads require listingId.");
      }

      return `users/${user.uid}/listings/${request.listingId}/${generateFilename()}`;
    }

    case "banner":
      return `users/${user.uid}/banners/${generateFilename()}`;

    case "receipt":
      return `users/${user.uid}/receipts/${generateFilename()}`;

    case "chat": {
      if (!request.chatId) {
        throw new Error("Chat uploads require chatId.");
      }

      return `users/${user.uid}/chats/${request.chatId}/${generateFilename()}`;
    }

    case "review":
      return `users/${user.uid}/reviews/${generateFilename()}`;

    default: {
      const exhaustive: never = type;
      throw new Error(`Unsupported upload type: ${exhaustive}`);
    }
  }
}

/**
 * Returns the folder containing the upload.
 */
export function getStorageFolder(request: UploadRequest): string {
  const fullPath = buildStoragePath(request);
  return fullPath.substring(0, fullPath.lastIndexOf("/"));
}

/**
 * Returns the filename only.
 */
export function getStorageFilename(request: UploadRequest): string {
  const fullPath = buildStoragePath(request);
  return fullPath.substring(fullPath.lastIndexOf("/") + 1);
}
