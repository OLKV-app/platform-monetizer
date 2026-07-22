import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { CategoryChip } from "@/components/CategoryChip";
import { ProductCard } from "@/components/ProductCard";
import { HorizontalScrollSection } from "@/components/HorizontalScrollSection";
import { useLang } from "@/lib/i18n";
import { formatINR } from "@/lib/format";
import { Search as SearchIcon } from "lucide-react";

export const Route = createFileRoute("/")({ component: Home });

async function fetchCategories() {
  const { data } = await supabase.from("categories").select("*").eq("active", true).order("position");
  return data ?? [];
}
async function fetchBanners() {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("banners")
    .select("*")
    .eq("active", true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order("position");
  return data ?? [];
}
async function fetchListings(filter: "featured" | "latest" | "nearby" | "pinned") {
  let q = supabase
    .from("listings")
    .select("id,title,price,island,condition,created_at,featured,is_pinned,listing_images(url,position)")
    .eq("status", "approved")
    .eq("is_hidden", false);
  if (filter === "featured") q = q.eq("featured", true).order("created_at", { ascending: false }).limit(6);
  else if (filter === "pinned") q = q.eq("is_pinned", true).order("pin_priority", { ascending: false }).limit(8);
  else q = q.order("created_at", { ascending: false }).limit(filter === "latest" ? 8 : 6);
  const { data } = await q;
  return (data ?? []).map((l: any) => ({
    ...l,
    image: l.listing_images?.sort((a: any, b: any) => a.position - b.position)[0]?.url ?? null,
  }));
}

function Home() {
  const { t, lang } = useLang();
  const [query, setQuery] = useState("");
  const { data: cats = [] } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const { data: banners = [] } = useQuery({ queryKey: ["banners"], queryFn: fetchBanners });
  const { data: pinned = [] } = useQuery({ queryKey: ["listings", "pinned"], queryFn: () => fetchListings("pinned") });
  const { data: featured = [] } = useQuery({ queryKey: ["listings", "featured"], queryFn: () => fetchListings("featured") });
  const { data: latest = [] } = useQuery({ queryKey: ["listings", "latest"], queryFn: () => fetchListings("latest") });
  const { data: nearby = [] } = useQuery({ queryKey: ["listings", "nearby"], queryFn: () => fetchListings("nearby") });

  const [bannerIdx, setBannerIdx] = useState(0);
  useEffect(() => {
    if (!banners.length) return;
    const id = setInterval(() => setBannerIdx((i) => (i + 1) % banners.length), 4000);
    return () => clearInterval(id);
  }, [banners.length]);

  return (
    <div className="min-h-screen bg-background pb-28">
      <TopBar />
      <main className="mx-auto max-w-[430px] space-y-6 px-4 pt-4">
        <form
          action="/search"
          className="relative"
          onSubmit={(e) => {
            e.preventDefault();
            window.location.href = `/search?q=${encodeURIComponent(query)}`;
          }}
        >
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search_placeholder")}
            className="w-full rounded-xl bg-surface py-3 pl-10 pr-4 text-sm outline-none ring-1 ring-border transition-shadow focus:ring-2 focus:ring-primary/30"
          />
        </form>

        <HorizontalScrollSection title={t("categories")}>
          {cats.map((c) => (
            <div key={c.slug} className="shrink-0 [scroll-snap-align:start]">
              <CategoryChip cat={c as any} lang={lang} />
            </div>
          ))}
        </HorizontalScrollSection>

        {banners.length > 0 ? (
          <section className="relative overflow-hidden rounded-2xl ring-1 ring-border">
            <div className="aspect-[2/1] w-full">
              {banners.map((b, i) => (
                <a
                  key={b.id}
                  href={b.link_url || "#"}
                  className={"absolute inset-0 transition-opacity duration-700 " + (i === bannerIdx ? "opacity-100" : "opacity-0")}
                >
                  <img src={b.image_url} alt={b.title} className="size-full object-cover" />
                  <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-ink/70 to-transparent p-4 text-white">
                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">{b.subtitle}</div>
                    <div className="font-heading text-lg font-semibold">{b.title}</div>
                  </div>
                </a>
              ))}
            </div>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {banners.map((_, i) => (
                <span key={i} className={"size-1.5 rounded-full " + (i === bannerIdx ? "bg-white" : "bg-white/50")} />
              ))}
            </div>
          </section>
        ) : (
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-accent p-6 text-white">
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">OLKV</div>
            <h3 className="font-heading text-xl font-semibold leading-tight">Buy • Sell • Connect<br />across Lakshadweep</h3>
            <Link to="/sell" className="mt-3 inline-block rounded-lg bg-white/95 px-4 py-2 text-xs font-bold text-primary">Start selling</Link>
          </section>
        )}

        {pinned.length > 0 && (
          <HorizontalScrollSection title="Pinned" viewAllTo="/search">
            {pinned.map((l) => (
              <Link
                key={l.id}
                to="/product/$id"
                params={{ id: l.id }}
                className="w-40 shrink-0 rounded-2xl bg-surface p-2 ring-1 ring-border [scroll-snap-align:start]"
              >
                <div className="aspect-square w-full overflow-hidden rounded-xl bg-muted">
                  {l.image && <img src={l.image} alt="" className="size-full object-cover" />}
                </div>
                <div className="mt-2 line-clamp-1 text-sm font-medium">{l.title}</div>
                <div className="text-xs text-muted-foreground">{l.island}</div>
                <div className="mt-0.5 text-sm font-semibold text-primary">{formatINR(l.price)}</div>
              </Link>
            ))}
          </HorizontalScrollSection>
        )}

        {featured.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-heading text-base font-semibold">{t("featured")}</h2>
            <div className="grid grid-cols-2 gap-3">
              {featured[0] && (
                <Link
                  to="/product/$id"
                  params={{ id: featured[0].id }}
                  className="col-span-2 flex items-center gap-4 rounded-2xl bg-surface p-3 ring-1 ring-border"
                >
                  <div className="size-24 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {featured[0].image && <img src={featured[0].image} alt="" className="size-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-accent">{t("featured")}</div>
                    <h3 className="line-clamp-2 font-heading text-base font-medium">{featured[0].title}</h3>
                    <p className="mt-1 font-semibold text-primary">{formatINR(featured[0].price)}</p>
                  </div>
                </Link>
              )}
              {featured.slice(1, 3).map((f) => (
                <Link key={f.id} to="/product/$id" params={{ id: f.id }} className="flex flex-col rounded-2xl bg-surface p-3 ring-1 ring-border">
                  <div className="aspect-square w-full overflow-hidden rounded-xl bg-muted">
                    {f.image && <img src={f.image} alt="" className="size-full object-cover" />}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">{f.island}</div>
                  <h3 className="line-clamp-1 text-sm font-medium">{f.title}</h3>
                  <p className="mt-1 text-sm font-semibold text-primary">{formatINR(f.price)}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold">{t("latest")}</h2>
            <Link to="/search" className="text-xs font-semibold text-primary">{t("view_all")}</Link>
          </div>
          {latest.length === 0 ? (
            <p className="rounded-2xl bg-surface p-6 text-center text-sm text-muted-foreground ring-1 ring-border">
              No listings yet. Be the first to <Link to="/sell" className="font-semibold text-primary">post one</Link>.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-6">
              {latest.map((l) => <ProductCard key={l.id} listing={l as any} />)}
            </div>
          )}
        </section>

        {nearby.length > 0 && (
          <HorizontalScrollSection title={t("nearby")}>
            {nearby.map((l) => (
              <Link
                key={l.id}
                to="/product/$id"
                params={{ id: l.id }}
                className="flex w-64 shrink-0 items-center gap-3 rounded-2xl bg-surface p-2 ring-1 ring-border [scroll-snap-align:start]"
              >
                <div className="size-16 overflow-hidden rounded-xl bg-muted">
                  {l.image && <img src={l.image} alt="" className="size-full object-cover" />}
                </div>
                <div className="min-w-0">
                  <h4 className="line-clamp-1 text-sm font-medium">{l.title}</h4>
                  <p className="text-xs text-muted-foreground">{l.island}</p>
                  <p className="text-sm font-semibold text-primary">{formatINR(l.price)}</p>
                </div>
              </Link>
            ))}
          </HorizontalScrollSection>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
