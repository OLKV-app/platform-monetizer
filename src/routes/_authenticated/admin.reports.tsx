import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/reports")({ component: AdminReports });

function AdminReports() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) {
        console.error("[admin-reports]", error);
        return [];
      }
      const listingIds = Array.from(new Set((rows ?? []).map((r: any) => r.listing_id).filter(Boolean)));
      const [listingsRes, profs] = await Promise.all([
        listingIds.length
          ? supabase.from("listings").select("id,title").in("id", listingIds)
          : Promise.resolve({ data: [] as any[], error: null }),
        (await import("@/lib/attach-profiles")).fetchProfilesByIds(
          (rows ?? []).map((r: any) => r.reporter_id),
        ),
      ]);
      const lmap = new Map((listingsRes.data ?? []).map((l: any) => [l.id, l]));
      return (rows ?? []).map((r: any) => ({
        ...r,
        listings: lmap.get(r.listing_id) ?? null,
        profiles: (r.reporter_id && profs.get(r.reporter_id)) || null,
      }));
    },
  });
  async function resolve(id: string) {
    await supabase.from("reports").update({ resolved: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-reports"] });
  }
  return (
    <div className="space-y-3">
      <h2 className="font-heading text-xl font-bold">Reports</h2>
      {data.map((r: any) => (
        <div key={r.id} className="rounded-2xl bg-surface p-4 ring-1 ring-border">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wide text-destructive">{r.reason}</div>
            <div className="text-[10px] text-muted-foreground">{timeAgo(r.created_at)}</div>
          </div>
          {r.listings && <Link to="/product/$id" params={{ id: r.listings.id }} className="mt-1 block text-sm font-semibold text-primary">{r.listings.title}</Link>}
          <div className="text-xs text-muted-foreground">Reported by {r.profiles?.full_name ?? "—"}</div>
          {r.details && <p className="mt-2 rounded-lg bg-muted p-2 text-xs">{r.details}</p>}
          <div className="mt-2 flex gap-2">
            {!r.resolved ? <Button size="sm" onClick={() => resolve(r.id)}>Mark resolved</Button> : <span className="text-xs font-semibold text-accent">Resolved</span>}
          </div>
        </div>
      ))}
      {data.length === 0 && <p className="rounded-2xl bg-surface p-8 text-center text-sm text-muted-foreground ring-1 ring-border">No reports.</p>}
    </div>
  );
}
