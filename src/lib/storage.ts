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
export async function uploadFile(
  folder: string,
  filename: string,
  file: File,
): Promise<string> {
  const auth = getAuth();
  const firebaseUser = auth.currentUser;

  if (!firebaseUser) {
    throw new Error("You must be signed in.");
  }

  let type:
    | "avatar"
    | "listing"
    | "banner"
    | "receipt"
    | "chat"
    | "review";

  let listingId: string | undefined;
  let chatId: string | undefined;

  switch (folder) {
    case "listing-images":
      type = "listing";
      listingId = filename.split("/")[1];
      break;

    case "avatars":
      type = "avatar";
      break;

    case "banners":
      type = "banner";
      break;

    case "receipts":
      type = "receipt";
      break;

    case "chat":
      type = "chat";
      chatId = filename.split("/")[1];
      break;

    case "reviews":
      type = "review";
      break;

    default:
      throw new Error(`Unsupported upload folder: ${folder}`);
  }

  const result = await uploadImage({
    type,
    file,
    listingId,
    chatId,
    user: {
      uid: firebaseUser.uid,
      id: "", // Supabase UUID if available
    },
  });

  return result.url;
}

export async function deleteFile(
  _folder: string,
  _filename: string,
): Promise<void> {
  throw new Error(
    "Use the centralized upload service for file deletion.",
  );
}
