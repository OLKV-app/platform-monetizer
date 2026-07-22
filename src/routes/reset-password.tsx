import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { firebaseAuth, confirmPasswordReset } from "@/integrations/firebase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  component: ResetPassword,
});

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  // Firebase appends ?oobCode=... to the redirect URL.
  const oobCode =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("oobCode")
      : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!oobCode) {
      toast.error("Missing reset code. Open the link from your email again.");
      return;
    }
    setBusy(true);
    try {
      await confirmPasswordReset(firebaseAuth, oobCode, password);
      toast.success("Password updated. Please sign in.");
      nav({ to: "/auth" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not update password";
      toast.error(msg.replace(/^Firebase:\s*/, ""));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[430px] px-6 py-14">
        <h1 className="font-heading text-2xl font-bold">Set a new password</h1>
        {!oobCode && (
          <p className="mt-3 text-sm text-destructive">
            This page must be opened from the password-reset email link.
          </p>
        )}
        <form onSubmit={submit} className="mt-6 space-y-3">
          <div>
            <Label htmlFor="pw">New password</Label>
            <Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy || !oobCode}>{busy ? "…" : "Update password"}</Button>
        </form>
      </div>
    </div>
  );
}
