import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useLang } from "@/lib/i18n";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const searchSchema = z.object({ redirect: z.string().optional().catch(undefined) });
export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
});

function AuthPage() {
  const { t } = useLang();
  const nav = useNavigate();
  const { redirect } = Route.useSearch();
  const goHome = () => nav({ to: (redirect as any) || "/" });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-[430px] flex-col justify-center px-6 py-10">
        <Link to="/" className="mb-6 flex flex-col items-center">
          <span className="font-heading text-3xl font-bold text-primary">OLKV</span>
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">{t("tagline")}</span>
        </Link>
        <Tabs defaultValue="email">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="phone">Phone OTP</TabsTrigger>
          </TabsList>
          <TabsContent value="email"><EmailAuth onSuccess={goHome} /></TabsContent>
          <TabsContent value="phone"><PhoneAuth onSuccess={goHome} /></TabsContent>
        </Tabs>

        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          <span>or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <GoogleButton />

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing you agree to OLKV's terms.
        </p>
      </div>
    </div>
  );
}

function EmailAuth({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useLang();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [terms, setTerms] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        onSuccess();
      } else if (mode === "signup") {
        if (!terms) throw new Error("Please accept the Terms of Service and Privacy Policy to continue.");
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            data: { full_name: name, terms_accepted: "true" },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Account created. Check your email if confirmation is required.");
        onSuccess();
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (error) throw error;
        toast.success("Password reset email sent.");
        setMode("signin");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3">
      {mode === "signup" && (
        <div>
          <Label htmlFor="name">{t("full_name")}</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} />
        </div>
      )}
      <div>
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      {mode !== "reset" && (
        <div>
          <Label htmlFor="password">{t("password")}</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </div>
      )}
      {mode === "signup" && (
        <label className="flex items-start gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)}
            className="mt-0.5 size-4 accent-[hsl(var(--primary))]" />
          <span>
            I agree to OLKV's{" "}
            <Link to="/terms" className="text-primary underline">Terms of Service</Link>{" "}
            and{" "}
            <Link to="/privacy" className="text-primary underline">Privacy Policy</Link>.
          </span>
        </label>
      )}
      <Button type="submit" className="w-full" disabled={busy || (mode === "signup" && !terms)}>
        {busy ? "…" : mode === "signin" ? t("sign_in") : mode === "signup" ? t("sign_up") : "Send reset email"}
      </Button>
      <div className="flex items-center justify-between text-xs">
        {mode === "signin" ? (
          <>
            <button type="button" onClick={() => setMode("reset")} className="text-primary">{t("forgot_password")}</button>
            <button type="button" onClick={() => setMode("signup")} className="text-primary">Create account</button>
          </>
        ) : (
          <button type="button" onClick={() => setMode("signin")} className="text-primary">Back to sign in</button>
        )}
      </div>
    </form>
  );
}

function PhoneAuth({ onSuccess }: { onSuccess: () => void }) {
  const [phone, setPhone] = useState("+91");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
      setSent(true);
      toast.success("OTP sent");
    } catch (err: any) {
      toast.error(err.message ?? "Could not send OTP");
    } finally { setBusy(false); }
  }
  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
      if (error) throw error;
      toast.success("Signed in");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message ?? "Invalid OTP");
    } finally { setBusy(false); }
  }
  return (
    <form onSubmit={sent ? verify : sendOtp} className="mt-4 space-y-3">
      <div>
        <Label htmlFor="phone">Phone (with country code)</Label>
        <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+919xxxxxxxxx" required />
      </div>
      {sent && (
        <div>
          <Label htmlFor="otp">Enter 6-digit code</Label>
          <Input id="otp" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} required />
        </div>
      )}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "…" : sent ? "Verify OTP" : "Send OTP"}
      </Button>
      {sent && (
        <button type="button" className="w-full text-xs text-muted-foreground" onClick={() => { setSent(false); setOtp(""); }}>
          Use a different number
        </button>
      )}
    </form>
  );
}

function GoogleButton() {
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result.error) { toast.error(result.error.message ?? "Google sign-in failed"); return; }
      if (result.redirected) return;
      window.location.href = "/";
    } catch (err: any) {
      toast.error(err.message ?? "Google sign-in failed");
    } finally { setBusy(false); }
  }
  return (
    <Button variant="outline" onClick={go} disabled={busy} className="w-full gap-2">
      <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 32.8 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.2 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.7 18.9 12.6 24 12.6c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.2 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.1 0 9.7-1.9 13.2-5.1l-6.1-5c-2 1.4-4.5 2.2-7.1 2.2-5.4 0-9.9-3.2-11.3-8l-6.6 5.1C9.5 39.5 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.7 2-2 3.8-3.7 5.1l6.1 5c-.4.4 6.3-4.6 6.3-14.1 0-1.2-.1-2.3-.4-3.5z"/></svg>
      Continue with Google
    </Button>
  );
}
