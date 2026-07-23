import type { UploadProfile, UploadType } from "./types";

/**
 * Maximum upload size BEFORE processing.
 * (Bytes)
 */
const MB = 1024 * 1024;

export const uploadProfiles: Record<UploadType, UploadProfile> = {
  avatar: {
    maxWidth: 512,
    maxHeight: 512,
    maxFileSize: 2 * MB,
    quality: 0.8,
    format: "image/webp",
    cropSquare: true,
    generateThumbnail: false,
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
    ],
  },

  listing: {
    maxWidth: 1920,
    maxHeight: 1920,
    maxFileSize: 10 * MB,
    quality: 0.85,
    format: "image/webp",
    cropSquare: false,
    generateThumbnail: true,
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
    ],
  },

  banner: {
    maxWidth: 1920,
    maxHeight: 1080,
    maxFileSize: 8 * MB,
    quality: 0.85,
    format: "image/webp",
    cropSquare: false,
    generateThumbnail: true,
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
    ],
  },

  receipt: {
    maxWidth: 1600,
    maxHeight: 1600,
    maxFileSize: 5 * MB,
    quality: 0.8,
    format: "image/webp",
    cropSquare: false,
    generateThumbnail: false,
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
    ],
  },

  chat: {
    maxWidth: 1280,
    maxHeight: 1280,
    maxFileSize: 5 * MB,
    quality: 0.8,
    format: "image/webp",
    cropSquare: false,
    generateThumbnail: false,
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
    ],
  },

  review: {
    maxWidth: 1280,
    maxHeight: 1280,
    maxFileSize: 5 * MB,
    quality: 0.8,
    format: "image/webp",
    cropSquare: false,
    generateThumbnail: false,
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
    ],
  },
};

/**
 * Get upload profile for a given upload type.
 */
export function getUploadProfile(type: UploadType): UploadProfile {
  return uploadProfiles[type];
}

/**
 * Returns true if the MIME type is allowed.
 */
export function isAllowedMimeType(
  type: UploadType,
  mimeType: string,
): boolean {
  return uploadProfiles[type].allowedMimeTypes.includes(mimeType);
}
