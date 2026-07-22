import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/notifications")({ component: NotificationsPage });

function NotificationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50)).data ?? [],
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("notif-" + user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["notifications"] });
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, qc]);

  useEffect(() => {
    const unread = data.filter((n: any) => !n.read).map((n: any) => n.id);
    if (unread.length) supabase.from("notifications").update({ read: true }).in("id", unread);
  }, [data]);

  return (
    <div className="min-h-screen bg-background pb-28">
      <TopBar subtitle="Notifications" />
      <main className="mx-auto max-w-[430px] space-y-2 px-4 pt-4">
        <h1 className="font-heading text-2xl font-bold">Notifications</h1>
        {data.length === 0 ? (
          <p className="rounded-2xl bg-surface p-8 text-center text-sm text-muted-foreground ring-1 ring-border">No notifications yet.</p>
        ) : data.map((n: any) => (
          <Link key={n.id} to={n.link ?? "/"} className="block rounded-2xl bg-surface p-4 ring-1 ring-border">
            <div className="text-sm font-semibold">{n.title}</div>
            {n.body && <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</div>}
            <div className="mt-1 text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</div>
          </Link>
        ))}
      </main>
      <BottomNav />
    </div>
  );
}
