import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { firebaseAuth, onIdTokenChanged, fbSignOut, type FirebaseUser } from "@/integrations/firebase/client";
import { useServerFn } from "@tanstack/react-start";
import { bridgeFirebaseSession } from "./firebase-bridge.functions";

interface AuthUserLike {
  id: string;                 // Supabase user id (RLS uses this)
  email: string | null;
  user_metadata: Record<string, unknown>;
}

interface Ctx {
  user: AuthUserLike | null;
  firebaseUser: FirebaseUser | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isBanned: boolean;
  banReason: string | null;
  refreshStatus: () => Promise<void>;
  signOut: () => Promise<void>;
}
const AuthContext = createContext<Ctx>({
  user: null, firebaseUser: null, session: null, loading: true,
  isAdmin: false, isBanned: false, banReason: null,
  refreshStatus: async () => {}, signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState<string | null>(null);
  const bridging = useRef<string | null>(null);
  const bridge = useServerFn(bridgeFirebaseSession);

  // Track Supabase session (established behind the scenes after bridging).
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Firebase is the source of truth for identity.
  useEffect(() => {
    const unsub = onIdTokenChanged(firebaseAuth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setLoading(false);
        if (session) await supabase.auth.signOut();
        return;
      }
      try {
        const idToken = await fbUser.getIdToken();
        // Skip if we already bridged this exact token/user.
        if (bridging.current === fbUser.uid && session?.user?.email === fbUser.email) {
          setLoading(false);
          return;
        }
        bridging.current = fbUser.uid;
        const { email, tokenHash } = await bridge({
          data: { idToken, fullName: fbUser.displayName ?? undefined },
        });
        const { error } = await supabase.auth.verifyOtp({
          email,
          token_hash: tokenHash,
          type: "magiclink",
        });
        if (error) console.error("[auth] bridge verifyOtp failed", error);
      } catch (err) {
        console.error("[auth] Firebase→Supabase bridge failed", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadStatus(uid: string) {
    const [{ data: role }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle(),
      supabase.from("profiles").select("is_banned,ban_reason").eq("id", uid).maybeSingle(),
    ]);
    setIsAdmin(!!role);
    setIsBanned(!!profile?.is_banned);
    setBanReason(profile?.ban_reason ?? null);
  }

  useEffect(() => {
    if (!session?.user) { setIsAdmin(false); setIsBanned(false); setBanReason(null); return; }
    loadStatus(session.user.id);
  }, [session?.user?.id]);

  const refreshStatus = async () => { if (session?.user) await loadStatus(session.user.id); };

  async function signOut() {
    try { await fbSignOut(firebaseAuth); } catch {}
    try { await supabase.auth.signOut(); } catch {}
    bridging.current = null;
  }

  const user: AuthUserLike | null = session?.user
    ? {
        id: session.user.id,
        email: session.user.email ?? firebaseUser?.email ?? null,
        user_metadata: session.user.user_metadata ?? {},
      }
    : null;

  return (
    <AuthContext.Provider value={{
      user, firebaseUser, session, loading,
      isAdmin, isBanned, banReason, refreshStatus, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() { return useContext(AuthContext); }
