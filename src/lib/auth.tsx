import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { auth, onAuthStateChanged, firebaseSignOut, type FirebaseUser } from "@/lib/firebase";
import {
  getProfileFromFirestore,
  saveProfileToFirestore,
  getUserRoleFromFirestore,
} from "@/lib/firestore";

export interface AuthUser {
  id: string; // Firebase UID
  uid: string; // Firebase UID
  email: string | null;
  phone: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface Ctx {
  user: AuthUser | null;
  firebaseUser: FirebaseUser | null;
  session: { user: AuthUser } | null;
  loading: boolean;
  isAdmin: boolean;
  isBanned: boolean;
  banReason: string | null;
  signOut: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

const AuthContext = createContext<Ctx>({
  user: null,
  firebaseUser: null,
  session: null,
  loading: true,
  isAdmin: false,
  isBanned: false,
  banReason: null,
  signOut: async () => {},
  refreshStatus: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
      setFirebaseUser(fUser);

      if (fUser) {
        // Sync Firestore profile for phone/email
        try {
          await getProfileFromFirestore(fUser.uid, {
            phone: fUser.phoneNumber,
            email: fUser.email,
          });
          if (fUser.phoneNumber || fUser.email || fUser.displayName || fUser.photoURL) {
            await saveProfileToFirestore(fUser.uid, {
              ...(fUser.phoneNumber ? { phone: fUser.phoneNumber } : {}),
              ...(fUser.email ? { email: fUser.email } : {}),
              ...(fUser.displayName ? { full_name: fUser.displayName } : {}),
              ...(fUser.photoURL ? { avatar_url: fUser.photoURL } : {}),
            });
          }
        } catch (fsErr) {
          console.warn("Firestore profile sync error:", fsErr);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const normalizedUser: AuthUser | null = firebaseUser
    ? {
        id: firebaseUser.uid,
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        phone: firebaseUser.phoneNumber,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
      }
    : null;

  async function loadStatus(uid: string) {
    try {
      const [role, profile] = await Promise.all([
        getUserRoleFromFirestore(uid),
        getProfileFromFirestore(uid),
      ]);
      setIsAdmin(role === "admin" || profile?.is_admin === true);
      setIsBanned(!!profile?.is_banned);
      setBanReason(profile?.ban_reason ?? null);
    } catch (err) {
      console.error("Failed to load user status:", err);
    }
  }

  useEffect(() => {
    if (!firebaseUser?.uid) {
      setIsAdmin(false);
      setIsBanned(false);
      setBanReason(null);
      return;
    }
    loadStatus(firebaseUser.uid);
  }, [firebaseUser]);

  const refreshStatus = async () => {
    if (firebaseUser?.uid) await loadStatus(firebaseUser.uid);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user: normalizedUser,
        firebaseUser,
        session: normalizedUser ? { user: normalizedUser } : null,
        loading,
        isAdmin,
        isBanned,
        banReason,
        signOut,
        refreshStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export async function getCurrentAuthUser(): Promise<AuthUser | null> {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (u) => {
      unsub();
      if (!u) return resolve(null);
      resolve({
        id: u.uid,
        uid: u.uid,
        email: u.email,
        phone: u.phoneNumber,
        displayName: u.displayName,
        photoURL: u.photoURL,
      });
    });
  });
}
