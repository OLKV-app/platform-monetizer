import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/subscription")({ component: MySub });

function MySub() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["my-subs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: subs } = await supabase.from("subscriptions").select("*").eq("user_id", user!.id).order("expiry_date", { ascending: false });
      if (!subs?.length) return [];
      const planIds = [...new Set(subs.map((s) => s.plan_id))];
      const { data: plans } = await supabase.from("subscription_plans").select("*").in("id", planIds);
      const byId = Object.fromEntries((plans ?? []).map((p) => [p.id, p]));
      return subs.map((s) => ({ ...s, plan: byId[s.plan_id] }));
    },
  });

  async function cancel(id: string) {
    const { error } = await supabase.from("subscriptions").update({ status: "cancelled", auto_renew: false }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Subscription cancelled");
    qc.invalidateQueries({ queryKey: ["my-subs"] });
  }

  const active = data?.find((s) => s.status === "active" && new Date(s.expiry_date) > new Date());

  return (
    <div className="min-h-screen bg-background pb-28">
      <TopBar subtitle="My subscription" />
      <main className="mx-auto max-w-[430px] space-y-4 px-4 pt-4">
        <h1 className="font-heading text-2xl font-bold">My subscription</h1>

        {active ? (
          <section className="rounded-2xl bg-gradient-to-br from-primary to-accent p-5 text-white">
            <div className="text-xs opacity-80">Current plan</div>
            <div className="font-heading text-2xl font-bold">{active.plan?.name}</div>
            <div className="mt-1 text-xs">Expires {new Date(active.expiry_date).toLocaleDateString()}</div>
            <div className="mt-1 text-xs opacity-80">Auto renew: {active.auto_renew ? "On" : "Off"}</div>
            <div className="mt-3 flex gap-2">
              <Link to="/store" className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold">Upgrade</Link>
              <button onClick={() => cancel(active.id)} className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold">Cancel</button>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl bg-surface p-5 ring-1 ring-border">
            <div className="text-sm text-muted-foreground">You're on the Free plan.</div>
            <Link to="/store" className="mt-3 inline-block rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Upgrade</Link>
          </section>
        )}

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">History</h2>
          {(data ?? []).map((s: any) => (
            <div key={s.id} className="flex items-center justify-between rounded-xl bg-surface p-3 ring-1 ring-border">
              <div>
                <div className="text-sm font-semibold">{s.plan?.name ?? "Plan"}</div>
                <div className="text-xs text-muted-foreground">{new Date(s.start_date).toLocaleDateString()} → {new Date(s.expiry_date).toLocaleDateString()}</div>
              </div>
              <span className={"rounded px-2 py-0.5 text-[10px] font-bold uppercase " + (s.status === "active" ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground")}>{s.status}</span>
            </div>
          ))}
          {!data?.length && <p className="rounded-xl bg-surface p-4 text-center text-xs text-muted-foreground ring-1 ring-border">No subscriptions yet.</p>}
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
