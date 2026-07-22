import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { auth } from "@/lib/firebase";
import { supabase } from "@/integrations/supabase/client";
import { GlobalNotificationListener } from "@/components/GlobalNotificationListener";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    await auth.authStateReady();
    const user = auth.currentUser;
    if (!user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    // Block banned users from every protected page except the appeal page
    if (!location.pathname.startsWith("/banned")) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_banned")
          .eq("id", user.uid)
          .maybeSingle();
        if (profile?.is_banned) throw redirect({ to: "/banned" });
      } catch {
        // ignore error
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

