import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ISLANDS } from "@/lib/islands";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/edit-profile")({ component: EditProfile });

function EditProfile() {
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { t } = useLang();
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data,
  });

  const [form, setForm] = useState({ full_name: "", phone: "", island: "", bio: "", avatar_url: "" });
  useEffect(() => {
    if (profile) setForm({
      full_name: profile.full_name ?? "",
      phone: profile.phone ?? "",
      island: profile.island ?? "",
      bio: profile.bio ?? "",
      avatar_url: profile.avatar_url ?? "",
    });
  }, [profile]);

  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").upsert({ id: user.id, ...form });
    setBusy(false);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Profile updated");
    nav({ to: "/profile" });
  }

  async function uploadAvatar(file: File) {
    if (!user) return;
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    setForm((f) => ({ ...f, avatar_url: url }));
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <TopBar subtitle={t("edit_profile")} />
      <main className="mx-auto max-w-[430px] space-y-4 px-4 pt-4">
        <h1 className="font-heading text-2xl font-bold">{t("edit_profile")}</h1>
        <form onSubmit={save} className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="size-20 overflow-hidden rounded-full bg-muted ring-1 ring-border">
              {form.avatar_url && <img src={form.avatar_url} alt="" className="size-full object-cover" />}
            </div>
            <label className="cursor-pointer rounded-lg bg-muted px-3 py-2 text-xs font-semibold">
              Change photo
              <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }} />
            </label>
          </div>
          <div><Label>{t("full_name")}</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} maxLength={80} /></div>
          <div><Label>{t("phone")}</Label><Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={20} /></div>
          <div>
            <Label>{t("island")}</Label>
            <Select value={form.island} onValueChange={(v) => setForm({ ...form, island: v })}>
              <SelectTrigger><SelectValue placeholder="Pick your island" /></SelectTrigger>
              <SelectContent>{ISLANDS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Bio</Label><Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={300} rows={3} /></div>
          <Button type="submit" disabled={busy} className="w-full">{busy ? "Saving…" : "Save"}</Button>
        </form>
      </main>
      <BottomNav />
    </div>
  );
}
