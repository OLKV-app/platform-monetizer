import { createFileRoute, Outlet, redirect, Link, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/auth" });
    const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!role) throw redirect({ to: "/" });
  },
  component: AdminLayout,
});

function AdminLayout() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const tabs = [
    { to: "/admin", label: "Dashboard" },
    { to: "/admin/listings", label: "Listings" },
    { to: "/admin/users", label: "Users" },
    { to: "/admin/reports", label: "Reports" },
    { to: "/admin/feedback", label: "Feedback" },
    { to: "/admin/appeals", label: "Appeals" },
    { to: "/admin/categories", label: "Categories" },
    { to: "/admin/banners", label: "Banners" },
    { to: "/admin/banner-requests", label: "Banner requests" },

  ];
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="flex items-center justify-between">
            <Link to="/" className="font-heading text-xl font-bold text-primary">OLKV Admin</Link>
            <Link to="/" className="text-xs text-muted-foreground">← Back to app</Link>
          </div>
          <div className="no-scrollbar mt-3 flex gap-1 overflow-x-auto">
            {tabs.map((t) => {
              const active = path === t.to || (t.to !== "/admin" && path.startsWith(t.to));
              return (
                <Link key={t.to} to={t.to} className={"shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 " + (active ? "bg-primary text-primary-foreground ring-primary" : "bg-surface ring-border")}>{t.label}</Link>
              );
            })}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6"><Outlet /></main>
    </div>
  );
}
