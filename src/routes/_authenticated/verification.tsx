import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { charge } from "@/lib/payments";
import { getSetting } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/verification")({ component: Verification });

function Verification() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ full_name: "", id_document_url: "", address_document_url: "", notes: "" });
  const [busy, setBusy] = useState(false);

  const { data: existing } = useQuery({
    queryKey: ["my-verif", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("verification_requests").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(1).maybeSingle()).data,
  });

  const { data: fee } = useQuery({ queryKey: ["verif-fee"], queryFn: () => getSetting("verification_fee", { price: 0 }) });

  async function submit() {
    if (!user) return;
    if (!form.full_name.trim()) return toast.error("Enter your full legal name");
    if (!form.id_document_url.trim()) return toast.error("Add a link/URL for your ID document (upload flow ships with Firebase Storage)");
    setBusy(true);
    try {
      let feeTxnId: string | null = null;
      if ((fee?.price ?? 0) > 0) {
        const t = await charge({ userId: user.id, amount: fee!.price, purpose: "verification" });
        feeTxnId = t.id;
      }
      const { error } = await supabase.from("verification_requests").insert({
        user_id: user.id, full_name: form.full_name.trim(), id_document_url: form.id_document_url.trim(),
        address_document_url: form.address_document_url.trim() || null, notes: form.notes.trim() || null,
        fee_transaction_id: feeTxnId, status: "pending",
      });
      if (error) throw error;
      toast.success("Verification request submitted");
      qc.invalidateQueries({ queryKey: ["my-verif"] });
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  const statusCls: Record<string, string> = {
    pending: "bg-primary/15 text-primary",
    approved: "bg-accent/15 text-accent",
    rejected: "bg-destructive/15 text-destructive",
    more_info: "bg-primary/15 text-primary",
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <TopBar subtitle="Seller verification" />
      <main className="mx-auto max-w-[430px] space-y-4 px-4 pt-4">
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 p-5 ring-1 ring-primary/20">
          <ShieldCheck className="size-6 text-primary" />
          <h1 className="mt-2 font-heading text-xl font-bold">Get verified</h1>
          <p className="mt-1 text-xs text-muted-foreground">Verified sellers get a trust badge on their profile and every listing.</p>
        </div>

        {existing ? (
          <section className="rounded-2xl bg-surface p-4 ring-1 ring-border">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Your request</div>
              <span className={"rounded px-2 py-0.5 text-[10px] font-bold uppercase " + (statusCls[existing.status] ?? "bg-muted")}>{existing.status}</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">Submitted {new Date(existing.created_at).toLocaleString()}</div>
            {existing.admin_notes && <p className="mt-2 rounded-lg bg-muted p-2 text-xs">Admin: {existing.admin_notes}</p>}
          </section>
        ) : (
          <section className="space-y-3 rounded-2xl bg-surface p-4 ring-1 ring-border">
            <div><Label>Full legal name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><Label>ID document URL</Label><Input value={form.id_document_url} onChange={(e) => setForm({ ...form, id_document_url: e.target.value })} placeholder="https://..." /></div>
            <div><Label>Address proof URL (optional)</Label><Input value={form.address_document_url} onChange={(e) => setForm({ ...form, address_document_url: e.target.value })} /></div>
            <div><Label>Notes for admin (optional)</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <Button className="w-full" disabled={busy} onClick={submit}>{busy ? "Submitting…" : "Submit request"}</Button>
          </section>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
