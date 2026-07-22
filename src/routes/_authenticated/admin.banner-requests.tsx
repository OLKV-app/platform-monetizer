import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { timeAgo } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/banner-requests")({ component: AdminBannerRequests });

function AdminBannerRequests() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "live" | "all">("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data = [] } = useQuery({
    queryKey: ["admin-banner-requests", filter],
    queryFn: async () => {
      let q = supabase
        .from("banner_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) {
        console.error("[admin-banner-requests]", error);
        return [];
      }
      const { fetchProfilesByIds, attachProfiles } = await import("@/lib/attach-profiles");
      const profs = await fetchProfilesByIds((data ?? []).map((r: any) => r.user_id));
      return attachProfiles(data ?? [], "user_id", profs);
    },
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin-banner-requests"] });
    qc.invalidateQueries({ queryKey: ["banners"] });
  }

  async function update(id: string, status: "approved" | "rejected") {
    const { error } = await supabase.from("banner_requests").update({
      status, admin_note: notes[id] ?? null,
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status);
    invalidate();
  }

  async function publish(r: any) {
    const start = new Date();
    const end = new Date(start.getTime() + Number(r.duration_days ?? 7) * 86400000);
    const { error: bErr } = await supabase.from("banners").insert({
      title: r.title, subtitle: r.description ?? "", image_url: r.image_url,
      link_url: r.link_url, position: 100, active: true,
      banner_type: "promotional",
      starts_at: start.toISOString(), ends_at: end.toISOString(),
    });
    if (bErr) return toast.error(bErr.message);
    const { error } = await supabase.from("banner_requests").update({
      status: "live", scheduled_start: start.toISOString(), scheduled_end: end.toISOString(),
    }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Banner is now live");
    invalidate();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-bold">Banner requests</h2>
        <div className="flex flex-wrap gap-1.5">
          {(["pending", "approved", "rejected", "live", "all"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={"rounded-full px-3 py-1 text-xs font-semibold ring-1 " + (filter === s ? "bg-primary text-primary-foreground ring-primary" : "bg-surface ring-border")}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {data.map((r: any) => (
        <div key={r.id} className="rounded-2xl bg-surface p-4 ring-1 ring-border">
          <div className="flex flex-wrap items-start gap-3">
            <img src={r.image_url} alt="" className="h-20 w-36 shrink-0 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{r.title}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase">{r.status}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {r.profiles?.full_name ?? "—"} • {r.duration_days} days • {timeAgo(r.created_at)}
              </div>
              {r.description && <p className="mt-1 text-sm">{r.description}</p>}
              {r.link_url && <a href={r.link_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">{r.link_url}</a>}
              {r.notes && <p className="mt-1 rounded-lg bg-muted p-2 text-xs">Note from seller: {r.notes}</p>}
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <Textarea
              placeholder="Optional admin note to the requester"
              value={notes[r.id] ?? r.admin_note ?? ""}
              onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
              className="text-sm"
            />
            <div className="flex flex-wrap gap-2">
              {r.status !== "approved" && r.status !== "live" && <Button size="sm" onClick={() => update(r.id, "approved")}>Approve</Button>}
              {r.status !== "rejected" && <Button size="sm" variant="outline" onClick={() => update(r.id, "rejected")}>Reject</Button>}
              {r.status !== "live" && <Button size="sm" variant="outline" onClick={() => publish(r)}>Publish now</Button>}
            </div>
          </div>
        </div>
      ))}
      {data.length === 0 && <p className="rounded-2xl bg-surface p-8 text-center text-sm text-muted-foreground ring-1 ring-border">No requests.</p>}
    </div>
  );
}
