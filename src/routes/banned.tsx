import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ShieldAlert, LogOut } from "lucide-react";

export const Route = createFileRoute("/banned")({
  ssr: false,
  component: BannedPage,
});

function BannedPage() {
  const { user, isBanned, banReason, loading } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isBanned)) nav({ to: "/", replace: true });
  }, [loading, user, isBanned, nav]);

  const { data: appeal } = useQuery({
    queryKey: ["my-appeal", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("appeals")
      .select("*").eq("user_id", user!.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle()).data,
  });

  async function submitAppeal() {
    if (!user || reason.trim().length < 10) return toast.error("Please explain in at least 10 characters.");
    setBusy(true);
    const { error } = await supabase.from("appeals").insert({ user_id: user.id, reason: reason.trim() });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Appeal submitted. We'll review it.");
    setReason("");
    qc.invalidateQueries({ queryKey: ["my-appeal"] });
  }

  async function signOut() {
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-[430px] flex-col justify-center px-6 py-10">
        <div className="mb-6 grid size-16 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="size-8" />
        </div>
        <h1 className="font-heading text-2xl font-bold">Your account is suspended</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You can't use OLKV while your account is under review. If you believe this is a mistake,
          you can file an appeal below.
        </p>
        {banReason && (
          <div className="mt-4 rounded-2xl bg-surface p-4 ring-1 ring-border">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Reason</div>
            <div className="mt-1 text-sm">{banReason}</div>
          </div>
        )}

        {appeal ? (
          <div className="mt-6 space-y-2 rounded-2xl bg-surface p-4 ring-1 ring-border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Your appeal</span>
              <span className={
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase " +
                (appeal.status === "pending" ? "bg-muted text-muted-foreground" :
                 appeal.status === "approved" ? "bg-accent/20 text-accent-foreground" :
                 "bg-destructive/10 text-destructive")
              }>{appeal.status}</span>
            </div>
            <p className="text-sm text-muted-foreground">{appeal.reason}</p>
            {appeal.admin_note && (
              <div className="mt-2 rounded-lg bg-background p-3 text-sm ring-1 ring-border">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Admin response</div>
                <div className="mt-1">{appeal.admin_note}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <label className="text-sm font-semibold">Explain your situation</label>
            <Textarea rows={5} value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Describe why your account should be reinstated…" maxLength={1000} />
            <Button onClick={submitAppeal} disabled={busy} className="w-full">Submit appeal</Button>
          </div>
        )}

        <div className="mt-8 flex flex-col items-center gap-2 text-xs">
          <Link to="/terms" className="text-primary">Terms of Service</Link>
          <Link to="/privacy" className="text-primary">Privacy Policy</Link>
          <button onClick={signOut} className="mt-2 flex items-center gap-1 text-muted-foreground">
            <LogOut className="size-3" /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
