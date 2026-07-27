import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { auth } from "@/lib/firebase";
import { supabase } from "@/integrations/supabase/client";
import { GlobalNotificationListener } from "@/components/GlobalNotificationListener";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    await auth.authStateReady();
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    // Block banned users from every protected page except the appeal page
    if (!location.pathname.startsWith("/banned")) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("is_banned, full_name")
            .eq("id", session.user.id)
            .maybeSingle();
          if (profile?.is_banned) throw redirect({ to: "/banned" });
          const needsProfile = !profile?.full_name || profile.full_name.trim() === "";
          if (needsProfile && !location.pathname.startsWith("/complete-profile")) {
            throw redirect({ to: "/complete-profile" });
          }
        }
      } catch (error) {
        if (error instanceof Error && 'location' in error) throw error;
        console.error("[_authenticated beforeLoad] Failed to check profile status:", error);
      }
    }
  },
  component: () => (
    <>
      <GlobalNotificationListener />
      <Outlet />
    </>
  ),
});
