import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { auth, onAuthStateChanged, firebaseSignOut, type FirebaseUser } from "@/lib/firebase";
import { supabase } from "@/integrations/supabase/client";

export interface AuthUser {
  id: string;
  uid: string;
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
    const unsubscribe = onAuthStateChanged(auth, (fUser) => {
      setFirebaseUser(fUser);
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
      const [{ data: role }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle(),
        supabase.from("profiles").select("is_banned,ban_reason").eq("id", uid).maybeSingle(),
      ]);
      setIsAdmin(!!role);
      setIsBanned(!!profile?.is_banned);
      setBanReason(profile?.ban_reason ?? null);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!firebaseUser) {
      setIsAdmin(false);
      setIsBanned(false);
      setBanReason(null);
      return;
    }
    loadStatus(firebaseUser.uid);
  }, [firebaseUser?.uid]);

  const refreshStatus = async () => {
    if (firebaseUser) await loadStatus(firebaseUser.uid);
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

