import { Link } from "@tanstack/react-router";
import { Bell, Moon, Sun, MapPin } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";

export function TopBar({ subtitle }: { subtitle?: string }) {
  const { t, lang, setLang } = useLang();
  const { theme, toggle } = useTheme();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[430px] items-center justify-between px-4 py-3">
        
        <Link to="/" className="flex items-center gap-2 leading-none">
          <img
            src="/favicon.ico"
            alt="OLKV"
            className="size-8 rounded-md object-contain"
          />

          <div className="flex flex-col">
            <span className="font-heading text-2xl font-bold tracking-tight text-primary">
              OLKV
            </span>

            <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
              {subtitle ?? t("tagline")}
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 ring-1 ring-border sm:flex">
            <MapPin className="size-3 text-accent" />
            <span className="text-xs font-medium">Lakshadweep</span>
          </div>

          <button
            onClick={() => setLang(lang === "en" ? "ml" : "en")}
            className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary ring-1 ring-border"
            aria-label={t("language")}
          >
            {lang === "en" ? "ML" : "EN"}
          </button>

          <button
            onClick={toggle}
            className="grid size-8 place-items-center rounded-full bg-muted ring-1 ring-border"
            aria-label={t("dark_mode")}
          >
            {theme === "dark" ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
          </button>

          {user && (
            <Link
              to="/notifications"
              className="relative grid size-8 place-items-center rounded-full bg-muted ring-1 ring-border"
              aria-label={t("notifications")}
            >
              <Bell className="size-4" />
            </Link>
          )}
        </div>

      </div>
    </header>
  );
}
