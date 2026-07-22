import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { attachProfiles } from "@/lib/attach-profiles";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/verification")({ component: AdminVerification });

function AdminVerification() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["admin-verification"],
    queryFn: async () => {
      const { data: reqs } = await supabase.from("verification_requests").select("*").order("created_at", { ascending: false });
      const { fetchProfilesByIds } = await import("@/lib/attach-profiles");
      const profiles = await fetchProfilesByIds((reqs ?? []).map((r) => r.user_id));
      return attachProfiles(reqs ?? [], "user_id", profiles, "profile");
    },
  });

  async function decide(id: string, userId: string, status: "approved" | "rejected" | "more_info", note?: string) {
    const patch: any = { status, admin_notes: note ?? null, reviewed_by: user?.id, reviewed_at: new Date().toISOString() };
    const { error } = await supabase.from("verification_requests").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    if (status === "approved") {
      await supabase.from("profiles").update({ verified_seller: true }).eq("id", userId);
    }
    await supabase.from("audit_logs").insert({ admin_id: user?.id, action: `verification.${status}`, target_type: "verification_request", target_id: id });
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["admin-verification"] });
  }

  const statusCls: Record<string, string> = {
    pending: "bg-primary/15 text-primary", approved: "bg-accent/15 text-accent",
    rejected: "bg-destructive/15 text-destructive", more_info: "bg-primary/15 text-primary",
  };

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold">Verification requests</h1>
      <div className="space-y-3">
        {data.map((r: any) => (
          <div key={r.id} className="rounded-2xl bg-surface p-4 ring-1 ring-border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">{r.full_name ?? r.profile?.full_name ?? r.user_id}</div>
                <div className="text-xs text-muted-foreground">{r.profile?.phone ?? ""} • Submitted {new Date(r.created_at).toLocaleString()}</div>
              </div>
              <span className={"rounded px-2 py-0.5 text-[10px] font-bold uppercase " + (statusCls[r.status] ?? "bg-muted")}>{r.status}</span>
            </div>
            <div className="mt-2 space-y-1 text-xs">
              <div>ID doc: <a href={r.id_document_url} target="_blank" rel="noreferrer" className="text-primary underline">open</a></div>
              {r.address_document_url && <div>Address doc: <a href={r.address_document_url} target="_blank" rel="noreferrer" className="text-primary underline">open</a></div>}
              {r.notes && <div className="text-muted-foreground">Notes: {r.notes}</div>}
            </div>
            {r.status === "pending" && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => decide(r.id, r.user_id, "approved")}>Approve</Button>
                <Button size="sm" variant="outline" onClick={() => { const n = prompt("Rejection reason?") ?? ""; decide(r.id, r.user_id, "rejected", n); }}>Reject</Button>
                <Button size="sm" variant="outline" onClick={() => { const n = prompt("What info do you need?") ?? ""; decide(r.id, r.user_id, "more_info", n); }}>Request more info</Button>
              </div>
            )}
          </div>
        ))}
        {!data.length && <p className="rounded-xl bg-surface p-4 text-center text-xs text-muted-foreground ring-1 ring-border">No requests.</p>}
      </div>
    </div>
  );
}
