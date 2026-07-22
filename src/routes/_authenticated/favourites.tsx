import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { ProductCard } from "@/components/ProductCard";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/favourites")({ component: Favs });

function Favs() {
  const { user } = useAuth();
  const { t } = useLang();
  const { data = [] } = useQuery({
    queryKey: ["favourites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("favourites")
        .select(
          "listing_id,listings(id,title,price,island,condition,created_at,status,is_hidden,listing_images(url,position))",
        )
        .eq("user_id", user!.id);
      return (data ?? [])
        .map((f: any) => f.listings)
        .filter((l: any) => l && !l.is_hidden && (l.status === "approved" || l.status === "sold"))
        .map((l: any) => ({
          ...l,
          image:
            l.listing_images?.sort((a: any, b: any) => a.position - b.position)[0]?.url ?? null,
        }));
    },
  });
  return (
    <div className="min-h-screen bg-background pb-28">
      <TopBar subtitle={t("favourites")} />
      <main className="mx-auto max-w-[430px] space-y-4 px-4 pt-4">
        <h1 className="font-heading text-2xl font-bold">{t("favourites")}</h1>
        {data.length === 0 ? (
          <p className="rounded-2xl bg-surface p-8 text-center text-sm text-muted-foreground ring-1 ring-border">
            No favourites yet. Tap the heart on any listing.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-6">
            {data.map((l: any) => (
              <ProductCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
