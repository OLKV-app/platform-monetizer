import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { GlobalNotificationListener } from "@/components/GlobalNotificationListener";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    // Block banned users from every protected page except the appeal page
    if (!location.pathname.startsWith("/banned")) {
      const { data: profile } = await supabase
        .from("profiles").select("is_banned").eq("id", data.user.id).maybeSingle();
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
