import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Moon, Sun, MapPin, Plus } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const DESKTOP_LINKS: { to: string; key: string }[] = [
  { to: "/", key: "home" },
  { to: "/search", key: "search" },
  { to: "/chats", key: "chats" },
  { to: "/favourites", key: "favourites" },
  { to: "/profile", key: "profile" },
];

export function TopBar({ subtitle }: { subtitle?: string }) {
  const { t, lang, setLang } = useLang();
  const { theme, toggle } = useTheme();
  const { user } = useAuth();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (p: string) => (p === "/" ? pathname === "/" : pathname.startsWith(p));

  return (
    <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto grid max-w-[430px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 md:max-w-5xl md:flex md:justify-between md:py-4">

        <Link to="/" className="flex min-w-0 items-center gap-2 leading-none">
          <img
            src="/favicon.ico"
            alt="OLKV"
            className="size-8 shrink-0 rounded-md object-contain"
          />

          <div className="flex min-w-0 flex-col">
            <span className="font-heading text-2xl font-bold tracking-tight text-primary">
              OLKV
            </span>

            <span className="truncate text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
              {subtitle ?? t("tagline")}
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {DESKTOP_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                isActive(l.to)
                  ? "bg-primary-soft text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(l.key as any)}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
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

          <Link
            to="/sell"
            className="hidden items-center gap-1.5 rounded-full hero-gradient px-4 py-2 text-sm font-semibold text-white shadow-float md:inline-flex"
          >
            <Plus className="size-4" />
            {t("sell")}
          </Link>
        </div>

      </div>
    </header>
  );
}
