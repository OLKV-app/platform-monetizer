import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/legal")({ component: Legal });

function Legal() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["legal-pages"],
    queryFn: async () => (await supabase.from("legal_pages").select("*")).data ?? [],
  });

  const [tab, setTab] = useState<"privacy" | "terms">("privacy");
  const [form, setForm] = useState({ title: "", content: "" });

  useEffect(() => {
    const p = data?.find((r) => r.slug === tab);
    if (p) setForm({ title: p.title, content: p.content });
  }, [data, tab]);

  async function save() {
    const { error } = await supabase.from("legal_pages").update({ ...form, updated_at: new Date().toISOString(), updated_by: user?.id }).eq("slug", tab);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["legal-pages"] });
    qc.invalidateQueries({ queryKey: ["legal", tab] });
  }

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold">Legal pages</h1>
      <div className="flex gap-2">
        {(["privacy", "terms"] as const).map((s) => (
          <button key={s} onClick={() => setTab(s)} className={"rounded-full px-3 py-1.5 text-xs font-semibold ring-1 " + (tab === s ? "bg-primary text-primary-foreground ring-primary" : "bg-surface ring-border")}>{s === "privacy" ? "Privacy Policy" : "Terms & Conditions"}</button>
        ))}
      </div>

      <div className="space-y-3 rounded-2xl bg-surface p-4 ring-1 ring-border">
        <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div>
          <Label>Content (Markdown)</Label>
          <textarea className="mt-1 w-full rounded-lg border bg-background p-2 font-mono text-xs" rows={24} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
        </div>
        <Button size="sm" onClick={save}>Save</Button>
      </div>
    </div>
  );
}
