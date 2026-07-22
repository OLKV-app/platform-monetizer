import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/plans")({ component: Plans });

function Plans() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => (await supabase.from("subscription_plans").select("*").order("sort_order")).data ?? [],
  });

  async function update(id: string, patch: any) {
    const { error } = await supabase.from("subscription_plans").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["admin-plans"] });
    qc.invalidateQueries({ queryKey: ["plans-active"] });
  }

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold">Subscription plans</h1>
      <div className="space-y-3">
        {data.map((p: any) => (
          <PlanRow key={p.id} plan={p} onSave={(patch) => update(p.id, patch)} />
        ))}
      </div>
    </div>
  );
}

function PlanRow({ plan, onSave }: { plan: any; onSave: (p: any) => void }) {
  const [price, setPrice] = useState(String(plan.price));
  const [days, setDays] = useState(String(plan.duration_days));
  const [benefits, setBenefits] = useState((plan.benefits ?? []).join("\n"));
  const [active, setActive] = useState(plan.is_active);

  return (
    <div className="rounded-2xl bg-surface p-4 ring-1 ring-border">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-heading text-lg font-bold">{plan.name}</div>
          <div className="text-xs text-muted-foreground">Code: {plan.code} • Tier: {plan.tier}</div>
        </div>
        <div className="flex items-center gap-2 text-xs"><Switch checked={active} onCheckedChange={setActive} /> Active</div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div><Label>Price (INR)</Label><Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} /></div>
        <div><Label>Duration (days)</Label><Input type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} /></div>
      </div>
      <div className="mt-3">
        <Label>Benefits (one per line)</Label>
        <textarea className="mt-1 w-full rounded-lg border bg-background p-2 text-sm" rows={4} value={benefits} onChange={(e) => setBenefits(e.target.value)} />
      </div>
      <Button size="sm" className="mt-3" onClick={() => onSave({ price: Number(price), duration_days: Number(days), is_active: active, benefits: benefits.split("\n").map((s: string) => s.trim()).filter(Boolean) })}>Save</Button>
    </div>
  );
}
