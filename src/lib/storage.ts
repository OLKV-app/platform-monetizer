import { storage } from "./firebase";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

/**
 * Upload a file to Firebase Storage and return its download URL.
 */
export async function uploadFile(
  folder: string,
  filename: string,
  file: File
): Promise<string> {
  const storageRef = ref(storage, `${folder}/${filename}`);

  await uploadBytes(storageRef, file);

  return await getDownloadURL(storageRef);
}

/**
 * Delete a file from Firebase Storage.
 */
export async function deleteFile(
  folder: string,
  filename: string
): Promise<void> {
  const storageRef = ref(storage, `${folder}/${filename}`);
  await deleteObject(storageRef);
}

/**
 * Build a storage path.
 */
export function getStoragePath(
  folder: string,
  filename: string
): string {
  return `${folder}/${filename}`;
}
