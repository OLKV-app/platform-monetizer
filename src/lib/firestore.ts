import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { app } from "@/lib/firebase";

export const db = getFirestore(app);

/** Firestore may be unprovisioned/offline — never let it block the app. */
const FS_TIMEOUT_MS = 4000;
async function withTimeout<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await Promise.race([
      p,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), FS_TIMEOUT_MS)),
    ]);
  } catch {
    return fallback;
  }
}

export interface UserProfile {
  uid?: string;
  full_name?: string | null;
  island?: string | null;
  phone?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  hide_contact?: boolean;
  is_admin?: boolean;
  is_banned?: boolean;
  ban_reason?: string | null;
  [key: string]: unknown;
}

/**
 * Reads a user profile. If it does not exist and `defaults` are supplied,
 * the document is created with those defaults.
 */
export async function getProfileFromFirestore(
  uid: string,
  defaults?: Partial<UserProfile>,
): Promise<UserProfile | null> {
  const ref = doc(db, "profiles", uid);
  const snap = await getDoc(ref);

  if (snap.exists()) return { uid, ...(snap.data() as UserProfile) };

  if (!defaults) return null;

  const clean: Record<string, unknown> = { uid };
  for (const [k, v] of Object.entries(defaults)) {
    if (v !== undefined && v !== null) clean[k] = v;
  }
  await setDoc(ref, { ...clean, created_at: serverTimestamp() }, { merge: true });
  return { uid, ...(clean as UserProfile) };
}

export async function saveProfileToFirestore(
  uid: string,
  data: Partial<UserProfile>,
): Promise<void> {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) clean[k] = v;
  }
  await setDoc(
    doc(db, "profiles", uid),
    { ...clean, updated_at: serverTimestamp() },
    { merge: true },
  );
}

export async function getUserRoleFromFirestore(uid: string): Promise<string | null> {
  const snap = await getDoc(doc(db, "user_roles", uid));
  if (!snap.exists()) return null;
  const data = snap.data() as { role?: string };
  return data?.role ?? null;
}
