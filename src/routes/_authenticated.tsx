import { createFileRoute, Outlet, redirect, isRedirect } from "@tanstack/react-router";
import { auth } from "@/lib/firebase";
import { supabase } from "@/integrations/supabase/client";
import { GlobalNotificationListener } from "@/components/GlobalNotificationListener";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    await auth.authStateReady();
    const user = auth.currentUser;
    if (!user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }

    if (
      !location.pathname.startsWith("/banned") &&
      !location.pathname.startsWith("/complete-profile")
    ) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, island, is_banned")
          .eq("id", user.uid)
          .maybeSingle();

        if (profile?.is_banned) throw redirect({ to: "/banned" });

        if (!profile?.full_name || !profile?.island) {
          throw redirect({ to: "/complete-profile" });
        }
      } catch (err) {
        if (isRedirect(err) || (err as any)?.to) throw err;
        console.warn("Profile guard skipped:", err);
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
