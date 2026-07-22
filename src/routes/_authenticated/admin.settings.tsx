import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { setSetting } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/settings")({ component: AdminSettings });

function AdminSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["all-settings"],
    queryFn: async () => Object.fromEntries(((await supabase.from("app_settings").select("*")).data ?? []).map((r) => [r.key, r.value])),
  });

  const [featured, setFeatured] = useState({ price: 49, duration_days: 7 });
  const [bump, setBump] = useState({ price: 19, cooldown_hours: 24, daily_limit: 3 });
  const [verif, setVerif] = useState({ price: 0 });
  const [admob, setAdmob] = useState<any>({ enabled: true, banner_ad_unit: "", interstitial_ad_unit: "", native_ad_unit: "", use_test_ids: true });
  const [maint, setMaint] = useState({ enabled: false, message: "" });
  const [support, setSupport] = useState({ email: "", phone: "" });

  useEffect(() => {
    if (!data) return;
    const g = (k: string) => (data[k] && typeof data[k] === "object" ? (data[k] as any) : {});
    setFeatured({ ...featured, ...g("featured_price") });
    setBump({ ...bump, ...g("bump_price") });
    setVerif({ ...verif, ...g("verification_fee") });
    setAdmob({ ...admob, ...g("admob") });
    setMaint({ ...maint, ...g("maintenance_mode") });
    setSupport({ ...support, ...g("support_contact") });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  async function save(key: string, value: any) {
    await setSetting(key, value, user?.id);
    toast.success(`${key} saved`);
    qc.invalidateQueries({ queryKey: ["all-settings"] });
  }

  const Sec = ({ title, children }: { title: string; children: any }) => (
    <section className="space-y-3 rounded-2xl bg-surface p-4 ring-1 ring-border">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold">App settings</h1>

      <Sec title="Featured listing pricing">
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Price (INR)</Label><Input type="number" value={featured.price} onChange={(e) => setFeatured({ ...featured, price: Number(e.target.value) })} /></div>
          <div><Label>Duration (days)</Label><Input type="number" value={featured.duration_days} onChange={(e) => setFeatured({ ...featured, duration_days: Number(e.target.value) })} /></div>
        </div>
        <Button size="sm" onClick={() => save("featured_price", featured)}>Save</Button>
      </Sec>

      <Sec title="Bump pricing">
        <div className="grid grid-cols-3 gap-2">
          <div><Label>Price</Label><Input type="number" value={bump.price} onChange={(e) => setBump({ ...bump, price: Number(e.target.value) })} /></div>
          <div><Label>Cooldown (h)</Label><Input type="number" value={bump.cooldown_hours} onChange={(e) => setBump({ ...bump, cooldown_hours: Number(e.target.value) })} /></div>
          <div><Label>Daily limit</Label><Input type="number" value={bump.daily_limit} onChange={(e) => setBump({ ...bump, daily_limit: Number(e.target.value) })} /></div>
        </div>
        <Button size="sm" onClick={() => save("bump_price", bump)}>Save</Button>
      </Sec>

      <Sec title="Verification fee">
        <div><Label>Price (INR)</Label><Input type="number" value={verif.price} onChange={(e) => setVerif({ ...verif, price: Number(e.target.value) })} /></div>
        <Button size="sm" onClick={() => save("verification_fee", verif)}>Save</Button>
      </Sec>

      <Sec title="Google AdMob">
        <div className="flex items-center gap-3 text-xs"><Switch checked={admob.enabled} onCheckedChange={(v) => setAdmob({ ...admob, enabled: v })} /> Enabled (Free users only)</div>
        <div className="flex items-center gap-3 text-xs"><Switch checked={admob.use_test_ids} onCheckedChange={(v) => setAdmob({ ...admob, use_test_ids: v })} /> Use Google test IDs</div>
        <div><Label>Banner ad unit</Label><Input value={admob.banner_ad_unit} onChange={(e) => setAdmob({ ...admob, banner_ad_unit: e.target.value })} /></div>
        <div><Label>Interstitial ad unit</Label><Input value={admob.interstitial_ad_unit} onChange={(e) => setAdmob({ ...admob, interstitial_ad_unit: e.target.value })} /></div>
        <div><Label>Native ad unit</Label><Input value={admob.native_ad_unit} onChange={(e) => setAdmob({ ...admob, native_ad_unit: e.target.value })} /></div>
        <p className="text-[10px] text-muted-foreground">AdMob renders on the Android build only. Web preview shows a placeholder.</p>
        <Button size="sm" onClick={() => save("admob", admob)}>Save</Button>
      </Sec>

      <Sec title="Maintenance mode">
        <div className="flex items-center gap-3 text-xs"><Switch checked={maint.enabled} onCheckedChange={(v) => setMaint({ ...maint, enabled: v })} /> Enable maintenance banner</div>
        <div><Label>Message</Label><Input value={maint.message} onChange={(e) => setMaint({ ...maint, message: e.target.value })} /></div>
        <Button size="sm" onClick={() => save("maintenance_mode", maint)}>Save</Button>
      </Sec>

      <Sec title="Support contact">
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Email</Label><Input value={support.email} onChange={(e) => setSupport({ ...support, email: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={support.phone} onChange={(e) => setSupport({ ...support, phone: e.target.value })} /></div>
        </div>
        <Button size="sm" onClick={() => save("support_contact", support)}>Save</Button>
      </Sec>
    </div>
  );
}
