import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/banners")({ component: AdminBanners });

const emptyForm = {
  title: "", subtitle: "", link_url: "", position: 0,
  banner_type: "home", starts_at: "", ends_at: "",
};

function AdminBanners() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: async () => (await supabase.from("banners").select("*").order("position")).data ?? [],
  });
  const [form, setForm] = useState({ ...emptyForm });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin-banners"] });
    qc.invalidateQueries({ queryKey: ["banners"] });
  }

  async function add() {
    if (!file) return toast.error("Add an image");
    if (!user) return;
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("banners").upload(path, file);
      if (upErr) throw upErr;
      const url = supabase.storage.from("banners").getPublicUrl(path).data.publicUrl;
      const { error } = await supabase.from("banners").insert({
        title: form.title, subtitle: form.subtitle, link_url: form.link_url,
        position: Number(form.position), image_url: url,
        banner_type: form.banner_type,
        starts_at: form.starts_at || null, ends_at: form.ends_at || null,
      });
      if (error) throw error;
      setForm({ ...emptyForm });
      setFile(null);
      invalidate();
      toast.success("Banner added");
    } catch (err: any) { toast.error(err.message); } finally { setBusy(false); }
  }
  async function del(id: string) {
    if (!confirm("Delete this banner?")) return;
    await supabase.from("banners").delete().eq("id", id);
    invalidate();
  }
  async function toggle(id: string, active: boolean) {
    await supabase.from("banners").update({ active: !active }).eq("id", id);
    invalidate();
  }

  const fmt = (v?: string) => (v ? new Date(v).toLocaleString() : "—");

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-xl font-bold">Banners</h2>

      <div className="space-y-2 rounded-2xl bg-surface p-4 ring-1 ring-border">
        <div className="text-sm font-semibold">Add banner</div>
        <div className="grid gap-2 md:grid-cols-2">
          <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Subtitle</Label><Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></div>
          <div><Label>Link URL</Label><Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} /></div>
          <div>
            <Label>Type</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.banner_type}
              onChange={(e) => setForm({ ...form, banner_type: e.target.value })}
            >
              <option value="home">Home</option>
              <option value="promotional">Promotional</option>
              <option value="seasonal">Seasonal</option>
            </select>
          </div>
          <div><Label>Position</Label><Input type="number" value={form.position} onChange={(e) => setForm({ ...form, position: Number(e.target.value) })} /></div>
          <div><Label>Starts at</Label><Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></div>
          <div><Label>Ends at</Label><Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Image</Label><Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
        </div>
        <Button onClick={add} disabled={busy}>{busy ? "Adding…" : "Add banner"}</Button>
      </div>

      <div className="space-y-2">
        {data.map((b: any) => (
          <div key={b.id} className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-border">
            <img src={b.image_url} alt="" className="h-14 w-24 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{b.title} <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">{b.banner_type ?? "home"}</span></div>
              <div className="text-xs text-muted-foreground">{b.subtitle}</div>
              <div className="text-[10px] text-muted-foreground">Runs {fmt(b.starts_at)} → {fmt(b.ends_at)} • {b.view_count ?? 0} views • {b.click_count ?? 0} clicks</div>
            </div>
            <Button size="sm" variant="outline" onClick={() => toggle(b.id, b.active)}>{b.active ? "Hide" : "Show"}</Button>
            <Button size="sm" variant="destructive" onClick={() => del(b.id)}><Trash2 className="size-4" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
