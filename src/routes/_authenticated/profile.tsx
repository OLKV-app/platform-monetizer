import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { toast } from "sonner";
import { ChevronRight, LogOut, Heart, Package, Settings, Bell, ShieldCheck, UserCog, MessageSquare, FileText, Lock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/profile")({ component: Profile });

function Profile() {
  const { user, isAdmin, signOut: authSignOut } = useAuth();
  const { t } = useLang();
  const nav = useNavigate();
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data,
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await authSignOut();
    toast.success("Signed out");
    nav({ to: "/", replace: true });
  }

  const Row = ({ to, icon, label }: { to: any; icon: React.ReactNode; label: string }) => (
    <Link to={to} className="flex items-center gap-3 rounded-2xl bg-surface p-4 ring-1 ring-border">
      <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );

  return (
    <div className="min-h-screen bg-background pb-28">
      <TopBar subtitle={t("profile")} />
      <main className="mx-auto max-w-[430px] space-y-4 px-4 pt-4">
        <section className="rounded-3xl bg-gradient-to-br from-primary to-accent p-5 text-white">
          <div className="flex items-center gap-4">
            <div className="size-16 overflow-hidden rounded-full bg-white/20 ring-2 ring-white/40">
              {profile?.avatar_url && <img src={profile.avatar_url} alt="" className="size-full object-cover" />}
            </div>
            <div className="min-w-0">
              <div className="font-heading text-xl font-semibold">{profile?.full_name ?? "OLKV user"}</div>
              <div className="text-xs opacity-90">{user?.email ?? user?.phone}</div>
              {profile?.island && <div className="mt-0.5 text-xs opacity-90">{profile.island}</div>}
            </div>
          </div>
        </section>

        <div className="space-y-2">
          <Row to="/my-ads" icon={<Package className="size-4" />} label={t("my_ads")} />
          <Row to="/favourites" icon={<Heart className="size-4" />} label={t("favourites")} />
          <Row to="/notifications" icon={<Bell className="size-4" />} label={t("notifications")} />
          <Row to="/edit-profile" icon={<UserCog className="size-4" />} label={t("edit_profile")} />
          <Row to="/feedback" icon={<MessageSquare className="size-4" />} label="Send feedback" />
          <Row to="/settings" icon={<Settings className="size-4" />} label={t("settings")} />
          <Row to="/terms" icon={<FileText className="size-4" />} label="Terms of Service" />
          <Row to="/privacy" icon={<Lock className="size-4" />} label="Privacy Policy" />
          {isAdmin && <Row to="/admin" icon={<ShieldCheck className="size-4" />} label={t("admin")} />}
        </div>

        <button onClick={signOut} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-surface p-4 text-sm font-semibold text-destructive ring-1 ring-border">
          <LogOut className="size-4" /> {t("sign_out")}
        </button>
      </main>
      <BottomNav />
    </div>
  );
}
