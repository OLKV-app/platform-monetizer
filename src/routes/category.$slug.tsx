import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { ProductCard } from "@/components/ProductCard";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/category/$slug")({ component: CategoryPage });

function CategoryPage() {
  const { slug } = useParams({ from: "/category/$slug" });
  const { t, lang } = useLang();
  const { data: cat } = useQuery({
    queryKey: ["category", slug],
    queryFn: async () =>
      (await supabase.from("categories").select("*").eq("slug", slug).maybeSingle()).data,
  });
  const { data: listings = [] } = useQuery({
    queryKey: ["listings-by-cat", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("listings")
        .select("id,title,price,island,condition,created_at,listing_images(url,position)")
        .eq("status", "approved")
        .eq("is_hidden", false)
        .eq("category_slug", slug)
        .order("created_at", { ascending: false })
        .limit(60);
      return (data ?? []).map((l: any) => ({
        ...l,
        image: l.listing_images?.sort((a: any, b: any) => a.position - b.position)[0]?.url ?? null,
      }));
    },
  });

  return (
    <div className="min-h-screen bg-background pb-28">
      <TopBar subtitle={cat ? (lang === "ml" ? cat.name_ml : cat.name_en) : ""} />
      <main className="mx-auto max-w-[430px] space-y-4 px-4 pt-4">
        <h1 className="font-heading text-2xl font-bold">
          {cat ? (lang === "ml" ? cat.name_ml : cat.name_en) : slug}
        </h1>
        <div className="text-xs text-muted-foreground">{listings.length} listings</div>
        {listings.length === 0 ? (
          <p className="rounded-2xl bg-surface p-8 text-center text-sm text-muted-foreground ring-1 ring-border">
            Nothing here yet. Check back soon.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-6">
            {listings.map((l) => (
              <ProductCard key={l.id} listing={l as any} />
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
