import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { firebaseAuth } from "@/integrations/firebase/client";
import { GlobalNotificationListener } from "@/components/GlobalNotificationListener";

// Wait briefly for Firebase to restore its session on hard refresh, then for
// the Firebase→Supabase bridge (kicked off by AuthProvider) to establish the
// Supabase session used by RLS.
function waitForFirebase(): Promise<import("firebase/auth").User | null> {
  return new Promise((resolve) => {
    if (firebaseAuth.currentUser) return resolve(firebaseAuth.currentUser);
    const unsub = firebaseAuth.onAuthStateChanged((u) => { unsub(); resolve(u); });
    setTimeout(() => { try { unsub(); } catch {}; resolve(firebaseAuth.currentUser); }, 2500);
  });
}
async function waitForSupabaseSession(timeoutMs = 4000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session;
    await new Promise((r) => setTimeout(r, 150));
  }
  return null;
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const fbUser = await waitForFirebase();
    if (!fbUser) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    const session = await waitForSupabaseSession();
    if (!session) {
      // Bridge in flight or failed — send to /auth so it can be re-established.
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    if (!location.pathname.startsWith("/banned")) {
      const { data: profile } = await supabase
        .from("profiles").select("is_banned").eq("id", session.user.id).maybeSingle();
      if (profile?.is_banned) throw redirect({ to: "/banned" });
    }
  },
  component: () => (
    <>
      <GlobalNotificationListener />
      <Outlet />
    </>
  ),
});
