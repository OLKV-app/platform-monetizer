import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadFile } from "@/lib/storage";
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

  try {
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${user.id}/avatar-${Date.now()}.${ext}`;

    const url = await uploadFile(
      "avatars",
      filename,
      file
    );

    setForm((f) => ({
      ...f,
      avatar_url: url,
    }));
  } catch (err: any) {
    toast.error(err?.message ?? "Failed to upload avatar");
  }
}
  return (
    <div className="min-h-screen bg-background pb-28">
      <TopBar subtitle={t("edit_profile")} />
      <main className="mx-auto max-w-[430px] space-y-4 px-4 pt-4">
        <h1 className="font-heading text-2xl font-bold">{t("edit_profile")}</h1>
