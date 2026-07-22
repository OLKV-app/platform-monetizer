import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy Policy · OLKV" }, { name: "description", content: "How OLKV collects, uses and protects your data." }] }),
  component: Privacy,
});

function Privacy() {
  const { data } = useQuery({
    queryKey: ["legal", "privacy"],
    queryFn: async () => (await supabase.from("legal_pages").select("*").eq("slug", "privacy").maybeSingle()).data,
  });
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[720px] items-center gap-2 px-4 py-3">
          <Link to="/" className="rounded-full p-2 hover:bg-muted"><ArrowLeft className="size-4" /></Link>
          <h1 className="font-heading text-lg font-bold">{data?.title ?? "Privacy Policy"}</h1>
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
