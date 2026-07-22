import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/appeals")({ component: AdminAppeals });

function AdminAppeals() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data = [] } = useQuery({
    queryKey: ["admin-appeals", filter],
    queryFn: async () => {
      let q = supabase.from("appeals").select("*").order("created_at", { ascending: false }).limit(200);
      if (filter !== "all") q = q.eq("status", filter);
      const { data: rows, error } = await q;
      if (error) {
        console.error("[admin-appeals]", error);
        return [];
      }
      const { fetchProfilesByIds, attachProfiles } = await import("@/lib/attach-profiles");
      const profs = await fetchProfilesByIds((rows ?? []).map((r: any) => r.user_id));
      return attachProfiles(rows ?? [], "user_id", profs);
    },
  });

  async function decide(id: string, userId: string, action: "approved" | "rejected") {
    const note = notes[id]?.trim() || null;
    const { error } = await supabase.from("appeals").update({
      status: action, admin_note: note, resolved_by: user?.id, resolved_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) return toast.error(error.message);
    if (action === "approved") {
      const { error: e2 } = await supabase.from("profiles")
        .update({ is_banned: false, ban_reason: null, banned_at: null }).eq("id", userId);
      if (e2) return toast.error(e2.message);
      toast.success("Appeal approved — user unbanned");
    } else {
      toast.success("Appeal rejected");
    }
    qc.invalidateQueries({ queryKey: ["admin-appeals"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {(["pending","approved","rejected","all"] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={"rounded-full px-3 py-1 text-xs font-semibold ring-1 " +
            (filter === s ? "bg-primary text-primary-foreground ring-primary" : "bg-surface ring-border")}>{s}</button>
        ))}
      </div>
      <div className="space-y-3">
        {data.map((a: any) => (
          <div key={a.id} className="rounded-2xl bg-surface p-4 ring-1 ring-border">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="line-clamp-1 font-semibold">{a.profiles?.full_name ?? "user"}</div>
                <div className="text-xs text-muted-foreground">{a.profiles?.phone ?? "—"} • {timeAgo(a.created_at)}</div>
              </div>
              <span className={
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase " +
                (a.status === "approved" ? "bg-accent/20 text-accent-foreground"
                 : a.status === "rejected" ? "bg-destructive/10 text-destructive"
                 : "bg-primary/10 text-primary")
              }>{a.status}</span>
            </div>
            {a.profiles?.ban_reason && (
              <div className="mt-2 text-xs text-muted-foreground"><b>Ban reason:</b> {a.profiles.ban_reason}</div>
            )}
            <div className="mt-2 rounded-lg bg-background p-3 text-sm ring-1 ring-border">{a.reason}</div>
            {a.admin_note && (
              <div className="mt-2 text-xs text-muted-foreground"><b>Note:</b> {a.admin_note}</div>
            )}
            {a.status === "pending" && (
              <div className="mt-3 space-y-2">
                <Textarea rows={2} placeholder="Note to user (optional)"
                  value={notes[a.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [a.id]: e.target.value }))} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => decide(a.id, a.user_id, "approved")}>Approve & unban</Button>
                  <Button size="sm" variant="destructive" onClick={() => decide(a.id, a.user_id, "rejected")}>Reject</Button>
                </div>
              </div>
            )}
          </div>
        ))}
        {data.length === 0 && (
          <p className="rounded-2xl bg-surface p-8 text-center text-sm text-muted-foreground ring-1 ring-border">
            Nothing here.
          </p>
        )}
      </div>
    </div>
  );
}
