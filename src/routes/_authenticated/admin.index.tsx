import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_authenticated/admin/")({ component: Dashboard });

const DAYS = 14;
function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}
function buildSeries(rows: { created_at: string }[]) {
  const map = new Map<string, number>();
  const days: string[] = [];
  const now = new Date();
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(now.getUTCDate() - i);
    const k = dayKey(d);
    days.push(k);
    map.set(k, 0);
  }
  for (const r of rows) {
    const k = r.created_at.slice(0, 10);
    if (map.has(k)) map.set(k, (map.get(k) ?? 0) + 1);
  }
  return days.map((k) => ({ day: k.slice(5), value: map.get(k) ?? 0 }));
}

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const since = new Date();
      since.setUTCDate(since.getUTCDate() - DAYS);
      const sinceIso = since.toISOString();
      const [
        users,
        listings,
        pending,
        reports,
        feedback,
        appeals,
        categories,
        banners,
        bannerRequests,
        listingRows,
        userRows,
        topCats,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("listings").select("id", { count: "exact", head: true }),
        supabase
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("resolved", false),
        supabase.from("feedback").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase
          .from("appeals")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase.from("categories").select("id", { count: "exact", head: true }),
        supabase.from("banners").select("id", { count: "exact", head: true }),
        supabase
          .from("banner_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase.from("listings").select("created_at").gte("created_at", sinceIso).limit(2000),
        supabase.from("profiles").select("created_at").gte("created_at", sinceIso).limit(2000),
        supabase.from("listings").select("category_slug").eq("status", "approved").limit(2000),
      ]);
      const byCat = new Map<string, number>();
      for (const r of topCats.data ?? []) {
        const k = (r as any).category_slug ?? "other";
        byCat.set(k, (byCat.get(k) ?? 0) + 1);
      }
      return {
        users: users.count ?? 0,
        listings: listings.count ?? 0,
        pending: pending.count ?? 0,
        reports: reports.count ?? 0,
        feedback: feedback.count ?? 0,
        appeals: appeals.count ?? 0,
        categories: categories.count ?? 0,
        banners: banners.count ?? 0,
        bannerRequests: bannerRequests.count ?? 0,
        listingSeries: buildSeries((listingRows.data ?? []) as any),
        userSeries: buildSeries((userRows.data ?? []) as any),
        topCategories: Array.from(byCat.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([slug, count]) => ({ slug, count })),
      };
    },
  });

  const cards: {
    label: string;
    value: number | "—";
    to: string;
    tone?: "primary" | "destructive";
  }[] = [
    { label: "Users", value: stats?.users ?? "—", to: "/admin/users" },
    { label: "Listings", value: stats?.listings ?? "—", to: "/admin/listings" },
    {
      label: "Pending review",
      value: stats?.pending ?? "—",
      tone: "primary",
      to: "/admin/listings",
    },
    { label: "Categories", value: stats?.categories ?? "—", to: "/admin/categories" },
    { label: "Banners", value: stats?.banners ?? "—", to: "/admin/banners" },
    {
      label: "Banner requests",
      value: stats?.bannerRequests ?? "—",
      tone: "primary",
      to: "/admin/banner-requests",
    },
    {
      label: "Open reports",
      value: stats?.reports ?? "—",
      tone: "destructive",
      to: "/admin/reports",
    },
    { label: "Open feedback", value: stats?.feedback ?? "—", to: "/admin/feedback" },
    {
      label: "Pending appeals",
      value: stats?.appeals ?? "—",
      tone: "primary",
      to: "/admin/appeals",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="rounded-2xl bg-surface p-4 ring-1 ring-border transition hover:ring-primary/40 hover:shadow-sm"
          >
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</div>
            <div
              className={
                "mt-1 font-heading text-3xl font-bold " +
                (c.tone === "primary"
                  ? "text-primary"
                  : c.tone === "destructive"
                    ? "text-destructive"
                    : "")
              }
            >
              {c.value}
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-surface p-4 ring-1 ring-border">
          <div className="mb-2 text-sm font-semibold">New listings (last {DAYS} days)</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.listingSeries ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl bg-surface p-4 ring-1 ring-border">
          <div className="mb-2 text-sm font-semibold">New users (last {DAYS} days)</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.userSeries ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--accent))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-surface p-4 ring-1 ring-border">
        <div className="mb-2 text-sm font-semibold">Top categories</div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats?.topCategories ?? []}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="slug" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
