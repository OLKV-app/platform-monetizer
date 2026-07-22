import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { playNotificationSound, primeNotificationSound } from "@/lib/notification-sound";

export function GlobalNotificationListener() {
  const { user } = useAuth();

  // Unlock audio playback on the first interaction anywhere in the app.
  useEffect(() => {
    const unlock = () => primeNotificationSound();
    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  // One subscription for every kind of notification (new chat messages,
  // favourites, listing status changes, etc.) — they all insert into the
  // same `notifications` table via DB triggers, so listening here covers
  // all of them without needing a separate subscription per feature.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("global-notif-sound-" + user.id)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n: any = payload.new;
          playNotificationSound();
          toast(n.title, {
            description: n.body || undefined,
            action: n.link
              ? { label: "View", onClick: () => window.location.assign(n.link) }
              : undefined,
          });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  return null;
}
