import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms of Service · OLKV" }, { name: "description", content: "Rules for buyers and sellers on OLKV." }] }),
  component: Terms,
});

function Terms() {
  const { data } = useQuery({
    queryKey: ["legal", "terms"],
    queryFn: async () => (await supabase.from("legal_pages").select("*").eq("slug", "terms").maybeSingle()).data,
  });
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[720px] items-center gap-2 px-4 py-3">
          <Link to="/" className="rounded-full p-2 hover:bg-muted"><ArrowLeft className="size-4" /></Link>
          <h1 className="font-heading text-lg font-bold">{data?.title ?? "Terms of Service"}</h1>
        </div>
      </header>
      <main className="mx-auto max-w-[720px] px-4 py-6">
        <article className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed">
          {data?.content ?? "Loading…"}
        </article>
      </main>
    </div>
  );
}
