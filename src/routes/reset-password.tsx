import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({ component: ResetPassword });

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated");
      nav({ to: "/" });
    } catch (err: any) {
      toast.error(err.message ?? "Could not update password");
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[430px] px-6 py-14">
        <h1 className="font-heading text-2xl font-bold">Set a new password</h1>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <div>
            <Label htmlFor="pw">New password</Label>
            <Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "…" : "Update password"}</Button>
        </form>
      </div>
    </div>
  );
}
