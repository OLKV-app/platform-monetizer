import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatINR, timeAgo } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/listings")({
  component: AdminListings,
});

type Filter = "pending" | "approved" | "rejected" | "hidden" | "pinned" | "featured" | "all";

function AdminListings() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const { data = [] } = useQuery({
    queryKey: ["admin-listings", filter, q],
    queryFn: async () => {
      let query = supabase
        .from("listings")
        .select("*,listing_images(url,position)")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200);
      if (filter === "pending" || filter === "approved" || filter === "rejected") {
        query = query.eq("status", filter);
      } else if (filter === "hidden") query = query.eq("is_hidden", true);
      else if (filter === "pinned") query = query.eq("is_pinned", true);
      else if (filter === "featured") query = query.eq("featured", true);
      if (q.trim()) query = query.ilike("title", `%${q.trim()}%`);
      const { data, error } = await query;
      if (error) {
        console.error("[admin-listings]", error);
        return [];
      }
      const { fetchProfilesByIds, attachProfiles } = await import("@/lib/attach-profiles");
      const profs = await fetchProfilesByIds((data ?? []).map((r: any) => r.user_id));
      return attachProfiles(data ?? [], "user_id", profs);
    },
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin-listings"] });
    qc.invalidateQueries({ queryKey: ["listings"] });
  }

  async function setStatus(id: string, status: "approved" | "rejected") {
    const { error } = await supabase.from("listings").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "approved" ? "Approved" : "Rejected");
    invalidate();
  }
  async function del(id: string) {
    if (!confirm("Delete this listing?")) return;
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    invalidate();
  }
  async function toggle(id: string, field: "featured" | "is_pinned" | "is_hidden", cur: boolean) {
    const patch: Record<string, boolean> = { [field]: !cur };
    const { error } = await supabase
      .from("listings")
      .update(patch as never)
      .eq("id", id);
    if (error) return toast.error(error.message);
    invalidate();
  }

  const filters: Filter[] = [
    "all",
    "pending",
    "approved",
    "rejected",
    "hidden",
    "pinned",
    "featured",
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by title…"
          className="w-full rounded-full bg-surface px-4 py-2 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-primary/30 sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-1.5">
          {filters.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={
                "rounded-full px-3 py-1 text-xs font-semibold ring-1 " +
                (filter === s
                  ? "bg-primary text-primary-foreground ring-primary"
                  : "bg-surface ring-border")
              }
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {data.map((l: any) => {
          const img = l.listing_images?.sort((a: any, b: any) => a.position - b.position)[0]?.url;
          return (
            <div
              key={l.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-border"
            >
              <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                {img && <img src={img} alt="" className="size-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="line-clamp-1 font-semibold">{l.title}</span>
                  {l.is_pinned && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      PINNED
                    </span>
                  )}
                  {l.featured && (
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
                      FEATURED
                    </span>
                  )}
                  {l.is_hidden && (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                      HIDDEN
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {l.profiles?.full_name} • {l.island} • {timeAgo(l.created_at)} •{" "}
                  {l.view_count ?? 0} views
                </div>
                <div className="mt-0.5 text-sm font-semibold text-primary">
                  {formatINR(l.price)}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {l.status !== "approved" && (
                  <Button size="sm" onClick={() => setStatus(l.id, "approved")}>
                    Approve
                  </Button>
                )}
                {l.status !== "rejected" && (
                  <Button size="sm" variant="outline" onClick={() => setStatus(l.id, "rejected")}>
                    Reject
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggle(l.id, "featured", l.featured)}
                >
                  {l.featured ? "Unfeature" : "Feature"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggle(l.id, "is_pinned", l.is_pinned)}
                >
                  {l.is_pinned ? "Unpin" : "Pin"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggle(l.id, "is_hidden", l.is_hidden)}
                >
                  {l.is_hidden ? "Unhide" : "Hide"}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => del(l.id)}>
                  Delete
                </Button>
              </div>
            </div>
          );
        })}
        {data.length === 0 && (
          <p className="rounded-2xl bg-surface p-8 text-center text-sm text-muted-foreground ring-1 ring-border">
            Nothing here.
          </p>
        )}
      </div>
    </div>
  );
}
