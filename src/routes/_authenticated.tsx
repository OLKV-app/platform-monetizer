import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { auth } from "@/lib/firebase";
import { getProfileFromFirestore } from "@/lib/firestore";
import { GlobalNotificationListener } from "@/components/GlobalNotificationListener";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    await auth.authStateReady();
    const user = auth.currentUser;
    if (!user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }

    if (!location.pathname.startsWith("/banned")) {
      try {
        const fsProfile = await getProfileFromFirestore(user.uid, {
          phone: user.phoneNumber,
          email: user.email,
        });

        if (fsProfile?.is_banned) throw redirect({ to: "/banned" });

        if (!fsProfile?.full_name || !fsProfile?.island) {
          throw redirect({ to: "/complete-profile" });
        }
      } catch (err) {
        if ((err as any)?.to) throw err;
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
