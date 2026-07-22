import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, MessageCircle, User, Plus } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const { t } = useLang();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const is = (p: string) => pathname === p || (p !== "/" && pathname.startsWith(p));

  const item = (to: string, icon: React.ReactNode, label: string, active: boolean) => (
    <Link
      to={to}
      className={cn(
        "flex flex-col items-center gap-1 px-3 py-1 transition-colors",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/50 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[430px] items-center justify-between px-6 pb-[env(safe-area-inset-bottom)] pt-2">
        {item("/", <Home className="size-5" />, t("home"), pathname === "/")}
        {item("/search", <Search className="size-5" />, t("search"), is("/search"))}
        <div className="-mt-8">
          <Link
            to="/sell"
            className="grid size-14 place-items-center rounded-full hero-gradient text-white shadow-float ring-4 ring-background transition-transform active:scale-95"
            aria-label={t("sell")}
          >
            <Plus className="size-6" />
          </Link>
        </div>
        {item("/chats", <MessageCircle className="size-5" />, t("chats"), is("/chats"))}
        {item("/profile", <User className="size-5" />, t("profile"), is("/profile"))}
      </div>
    </nav>
  );
}
