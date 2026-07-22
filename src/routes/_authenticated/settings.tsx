import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({ component: SettingsPage });

function SettingsPage() {
  const { t, lang, setLang } = useLang();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (await supabase.from("profiles").select("hide_contact").eq("id", user!.id).maybeSingle()).data,
  });

  async function setHideContact(hide: boolean) {
    if (!user) return;
    // Optimistic update so the switch feels instant.
    qc.setQueryData(["profile", user.id], (prev: any) => ({ ...(prev ?? {}), hide_contact: hide }));
    const { error } = await supabase.from("profiles").update({ hide_contact: hide }).eq("id", user.id);
    if (error) {
      toast.error(error.message);
      qc.invalidateQueries({ queryKey: ["profile", user.id] });
      return;
    }
    toast.success(hide ? "Your number is now hidden from listings" : "Your number is now shown on listings");
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <TopBar subtitle={t("settings")} />
      <main className="mx-auto max-w-[430px] space-y-3 px-4 pt-4">
        <h1 className="font-heading text-2xl font-bold">{t("settings")}</h1>

        <div className="flex items-center justify-between rounded-2xl bg-surface p-4 ring-1 ring-border">
          <div>
            <div className="text-sm font-semibold">{t("dark_mode")}</div>
            <div className="text-xs text-muted-foreground">Reduce brightness at night.</div>
          </div>
          <Switch checked={theme === "dark"} onCheckedChange={(v) => setTheme(v ? "dark" : "light")} />
        </div>

        <div className="rounded-2xl bg-surface p-4 ring-1 ring-border">
          <div className="mb-3 text-sm font-semibold">{t("language")}</div>
          <div className="flex gap-2">
            <button onClick={() => setLang("en")} className={"flex-1 rounded-xl py-2 text-sm font-semibold ring-1 " + (lang === "en" ? "bg-primary text-primary-foreground ring-primary" : "bg-background ring-border")}>English</button>
            <button onClick={() => setLang("ml")} className={"flex-1 rounded-xl py-2 text-sm font-semibold ring-1 " + (lang === "ml" ? "bg-primary text-primary-foreground ring-primary" : "bg-background ring-border")}>മലയാളം</button>
          </div>
        </div>

        <div className="rounded-2xl bg-surface p-4 ring-1 ring-border">
          <div className="mb-3 text-sm font-semibold">Privacy</div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Hide my phone number</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                Buyers won't see a Call button on your listings — they can only reach you
                through in-app chat (they can still ask you for a call there).
              </div>
            </div>
            <Switch checked={!!profile?.hide_contact} onCheckedChange={setHideContact} />
          </div>
        </div>

        <div className="rounded-2xl bg-surface p-4 text-sm text-muted-foreground ring-1 ring-border">
          <div className="mb-1 text-sm font-semibold text-foreground">About OLKV</div>
          <p>The marketplace for Lakshadweep. Buy, sell and connect with your island neighbours.</p>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
