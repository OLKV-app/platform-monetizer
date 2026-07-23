import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { auth, onAuthStateChanged, firebaseSignOut, type FirebaseUser } from "@/lib/firebase";
import { supabase } from "@/integrations/supabase/client";
import { bridgeFirebaseSession } from "@/lib/firebase-bridge.functions";

export interface AuthUser {
  id: string; // This will now be the Supabase UUID
  uid: string; // This stays as the Firebase UID
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
  const [supabaseUuid, setSupabaseUuid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
      setFirebaseUser(fUser);

      if (fUser) {
        try {
          // 1. Get Firebase Token
          const idToken = await fUser.getIdToken();

          // 2. Call your Server Bridge function
          const bridgeResult = await bridgeFirebaseSession({
            data: { idToken, fullName: fUser.displayName || undefined },
          });

          // 3. Verify OTP to establish Supabase session
          if (bridgeResult?.tokenHash) {
            const { data, error } = await supabase.auth.verifyOtp({
              type: 'magiclink',
              token_hash: bridgeResult.tokenHash,
            });

            if (error) {
              console.error("Supabase OTP verification failed:", error);
            } else if (data.user) {
              // 4. Save the Supabase UUID to state!
              setSupabaseUuid(data.user.id);
            }
          }
        } catch (err) {
          console.error("Bridge session failed:", err);
        }
      } else {
        // User logged out of Firebase
        setSupabaseUuid(null);
        await supabase.auth.signOut();
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const normalizedUser: AuthUser | null = (firebaseUser && supabaseUuid)
    ? {
        id: supabaseUuid, // <--- FIX: Use Supabase UUID for database queries
        uid: firebaseUser.uid, // Keep Firebase UID if you need it for Firebase queries
        email: firebaseUser.email,
        phone: firebaseUser.phoneNumber,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
      }
    : null;

  async function loadStatus(uuid: string) {
    try {
      // Now 'uuid' is a proper UUID, so these queries will work!
      const [{ data: role }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uuid).eq("role", "admin").maybeSingle(),
        supabase.from("profiles").select("is_banned,ban_reason").eq("id", uuid).maybeSingle(),
      ]);
      setIsAdmin(!!role);
      setIsBanned(!!profile?.is_banned);
      setBanReason(profile?.ban_reason ?? null);
    } catch (err) {
      console.error("Failed to load user status:", err);
    }
  }

  useEffect(() => {
    if (!supabaseUuid) {
      setIsAdmin(false);
      setIsBanned(false);
      setBanReason(null);
      return;
    }
    loadStatus(supabaseUuid);
  }, [supabaseUuid]);

  const refreshStatus = async () => {
    if (supabaseUuid) await loadStatus(supabaseUuid);
  };

  const signOut = async () => {
    await supabase.auth.signOut(); // Sign out of Supabase
    await firebaseSignOut(auth);   // Sign out of Firebase
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
