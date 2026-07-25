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
        // Get the Supabase UUID from the session to query profiles
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("is_banned")
            .eq("id", session.user.id)
            .maybeSingle();
          if (profile?.is_banned) throw redirect({ to: "/banned" });
        }
      } catch (error) {
        // Log errors for debugging, but don't fail the redirect
        // loadStatus() in useAuth() will check ban status on page load
        if (error instanceof Error && 'location' in error) {
          // This is a redirect, re-throw it
          throw error;
        }
        console.error("[_authenticated beforeLoad] Failed to check ban status:", error);
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
