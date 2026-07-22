import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { formatINR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/payments")({ component: Payments });

function Payments() {
  const { user } = useAuth();
  const { data = [] } = useQuery({
    queryKey: ["my-txns", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("transactions").select("*").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const statusCls: Record<string, string> = {
    paid: "bg-accent/15 text-accent",
    pending: "bg-primary/15 text-primary",
    failed: "bg-destructive/15 text-destructive",
    refunded: "bg-muted text-muted-foreground",
    cancelled: "bg-muted text-muted-foreground",
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <TopBar subtitle="Payment history" />
      <main className="mx-auto max-w-[430px] space-y-3 px-4 pt-4">
        <h1 className="font-heading text-2xl font-bold">Payment history</h1>
        {data.length === 0 && <p className="rounded-2xl bg-surface p-8 text-center text-sm text-muted-foreground ring-1 ring-border">No transactions yet.</p>}
        {data.map((t: any) => (
          <div key={t.id} className="rounded-2xl bg-surface p-4 ring-1 ring-border">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold capitalize">{t.purpose.replace("_", " ")}</div>
              <span className={"rounded px-2 py-0.5 text-[10px] font-bold uppercase " + (statusCls[t.status] ?? "bg-muted")}>{t.status}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
              <div className="text-base font-bold text-primary">{formatINR(t.amount)}</div>
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground">Invoice: {t.invoice_number ?? "—"} • Provider: {t.provider}</div>
          </div>
        ))}
      </main>
      <BottomNav />
    </div>
  );
}
