import { uploadImage } from "@/services/upload";
import { getAuth } from "firebase/auth";

/**
 * Legacy compatibility wrapper.
 *
 * Existing calls like:
 *
 * uploadFile("listing-images", filename, file)
 *
 * are automatically routed through the new upload engine.
 */
export interface LegacyUploadOptions {
  folder?: string;
  type?: "avatar" | "listing" | "banner" | "receipt" | "chat" | "review";
  user?: { uid: string; id?: string } | null;
  listingId?: string;
  chatId?: string;
  file?: File;
  filename?: string;
  onProgress?: (progress: {
    percentage: number;
    bytesTransferred: number;
    totalBytes: number;
  }) => void;
}

/**
 * Universal compatibility wrapper for file uploads.
 *
 * Supports both:
 * 1. uploadFile("listing-images", filename, file)
 * 2. uploadFile({ type: "listing", user, listingId, file, filename, onProgress })
 */
export async function uploadFile(
  folderOrOptions: string | LegacyUploadOptions,
  filenameArg?: string,
  fileArg?: File,
): Promise<string> {
  const auth = getAuth();
  const firebaseUser = auth.currentUser;

  let type: "avatar" | "listing" | "banner" | "receipt" | "chat" | "review" = "listing";
  let listingId: string | undefined;
  let chatId: string | undefined;
  let file: File | undefined;
  let userObject = firebaseUser ? { uid: firebaseUser.uid, id: "" } : null;
  let onProgressCallback: ((progress: any) => void) | undefined;

  if (typeof folderOrOptions === "object" && folderOrOptions !== null) {
    const opts = folderOrOptions;
    file = opts.file;
    type = opts.type ?? "listing";
    listingId = opts.listingId;
    chatId = opts.chatId;
    onProgressCallback = opts.onProgress;

    if (opts.user?.uid) {
      userObject = { uid: opts.user.uid, id: opts.user.id || "" };
    }
  } else {
    const folder = folderOrOptions;
    const filename = filenameArg ?? "";
    file = fileArg;

    switch (folder) {
      case "listing-images":
      case "listings":
      case "listing":
        type = "listing";
        if (filename.includes("/")) {
          listingId = filename.split("/")[0];
        } else if (filename) {
          listingId = filename;
        }
        break;

      case "avatars":
      case "avatar":
        type = "avatar";
        break;

      case "banners":
      case "banner":
        type = "banner";
        break;

      case "receipts":
      case "receipt":
        type = "receipt";
        break;

      case "chat":
      case "chats":
        type = "chat";
        if (filename.includes("/")) {
          chatId = filename.split("/")[0];
        }
        break;

      case "reviews":
      case "review":
        type = "review";
        break;

      default:
        throw new Error(`Unsupported upload folder: ${folder}`);
    }
  }

  if (!file) {
    throw new Error("No file selected for upload.");
  }

  if (!userObject) {
    throw new Error("You must be signed in to upload files.");
  }

  const result = await uploadImage(
    {
      type,
      file,
      listingId,
      chatId,
      user: userObject,
    },
    onProgressCallback,
  );

  return result.url;
}

export async function deleteFile(_folder: string, _filename: string): Promise<void> {
  throw new Error("Use the centralized upload service for file deletion.");
}
