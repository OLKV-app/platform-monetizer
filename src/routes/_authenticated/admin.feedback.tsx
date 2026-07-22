import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/feedback")({ component: AdminFeedback });

function AdminFeedback() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"open" | "answered" | "closed" | "all">("open");
  const [replying, setReplying] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const { data = [] } = useQuery({
    queryKey: ["admin-feedback", filter],
    queryFn: async () => {
      let q = supabase.from("feedback").select("*").order("created_at", { ascending: false }).limit(200);
      if (filter !== "all") q = q.eq("status", filter);
      const { data: rows, error } = await q;
      if (error) {
        console.error("[admin-feedback]", error);
        return [];
      }
      const { fetchProfilesByIds, attachProfiles } = await import("@/lib/attach-profiles");
      const profs = await fetchProfilesByIds((rows ?? []).map((r: any) => r.user_id));
      return attachProfiles(rows ?? [], "user_id", profs);
    },
  });

  async function sendReply(id: string) {
    if (reply.trim().length < 2) return;
    const { error } = await supabase.from("feedback").update({
      admin_reply: reply.trim(), replied_by: user?.id, replied_at: new Date().toISOString(),
      status: "answered",
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Reply sent");
    setReplying(null); setReply("");
    qc.invalidateQueries({ queryKey: ["admin-feedback"] });
  }
  async function close(id: string) {
    await supabase.from("feedback").update({ status: "closed" }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-feedback"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {(["open","answered","closed","all"] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={"rounded-full px-3 py-1 text-xs font-semibold ring-1 " +
            (filter === s ? "bg-primary text-primary-foreground ring-primary" : "bg-surface ring-border")}>{s}</button>
        ))}
      </div>
      <div className="space-y-3">
        {data.map((f: any) => (
          <div key={f.id} className="rounded-2xl bg-surface p-4 ring-1 ring-border">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="line-clamp-1 font-semibold">{f.subject}</div>
                <div className="text-xs text-muted-foreground">
                  {f.profiles?.full_name ?? "user"} • {f.category} • {timeAgo(f.created_at)}
                </div>
              </div>
              <span className={
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase " +
                (f.status === "answered" ? "bg-accent/20 text-accent-foreground"
                 : f.status === "closed" ? "bg-muted text-muted-foreground"
                 : "bg-primary/10 text-primary")
              }>{f.status}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm">{f.message}</p>
            {f.admin_reply && (
              <div className="mt-3 rounded-lg bg-background p-3 text-sm ring-1 ring-border">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Your reply</div>
                <p className="mt-1 whitespace-pre-wrap">{f.admin_reply}</p>
              </div>
            )}
            {replying === f.id ? (
              <div className="mt-3 space-y-2">
                <Textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply to the user…" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => sendReply(f.id)}>Send reply</Button>
                  <Button size="sm" variant="outline" onClick={() => { setReplying(null); setReply(""); }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => { setReplying(f.id); setReply(f.admin_reply ?? ""); }}>
                  {f.admin_reply ? "Edit reply" : "Reply"}
                </Button>
                {f.status !== "closed" && <Button size="sm" variant="outline" onClick={() => close(f.id)}>Close</Button>}
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
