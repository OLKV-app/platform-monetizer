import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { charge } from "@/lib/payments";
import { getSetting } from "@/lib/settings";
import { formatINR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, Sparkles, TrendingUp, ShieldCheck, Crown, Building2, Ban } from "lucide-react";

export const Route = createFileRoute("/_authenticated/store")({ component: Store });

function Store() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: plans = [] } = useQuery({
    queryKey: ["plans-active"],
    queryFn: async () => (await supabase.from("subscription_plans").select("*").eq("is_active", true).order("sort_order")).data ?? [],
  });

  const { data: prices } = useQuery({
    queryKey: ["store-prices"],
    queryFn: async () => ({
      featured: await getSetting("featured_price", { price: 49, duration_days: 7 }),
      bump: await getSetting("bump_price", { price: 19, cooldown_hours: 24, daily_limit: 3 }),
      verification: await getSetting("verification_fee", { price: 0 }),
    }),
  });

  async function buyPlan(plan: any) {
    if (!user) return;
    try {
      const txn = await charge({ userId: user.id, amount: Number(plan.price), purpose: plan.tier === "ad_free" ? "ad_free" : "subscription", meta: { plan_code: plan.code } });
      const expiry = new Date(Date.now() + plan.duration_days * 86400_000).toISOString();
      const { error } = await supabase.from("subscriptions").insert({
        user_id: user.id, plan_id: plan.id, transaction_id: txn.id, expiry_date: expiry, status: "active",
      });
      if (error) throw error;
      const patch: any = { subscription_tier: plan.tier };
      if (plan.ad_free) patch.ad_free_until = expiry;
      await supabase.from("profiles").update(patch).eq("id", user.id);
      toast.success(`${plan.name} activated`);
      qc.invalidateQueries();
    } catch (e: any) {
      toast.error(e.message ?? "Purchase failed");
    }
  }

  const icons: Record<string, any> = { free: Sparkles, ad_free: Ban, premium: Crown, business: Building2 };

  return (
    <div className="min-h-screen bg-background pb-28">
      <TopBar subtitle="Promotion store" />
      <main className="mx-auto max-w-[430px] space-y-6 px-4 pt-4">
        <h1 className="font-heading text-2xl font-bold">Store</h1>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Subscription plans</h2>
          {plans.map((p: any) => {
            const Ico = icons[p.tier] ?? Sparkles;
            const highlight = p.tier === "premium" || p.tier === "business";
            return (
              <div key={p.id} className={"rounded-2xl p-4 ring-1 " + (highlight ? "bg-gradient-to-br from-primary/10 to-accent/10 ring-primary/30" : "bg-surface ring-border")}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Ico className="size-4 text-primary" />
                      <span className="font-heading text-lg font-bold">{p.name}</span>
                    </div>
                    <div className="mt-1 text-2xl font-bold text-primary">{p.price > 0 ? formatINR(p.price) : "Free"}<span className="text-xs font-normal text-muted-foreground"> / {p.duration_days}d</span></div>
                  </div>
                  {p.price > 0 && <Button size="sm" onClick={() => buyPlan(p)}>Buy</Button>}
                </div>
                <ul className="mt-3 space-y-1.5">
                  {(p.benefits ?? []).map((b: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-xs"><Check className="mt-0.5 size-3.5 shrink-0 text-accent" /> <span>{b}</span></li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Promotions</h2>
          <div className="rounded-2xl bg-surface p-4 ring-1 ring-border">
            <div className="flex items-center gap-2"><TrendingUp className="size-4 text-primary" /><span className="font-semibold">Featured listing</span></div>
            <p className="mt-1 text-xs text-muted-foreground">Boost a listing to the top of Home, Search and Category pages for {prices?.featured?.duration_days ?? 7} days.</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-lg font-bold text-primary">{formatINR(prices?.featured?.price ?? 49)}</span>
              <Link to="/my-ads" className="text-xs font-semibold text-primary">Pick a listing →</Link>
            </div>
          </div>

          <div className="rounded-2xl bg-surface p-4 ring-1 ring-border">
            <div className="flex items-center gap-2"><Sparkles className="size-4 text-primary" /><span className="font-semibold">Bump listing</span></div>
            <p className="mt-1 text-xs text-muted-foreground">Refresh a listing to the top of the feed. Cooldown {prices?.bump?.cooldown_hours ?? 24}h.</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-lg font-bold text-primary">{formatINR(prices?.bump?.price ?? 19)}</span>
              <Link to="/my-ads" className="text-xs font-semibold text-primary">Pick a listing →</Link>
            </div>
          </div>

          <div className="rounded-2xl bg-surface p-4 ring-1 ring-border">
            <div className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /><span className="font-semibold">Verified seller</span></div>
            <p className="mt-1 text-xs text-muted-foreground">Get a trust badge on your profile and listings after admin review.</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-lg font-bold text-primary">{prices?.verification?.price ? formatINR(prices.verification.price) : "Free"}</span>
              <Link to="/verification" className="text-xs font-semibold text-primary">Apply →</Link>
            </div>
          </div>
        </section>

        <div className="flex gap-2">
          <Link to="/subscription" className="flex-1 rounded-xl bg-surface p-3 text-center text-xs font-semibold ring-1 ring-border">My subscription</Link>
          <Link to="/payments" className="flex-1 rounded-xl bg-surface p-3 text-center text-xs font-semibold ring-1 ring-border">Payment history</Link>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
