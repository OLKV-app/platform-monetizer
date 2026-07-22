import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Ctx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isBanned: boolean;
  banReason: string | null;
  refreshStatus: () => Promise<void>;
}
const AuthContext = createContext<Ctx>({
  user: null, session: null, loading: true, isAdmin: false,
  isBanned: false, banReason: null, refreshStatus: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState<string | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
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

  return (
    <AuthContext.Provider value={{
      user: session?.user ?? null, session, loading,
      isAdmin, isBanned, banReason, refreshStatus,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() { return useContext(AuthContext); }
