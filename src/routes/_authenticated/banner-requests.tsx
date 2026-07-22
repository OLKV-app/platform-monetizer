import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/banner-requests")({ component: BannerRequestsPage });

const empty = { title: "", description: "", link_url: "", duration_days: 7, notes: "" };

function BannerRequestsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...empty });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const { data = [] } = useQuery({
    queryKey: ["my-banner-requests", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("banner_requests").select("*").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });

  async function submit() {
    if (!user) return;
    if (!file) return toast.error("Upload a banner image");
    if (!form.title) return toast.error("Title required");
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/requests/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("banners").upload(path, file);
      if (upErr) throw upErr;
      const image_url = supabase.storage.from("banners").getPublicUrl(path).data.publicUrl;
      const { error } = await supabase.from("banner_requests").insert({
        user_id: user.id,
        title: form.title,
        description: form.description,
        link_url: form.link_url,
        duration_days: Number(form.duration_days),
        notes: form.notes,
        image_url,
      });
      if (error) throw error;
      toast.success("Request submitted for review");
      setForm({ ...empty });
      setFile(null);
      qc.invalidateQueries({ queryKey: ["my-banner-requests"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <TopBar subtitle="Banner requests" />
      <main className="mx-auto max-w-[430px] space-y-5 px-4 pt-4">
        <h1 className="font-heading text-2xl font-bold">Promote with a banner</h1>
        <p className="text-sm text-muted-foreground">Submit a banner and our team will review it before it goes live on the home page.</p>

        <div className="space-y-2 rounded-2xl bg-surface p-4 ring-1 ring-border">
          <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><Label>Link URL (optional)</Label><Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} /></div>
          <div><Label>Duration (days)</Label><Input type="number" min={1} max={90} value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })} /></div>
          <div><Label>Notes for the team</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div><Label>Banner image (2:1 recommended)</Label><Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
          <Button onClick={submit} disabled={busy} className="w-full">{busy ? "Submitting…" : "Submit request"}</Button>
        </div>

        <div className="space-y-2">
          <h2 className="font-heading text-base font-semibold">Your requests</h2>
          {data.length === 0 && <p className="rounded-2xl bg-surface p-6 text-center text-sm text-muted-foreground ring-1 ring-border">No requests yet.</p>}
          {data.map((r: any) => (
            <div key={r.id} className="rounded-2xl bg-surface p-3 ring-1 ring-border">
              <div className="flex items-start gap-3">
                <img src={r.image_url} alt="" className="h-14 w-24 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="line-clamp-1 font-semibold">{r.title}</span>
                    <StatusPill status={r.status} />
                  </div>
                  <div className="text-xs text-muted-foreground">{r.duration_days} days</div>
                  {r.admin_note && <p className="mt-1 rounded-lg bg-muted p-2 text-xs">Admin: {r.admin_note}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-muted text-muted-foreground",
    approved: "bg-accent/10 text-accent",
    rejected: "bg-destructive/10 text-destructive",
    live: "bg-primary/10 text-primary",
  };
  return <span className={"rounded-full px-2 py-0.5 text-[10px] font-bold uppercase " + (map[status] ?? "bg-muted")}>{status}</span>;
}
