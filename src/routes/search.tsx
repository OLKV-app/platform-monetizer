import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { ProductCard } from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { ISLANDS } from "@/lib/islands";
import { useLang } from "@/lib/i18n";
import { Search as SearchIcon, SlidersHorizontal } from "lucide-react";

const schema = z.object({
  q: z.string().optional().catch(""),
  cat: z.string().optional().catch(undefined),
  island: z.string().optional().catch(undefined),
  min: z.coerce.number().optional().catch(undefined),
  max: z.coerce.number().optional().catch(undefined),
});
export const Route = createFileRoute("/search")({ validateSearch: schema, component: SearchPage });

async function fetchCategories() {
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("active", true)
    .order("position");
  return data ?? [];
}

function SearchPage() {
  const { t, lang } = useLang();
  const search = Route.useSearch();
  const nav = Route.useNavigate();
  const [q, setQ] = useState(search.q ?? "");
  const [showFilter, setShowFilter] = useState(false);

  const { data: cats = [] } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["search", search],
    queryFn: async () => {
      let query = supabase
        .from("listings")
        .select("id,title,price,island,condition,created_at,listing_images(url,position)")
        .eq("status", "approved")
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(60);
      if (search.q) query = query.ilike("title", `%${search.q}%`);
      if (search.cat) query = query.eq("category_slug", search.cat);
      if (search.island) query = query.eq("island", search.island);
      if (search.min != null) query = query.gte("price", search.min);
      if (search.max != null) query = query.lte("price", search.max);
      const { data } = await query;
      return (data ?? []).map((l: any) => ({
        ...l,
        image: l.listing_images?.sort((a: any, b: any) => a.position - b.position)[0]?.url ?? null,
      }));
    },
  });

  function apply(patch: Record<string, any>) {
    nav({ search: (s: any) => ({ ...s, ...patch }) });
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <TopBar subtitle={t("search")} />
      <main className="mx-auto max-w-[430px] space-y-4 px-4 pt-4">
        <form
          className="relative"
          onSubmit={(e) => {
            e.preventDefault();
            apply({ q });
          }}
        >
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search_placeholder")}
            className="w-full rounded-xl bg-surface py-3 pl-10 pr-12 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="button"
            onClick={() => setShowFilter((s) => !s)}
            className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg bg-muted"
          >
            <SlidersHorizontal className="size-4" />
          </button>
        </form>

        {showFilter && (
          <div className="space-y-3 rounded-2xl bg-surface p-4 ring-1 ring-border">
            <div>
              <div className="mb-1 text-xs font-semibold">{t("category")}</div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => apply({ cat: undefined })}
                  className={
                    "rounded-full px-3 py-1 text-xs ring-1 " +
                    (!search.cat
                      ? "bg-primary text-primary-foreground ring-primary"
                      : "bg-background ring-border")
                  }
                >
                  All
                </button>
                {cats.map((c) => (
                  <button
                    key={c.slug}
                    onClick={() => apply({ cat: c.slug })}
                    className={
                      "rounded-full px-3 py-1 text-xs ring-1 " +
                      (search.cat === c.slug
                        ? "bg-primary text-primary-foreground ring-primary"
                        : "bg-background ring-border")
                    }
                  >
                    {lang === "ml" ? c.name_ml : c.name_en}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1 text-xs font-semibold">{t("island")}</div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => apply({ island: undefined })}
                  className={
                    "rounded-full px-3 py-1 text-xs ring-1 " +
                    (!search.island
                      ? "bg-primary text-primary-foreground ring-primary"
                      : "bg-background ring-border")
                  }
                >
                  All
                </button>
                {ISLANDS.map((i) => (
                  <button
                    key={i}
                    onClick={() => apply({ island: i })}
                    className={
                      "rounded-full px-3 py-1 text-xs ring-1 " +
                      (search.island === i
                        ? "bg-primary text-primary-foreground ring-primary"
                        : "bg-background ring-border")
                    }
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Min ₹"
                defaultValue={search.min ?? ""}
                onBlur={(e) => apply({ min: e.target.value ? Number(e.target.value) : undefined })}
              />
              <Input
                type="number"
                placeholder="Max ₹"
                defaultValue={search.max ?? ""}
                onBlur={(e) => apply({ max: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          {isFetching ? "Searching…" : `${results.length} results`}
        </div>
        {results.length === 0 && !isFetching ? (
          <p className="rounded-2xl bg-surface p-8 text-center text-sm text-muted-foreground ring-1 ring-border">
            No matches. Try a different filter.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-6">
            {results.map((l) => (
              <ProductCard key={l.id} listing={l as any} />
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
