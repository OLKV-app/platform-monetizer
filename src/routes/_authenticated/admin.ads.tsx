import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/ads")({ component: AdminAds });

function AdminAds() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["admin-ads"],
    queryFn: async () => (await supabase.from("advertisements").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const [form, setForm] = useState({ title: "", image_url: "", link: "", location: "home", status: "active" });

  async function create() {
    if (!form.title.trim() || !form.image_url.trim()) return toast.error("Title and image required");
    const { error } = await supabase.from("advertisements").insert({ ...form, created_by: user?.id });
    if (error) return toast.error(error.message);
    setForm({ title: "", image_url: "", link: "", location: "home", status: "active" });
    toast.success("Ad created");
    qc.invalidateQueries({ queryKey: ["admin-ads"] });
  }

  async function toggle(id: string, status: string) {
    await supabase.from("advertisements").update({ status: status === "active" ? "inactive" : "active" }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-ads"] });
  }
  async function del(id: string) {
    if (!confirm("Delete ad?")) return;
    await supabase.from("advertisements").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-ads"] });
  }

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold">Advertisements</h1>

      <section className="space-y-3 rounded-2xl bg-surface p-4 ring-1 ring-border">
        <div className="text-sm font-semibold">New advertisement</div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Location</Label>
            <Select value={form.location} onValueChange={(v) => setForm({ ...form, location: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="home">Home</SelectItem><SelectItem value="search">Search</SelectItem><SelectItem value="category">Category</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <div><Label>Image URL</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
        <div><Label>Link URL</Label><Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} /></div>
        <Button size="sm" onClick={create}>Create</Button>
      </section>

      <section className="space-y-3">
        {data.map((a: any) => (
          <div key={a.id} className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-border">
            <img src={a.image_url} alt={a.title} className="size-16 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{a.title}</div>
              <div className="text-[10px] text-muted-foreground">{a.location} • {a.views} views • {a.clicks} clicks</div>
            </div>
            <Button size="sm" variant="outline" onClick={() => toggle(a.id, a.status)}>{a.status === "active" ? "Disable" : "Enable"}</Button>
            <Button size="sm" variant="outline" onClick={() => del(a.id)}><Trash2 className="size-3.5" /></Button>
          </div>
        ))}
      </section>
    </div>
  );
}
