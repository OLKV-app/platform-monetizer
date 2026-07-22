import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/chats/")({ component: ChatsList });

function ChatsList() {
  const { user } = useAuth();
  const { data = [] } = useQuery({
    queryKey: ["chats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("chats")
        .select(
          "id,updated_at,buyer_id,seller_id,listing_id,listings(id,title,listing_images(url,position))",
        )
        .order("updated_at", { ascending: false });
      if (error) {
        console.error("[chats]", error);
        return [];
      }
      const ids: string[] = [];
      for (const c of rows ?? []) {
        ids.push(c.buyer_id, c.seller_id);
      }
      const { fetchProfilesByIds } = await import("@/lib/attach-profiles");
      const profs = await fetchProfilesByIds(ids);
      return (rows ?? []).map((c: any) => ({
        ...c,
        buyer: profs.get(c.buyer_id) ?? null,
        seller: profs.get(c.seller_id) ?? null,
      }));
    },
  });
  return (
    <div className="min-h-screen bg-background pb-28">
      <TopBar subtitle="Chats" />
      <main className="mx-auto max-w-[430px] space-y-3 px-4 pt-4">
        <h1 className="font-heading text-2xl font-bold">Chats</h1>
        {data.length === 0 ? (
          <p className="rounded-2xl bg-surface p-8 text-center text-sm text-muted-foreground ring-1 ring-border">No conversations yet.</p>
        ) : (
          <div className="space-y-2">
            {data.map((c: any) => {
              const iAmBuyer = c.buyer_id === user?.id;
              const other = iAmBuyer ? c.seller : c.buyer;
              const img = c.listings?.listing_images?.sort((a: any, b: any) => a.position - b.position)[0]?.url;
              return (
                <Link key={c.id} to="/chats/$id" params={{ id: c.id }} className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-border">
                  <div className="size-12 overflow-hidden rounded-full bg-muted">
                    {other?.avatar_url && <img src={other.avatar_url} alt="" className="size-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 text-sm font-semibold">{other?.full_name ?? "OLKV user"}</div>
                    <div className="line-clamp-1 text-xs text-muted-foreground">{c.listings?.title}</div>
                  </div>
                  {img && <div className="size-10 overflow-hidden rounded-lg bg-muted"><img src={img} alt="" className="size-full object-cover" /></div>}
                  <div className="text-[10px] text-muted-foreground">{timeAgo(c.updated_at)}</div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
