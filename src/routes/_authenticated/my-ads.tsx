import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { formatINR, timeAgo } from "@/lib/format";
import { ISLANDS } from "@/lib/islands";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/my-ads")({ component: MyAds });

function MyAds() {
  const { user } = useAuth();
  const { t } = useLang();
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["my-ads", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("listings")
        .select(
          "id,title,description,price,category_slug,condition,island,location,contact_number,status,created_at,listing_images(url,position)",
        )
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []).map((l: any) => ({
        ...l,
        image: l.listing_images?.sort((a: any, b: any) => a.position - b.position)[0]?.url ?? null,
      }));
    },
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["my-ads"] });
    qc.invalidateQueries({ queryKey: ["listings"] });
    qc.invalidateQueries({ queryKey: ["listing"] });
  }

  async function del(id: string) {
    if (!confirm("Delete this listing? This can't be undone.")) return;
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Listing deleted");
    invalidate();
  }

  const badge = (s: string) => {
    const cls: Record<string, string> = {
      approved: "bg-accent/15 text-accent",
      pending: "bg-primary/15 text-primary",
      rejected: "bg-destructive/15 text-destructive",
      sold: "bg-muted text-muted-foreground",
    };
    return (
      <span
        className={
          "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide " +
          (cls[s] ?? "bg-muted")
        }
      >
        {s}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <TopBar subtitle={t("my_ads")} />
      <main className="mx-auto max-w-[430px] space-y-3 px-4 pt-4">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl font-bold">{t("my_ads")}</h1>
          <Link
            to="/sell"
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            + New
          </Link>
        </div>
        {data.length === 0 ? (
          <p className="rounded-2xl bg-surface p-8 text-center text-sm text-muted-foreground ring-1 ring-border">
            You haven't posted anything yet.
          </p>
        ) : (
          <div className="space-y-3">
            {data.map((l: any) => (
              <div
                key={l.id}
                className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-border"
              >
                <Link
                  to="/product/$id"
                  params={{ id: l.id }}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {l.image && <img src={l.image} alt="" className="size-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">{badge(l.status)}</div>
                    <h3 className="line-clamp-1 mt-1 text-sm font-medium">{l.title}</h3>
                    <div className="text-xs text-muted-foreground">
                      {l.island} • {timeAgo(l.created_at)}
                    </div>
                    <div className="text-sm font-semibold text-primary">{formatINR(l.price)}</div>
                  </div>
                </Link>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <EditListingDialog listing={l} onSaved={invalidate} />
                  <Button size="sm" variant="outline" onClick={() => del(l.id)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

function EditListingDialog({ listing, onSaved }: { listing: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: listing.title as string,
    description: listing.description as string,
    price: String(listing.price ?? ""),
    condition: (listing.condition ?? "used") as "new" | "used",
    island: listing.island as string,
    location: (listing.location ?? "") as string,
    contact_number: listing.contact_number as string,
  });

  async function save() {
    if (form.title.trim().length < 4) return toast.error("Title is too short");
    if (form.description.trim().length < 10) return toast.error("Description is too short");
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) return toast.error("Enter a valid price");

    setBusy(true);
    const { error } = await supabase
      .from("listings")
      .update({
        title: form.title.trim(),
        description: form.description.trim(),
        price,
        condition: form.condition,
        island: form.island,
        location: form.location.trim() || null,
        contact_number: form.contact_number.trim(),
      })
      .eq("id", listing.id);
    setBusy(false);

    if (error) return toast.error(error.message);
    toast.success("Listing updated");
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Pencil className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit listing</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input
              value={form.title}
              maxLength={120}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              rows={4}
              maxLength={4000}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Price</Label>
              <Input
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div>
              <Label>Condition</Label>
              <Select
                value={form.condition}
                onValueChange={(v) => setForm({ ...form, condition: v as "new" | "used" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="used">Used</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Island</Label>
            <Select value={form.island} onValueChange={(v) => setForm({ ...form, island: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ISLANDS.map((island) => (
                  <SelectItem key={island} value={island}>
                    {island}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Location</Label>
            <Input
              maxLength={120}
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>
          <div>
            <Label>Contact number</Label>
            <Input
              type="tel"
              value={form.contact_number}
              onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
