import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { saveProfileToFirestore } from "@/lib/firestore";
import { ISLANDS } from "@/lib/islands";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/complete-profile")({
  head: () => ({
    meta: [
      { title: "Complete your profile — OLKV" },
      { name: "description", content: "Add your name and island to start buying and selling on OLKV, Lakshadweep's marketplace." },
      { property: "og:title", content: "Complete your profile — OLKV" },
      { property: "og:description", content: "Add your name and island to start buying and selling on OLKV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CompleteProfilePage,
});

function CompleteProfilePage() {
  const { user, firebaseUser, refreshStatus } = useAuth();
  const nav = useNavigate();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [island, setIsland] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (firebaseUser?.phoneNumber) setPhone(firebaseUser.phoneNumber);
    if (firebaseUser?.displayName) setFullName(firebaseUser.displayName);
  }, [firebaseUser]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) return;
    if (fullName.trim().length < 2) {
      toast.error("Please enter your name");
      return;
    }
    if (!island) {
      toast.error("Please select your island");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            full_name: fullName.trim(),
            island,
            phone: phone.trim() || null,
            email: firebaseUser?.email ?? null,
            terms_accepted_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        );
      if (error) throw error;

      // Best-effort mirror to Firestore (never blocks onboarding).
      void saveProfileToFirestore(user.id, {
        full_name: fullName.trim(),
        island,
        phone: phone.trim() || null,
        email: firebaseUser?.email ?? null,
      }).catch(() => {});

      await refreshStatus();
      toast.success("Profile completed!");
      nav({ to: "/", replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save profile");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-[430px] flex-col justify-center px-6 py-10">
        <h1 className="mb-2 font-heading text-2xl font-bold">Complete your profile</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Just a few details to get you started.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              minLength={2}
              maxLength={80}
            />
          </div>
          <div>
            <Label htmlFor="island">Island</Label>
            <select
              id="island"
              value={island}
              onChange={(e) => setIsland(e.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Select your island</option>
              {ISLANDS.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91..."
              readOnly={!!firebaseUser?.phoneNumber}
            />
            {firebaseUser?.phoneNumber && (
              <p className="mt-1 text-xs text-muted-foreground">
                Verified via OTP
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Saving..." : "Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
