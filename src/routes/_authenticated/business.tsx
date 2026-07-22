import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Building2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/business")({ component: Business });

function Business() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["business", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("business_profiles").select("*").eq("user_id", user!.id).maybeSingle()).data,
  });

  const [form, setForm] = useState({
    business_name: "", logo_url: "", cover_url: "", description: "",
    contact_phone: "", contact_email: "", website: "",
    instagram: "", facebook: "", hours: "",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) {
      const socials = (data.socials ?? {}) as any;
      const hours = (data.hours ?? {}) as any;
      setForm({
        business_name: data.business_name ?? "",
        logo_url: data.logo_url ?? "",
        cover_url: data.cover_url ?? "",
        description: data.description ?? "",
        contact_phone: data.contact_phone ?? "",
        contact_email: data.contact_email ?? "",
        website: data.website ?? "",
        instagram: socials.instagram ?? "",
        facebook: socials.facebook ?? "",
        hours: hours.text ?? "",
      });
    }
  }, [data]);

  async function save() {
    if (!user) return;
    if (!form.business_name.trim()) return toast.error("Business name required");
    setBusy(true);
    const payload = {
      user_id: user.id,
      business_name: form.business_name.trim(),
      logo_url: form.logo_url.trim() || null,
      cover_url: form.cover_url.trim() || null,
      description: form.description.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
      contact_email: form.contact_email.trim() || null,
      website: form.website.trim() || null,
      socials: { instagram: form.instagram.trim(), facebook: form.facebook.trim() },
      hours: { text: form.hours.trim() },
    };
    const { error } = await supabase.from("business_profiles").upsert(payload, { onConflict: "user_id" });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Business profile saved");
    qc.invalidateQueries({ queryKey: ["business"] });
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <TopBar subtitle="Business profile" />
      <main className="mx-auto max-w-[430px] space-y-4 px-4 pt-4">
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 p-5 ring-1 ring-primary/20">
          <Building2 className="size-6 text-primary" />
          <h1 className="mt-2 font-heading text-xl font-bold">Business profile</h1>
          <p className="mt-1 text-xs text-muted-foreground">Requires Business subscription for full features. Verified badge granted after admin review.</p>
        </div>
        <section className="space-y-3 rounded-2xl bg-surface p-4 ring-1 ring-border">
          <div><Label>Business name</Label><Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} /></div>
          <div><Label>Logo URL</Label><Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://..." /></div>
          <div><Label>Cover image URL</Label><Input value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} placeholder="https://..." /></div>
          <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Phone</Label><Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
          </div>
          <div><Label>Website</Label><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Instagram</Label><Input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} /></div>
            <div><Label>Facebook</Label><Input value={form.facebook} onChange={(e) => setForm({ ...form, facebook: e.target.value })} /></div>
          </div>
          <div><Label>Business hours</Label><Textarea rows={2} value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} placeholder="Mon–Sat 9am–6pm" /></div>
          <Button className="w-full" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
