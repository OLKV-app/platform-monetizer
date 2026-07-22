import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/categories")({ component: AdminCategories });

const emptyForm = { slug: "", name_en: "", name_ml: "", icon: "", position: 0, image_url: "", is_featured: false, parent_slug: "" };

function AdminCategories() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...emptyForm });
  const [editingSlug, setEditingSlug] = useState<string | null>(null);

  const { data = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("position")).data ?? [],
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin-categories"] });
    qc.invalidateQueries({ queryKey: ["categories"] });
  }

  async function submit() {
    if (!form.slug || !form.name_en) return toast.error("Slug and English name required");
    const payload = { ...form, parent_slug: form.parent_slug || null, position: Number(form.position) };
    let error;
    if (editingSlug) {
      ({ error } = await supabase.from("categories").update(payload).eq("slug", editingSlug));
    } else {
      ({ error } = await supabase.from("categories").insert(payload));
    }
    if (error) return toast.error(error.message);
    toast.success(editingSlug ? "Updated" : "Created");
    setForm({ ...emptyForm });
    setEditingSlug(null);
    invalidate();
  }

  async function toggle(slug: string, active: boolean) {
    await supabase.from("categories").update({ active: !active }).eq("slug", slug);
    invalidate();
  }
  async function del(slug: string) {
    if (!confirm(`Delete category "${slug}"?`)) return;
    const { error } = await supabase.from("categories").delete().eq("slug", slug);
    if (error) return toast.error(error.message);
    invalidate();
  }
  function edit(c: any) {
    setEditingSlug(c.slug);
    setForm({
      slug: c.slug, name_en: c.name_en, name_ml: c.name_ml ?? "", icon: c.icon ?? "",
      position: c.position ?? 0, image_url: c.image_url ?? "", is_featured: !!c.is_featured,
      parent_slug: c.parent_slug ?? "",
    });
  }

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-xl font-bold">Categories</h2>

      <div className="space-y-3 rounded-2xl bg-surface p-4 ring-1 ring-border">
        <div className="text-sm font-semibold">{editingSlug ? `Editing "${editingSlug}"` : "Add category"}</div>
        <div className="grid gap-2 md:grid-cols-2">
          <div><Label>Slug</Label><Input value={form.slug} disabled={!!editingSlug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
          <div><Label>Icon (emoji or lucide name)</Label><Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></div>
          <div><Label>Name (English)</Label><Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} /></div>
          <div><Label>Name (Malayalam)</Label><Input value={form.name_ml} onChange={(e) => setForm({ ...form, name_ml: e.target.value })} /></div>
          <div><Label>Position</Label><Input type="number" value={form.position} onChange={(e) => setForm({ ...form, position: Number(e.target.value) })} /></div>
          <div>
            <Label>Parent</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.parent_slug}
              onChange={(e) => setForm({ ...form, parent_slug: e.target.value })}
            >
              <option value="">(top level)</option>
              {data.filter((c: any) => c.slug !== form.slug).map((c: any) => (
                <option key={c.slug} value={c.slug}>{c.name_en}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2"><Label>Image URL</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} />
            Featured on home
          </label>
        </div>
        <div className="flex gap-2">
          <Button onClick={submit}>{editingSlug ? "Save changes" : "Add category"}</Button>
          {editingSlug && <Button variant="outline" onClick={() => { setEditingSlug(null); setForm({ ...emptyForm }); }}>Cancel</Button>}
        </div>
      </div>

      <div className="space-y-2">
        {data.map((c: any) => (
          <div key={c.slug} className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-border">
            <div className="flex-1">
              <div className="font-semibold">
                {c.name_en} <span className="text-xs text-muted-foreground">/ {c.name_ml}</span>
                {c.is_featured && <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">FEATURED</span>}
                {c.parent_slug && <span className="ml-2 text-[10px] text-muted-foreground">↳ {c.parent_slug}</span>}
              </div>
              <div className="text-xs text-muted-foreground">Icon: {c.icon} • Slug: {c.slug} • Pos: {c.position}</div>
            </div>
            <Button size="sm" variant="outline" onClick={() => edit(c)}>Edit</Button>
            <Button size="sm" variant={c.active ? "outline" : "default"} onClick={() => toggle(c.slug, c.active)}>
              {c.active ? "Hide" : "Show"}
            </Button>
            <Button size="sm" variant="destructive" onClick={() => del(c.slug)}><Trash2 className="size-4" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
