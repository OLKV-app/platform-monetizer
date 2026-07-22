import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/monetization")({ component: Monetization });

function Monetization() {
  const { data } = useQuery({
    queryKey: ["admin-monetization"],
    queryFn: async () => {
      const { data: txns } = await supabase.from("transactions").select("*").eq("status", "paid").order("created_at", { ascending: false });
      return txns ?? [];
    },
  });

  const now = new Date();
  const day = 86400_000;
  const sumSince = (ms: number) => (data ?? []).filter((t) => new Date(t.created_at).getTime() >= now.getTime() - ms).reduce((s, t) => s + Number(t.amount), 0);
  const revToday = sumSince(day);
  const revWeek = sumSince(7 * day);
  const revMonth = sumSince(30 * day);
  const revYear = sumSince(365 * day);

  const byPurpose = (data ?? []).reduce<Record<string, { count: number; total: number }>>((acc, t) => {
    acc[t.purpose] = acc[t.purpose] ?? { count: 0, total: 0 };
    acc[t.purpose].count += 1;
    acc[t.purpose].total += Number(t.amount);
    return acc;
  }, {});

  function exportCSV() {
    const rows = [["date", "user_id", "purpose", "amount", "currency", "provider", "invoice", "status"]];
    (data ?? []).forEach((t) => rows.push([t.created_at, t.user_id, t.purpose, String(t.amount), t.currency, t.provider, t.invoice_number ?? "", t.status]));
    const csv = rows.map((r) => r.map((c) => `"${(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `revenue-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  const Card = ({ label, value }: { label: string; value: string }) => (
    <div className="rounded-2xl bg-surface p-4 ring-1 ring-border">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-heading text-xl font-bold text-primary">{value}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Monetization</h1>
        <Button variant="outline" size="sm" onClick={exportCSV}><Download className="size-3.5" /> CSV</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card label="Revenue today" value={formatINR(revToday)} />
        <Card label="This week" value={formatINR(revWeek)} />
        <Card label="This month" value={formatINR(revMonth)} />
        <Card label="This year" value={formatINR(revYear)} />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">By purpose</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {Object.entries(byPurpose).map(([k, v]) => (
            <div key={k} className="rounded-xl bg-surface p-3 ring-1 ring-border">
              <div className="text-xs capitalize text-muted-foreground">{k.replace("_", " ")}</div>
              <div className="mt-1 text-lg font-bold text-primary">{formatINR(v.total)}</div>
              <div className="text-[10px] text-muted-foreground">{v.count} purchases</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Recent transactions</h2>
        <div className="space-y-2">
          {(data ?? []).slice(0, 30).map((t: any) => (
            <div key={t.id} className="flex items-center justify-between rounded-xl bg-surface p-3 ring-1 ring-border">
              <div>
                <div className="text-sm font-semibold capitalize">{t.purpose.replace("_", " ")}</div>
                <div className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleString()} • {t.invoice_number}</div>
              </div>
              <div className="text-sm font-bold text-primary">{formatINR(t.amount)}</div>
            </div>
          ))}
          {!data?.length && <p className="rounded-xl bg-surface p-4 text-center text-xs text-muted-foreground ring-1 ring-border">No revenue yet.</p>}
        </div>
      </section>
    </div>
  );
}
