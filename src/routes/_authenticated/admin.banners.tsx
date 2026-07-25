import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { uploadImage } from "@/services/upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/banners")({
  component: AdminBanners,
});

const emptyForm = {
  title: "",
  subtitle: "",
  link_url: "",
  position: "0",
  banner_type: "promotional",
  starts_at: "",
  ends_at: "",
};

function AdminBanners() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...emptyForm });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: banners = [] } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: async () => {
      const { data } = await supabase
        .from("banners")
        .select("*")
        .order("position", { ascending: true });
      return data ?? [];
    },
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin-banners"] });
    qc.invalidateQueries({ queryKey: ["banners"] });
  }

  async function add() {
    if (!file) return toast.error("Add an image");
    if (!user) return toast.error("You must be signed in");

    setBusy(true);
    const toastId = toast.loading("Adding banner...", {
      description: "Compressing and uploading image",
    });

    try {
      const result = await uploadImage(
        {
          type: "banner",
          file,
          user: { uid: user.id, id: user.id },
        },
        (progress) => {
          toast.loading("Adding banner...", {
            id: toastId,
            description: `Uploading: ${progress.percentage}%`,
          });
        },
      );

      const { error } = await supabase.from("banners").insert({
        title: form.title,
        subtitle: form.subtitle || null,
        link_url: form.link_url || null,
        position: Number(form.position) || 0,
        image_url: result.url,
        banner_type: form.banner_type,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
      });
      if (error) throw error;

      setForm({ ...emptyForm });
      setFile(null);
      invalidate();

      toast.success("Banner added successfully!", {
        id: toastId,
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      });
    } catch (err: any) {
      toast.error("Failed to add banner", {
        id: toastId,
        description: err?.message ?? "Please try again",
        icon: <XCircle className="h-5 w-5 text-red-500" />,
      });
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const { error } = await supabase.from("banners").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Banner deleted");
    invalidate();
  }

  async function toggleActive(id: string, active: boolean) {
    const { error } = await supabase.from("banners").update({ active }).eq("id", id);
    if (error) return toast.error(error.message);
    invalidate();
  }

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-xl font-bold">Banners</h2>

      <div className="space-y-3 rounded-2xl bg-surface p-4 ring-1 ring-border">
        <div className="text-sm font-semibold">Add new banner</div>
        <div>
          <Label>Title</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <Label>Subtitle</Label>
          <Textarea rows={2} value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
        </div>
        <div>
          <Label>Link URL</Label>
          <Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Position</Label>
            <Input type="number" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
          </div>
          <div>
            <Label>Type</Label>
            <Input value={form.banner_type} onChange={(e) => setForm({ ...form, banner_type: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Starts at</Label>
            <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
          </div>
          <div>
            <Label>Ends at</Label>
            <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Image</Label>
          <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <Button onClick={add} disabled={busy} className="w-full">
          {busy ? "Adding..." : "Add banner"}
        </Button>
      </div>

      <div className="space-y-2">
        {banners.map((b: any) => (
          <div key={b.id} className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-border">
            <img src={b.image_url} alt="" className="h-14 w-24 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{b.title}</div>
              <div className="truncate text-xs text-muted-foreground">{b.subtitle}</div>
              <div className="text-[10px] text-muted-foreground">pos {b.position} · {b.banner_type}</div>
            </div>
            <button
              onClick={() => toggleActive(b.id, !b.active)}
              className={"rounded-lg px-2 py-1 text-xs font-semibold ring-1 " + (b.active ? "bg-primary/10 text-primary ring-primary/30" : "bg-muted ring-border")}
            >
              {b.active ? "Active" : "Hidden"}
            </button>
            <button onClick={() => remove(b.id)} className="text-destructive">
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
