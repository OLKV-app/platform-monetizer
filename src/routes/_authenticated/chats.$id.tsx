import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/lib/auth";
import { Send, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/chats/$id")({ component: ChatView });

function ChatView() {
  const { id } = useParams({ from: "/_authenticated/chats/$id" });
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const { data: chat } = useQuery({
    queryKey: ["chat", id],
    queryFn: async () => {
      const { data: c, error } = await supabase
        .from("chats")
        .select("*,listings(id,title,listing_images(url,position))")
        .eq("id", id)
        .maybeSingle();
      if (error) {
        console.error("[chat]", error);
        return null;
      }
      if (!c) return null;
      const { fetchProfilesByIds } = await import("@/lib/attach-profiles");
      const profs = await fetchProfilesByIds([c.buyer_id, c.seller_id]);
      return { ...c, buyer: profs.get(c.buyer_id) ?? null, seller: profs.get(c.seller_id) ?? null };
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", id],
    queryFn: async () => (await supabase.from("messages").select("*").eq("chat_id", id).order("created_at")).data ?? [],
  });

  useEffect(() => {
    const channel = supabase.channel("messages-" + id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${id}` }, () => {
        qc.invalidateQueries({ queryKey: ["messages", id] });
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, qc]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !user) return;
    const content = text.trim().slice(0, 2000);
    setText("");
    await supabase.from("messages").insert({ chat_id: id, sender_id: user.id, content });
    await supabase.from("chats").update({ updated_at: new Date().toISOString() }).eq("id", id);
  }

  const other = chat && (chat.buyer_id === user?.id ? chat.seller : chat.buyer);
  const img = chat?.listings?.listing_images?.sort((a: any, b: any) => a.position - b.position)[0]?.url;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[430px] items-center gap-3 px-3 py-3">
          <Link to="/chats" className="grid size-9 place-items-center rounded-full bg-muted"><ChevronLeft className="size-4" /></Link>
          <div className="size-9 overflow-hidden rounded-full bg-muted">{(other as any)?.avatar_url && <img src={(other as any).avatar_url} className="size-full object-cover" alt="" />}</div>
          <div className="min-w-0 flex-1">
            <div className="line-clamp-1 text-sm font-semibold">{(other as any)?.full_name ?? "OLKV user"}</div>
            {chat?.listings && (
              <Link to="/product/$id" params={{ id: chat.listings.id }} className="line-clamp-1 text-xs text-primary">{chat.listings.title}</Link>
            )}
          </div>
          {img && <img src={img} alt="" className="size-9 rounded-lg object-cover" />}
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[430px] flex-1 flex-col px-3 py-4">
        <div className="flex-1 space-y-2">
          {messages.map((m: any) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                  mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted"
                )}>{m.content}</div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
        <form onSubmit={send} className="sticky bottom-0 mt-3 flex gap-2 pb-[env(safe-area-inset-bottom)]">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" className="flex-1 rounded-full bg-surface px-4 py-3 text-sm ring-1 ring-border outline-none focus:ring-2 focus:ring-primary/30" />
          <button className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground"><Send className="size-4" /></button>
        </form>
      </main>
    </div>
  );
}
