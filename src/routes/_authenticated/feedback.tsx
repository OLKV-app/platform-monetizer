import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/feedback")({ component: FeedbackPage });

function FeedbackPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [category, setCategory] = useState("general");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: mine = [] } = useQuery({
    queryKey: ["my-feedback", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("feedback").select("*")
      .eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (subject.trim().length < 3 || message.trim().length < 10) {
      return toast.error("Please give a short subject and at least 10 characters of detail.");
    }
    setBusy(true);
    const { error } = await supabase.from("feedback").insert({
      user_id: user.id, category, subject: subject.trim(), message: message.trim(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Thanks — we've received your feedback.");
    setSubject(""); setMessage("");
    qc.invalidateQueries({ queryKey: ["my-feedback"] });
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <TopBar subtitle="Feedback" />
      <main className="mx-auto max-w-[430px] space-y-4 px-4 pt-4">
        <h1 className="font-heading text-2xl font-bold">Send feedback</h1>
        <p className="text-sm text-muted-foreground">
          Found a bug, have an idea, or need help? Tell us — an admin will reply here.
        </p>

        <form onSubmit={submit} className="space-y-3 rounded-2xl bg-surface p-4 ring-1 ring-border">
          <div>
            <Label>Category</Label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-background p-2 text-sm">
              <option value="general">General</option>
              <option value="bug">Bug</option>
              <option value="idea">Feature idea</option>
              <option value="account">Account help</option>
              <option value="safety">Safety concern</option>
            </select>
          </div>
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)}
              maxLength={120} required />
          </div>
          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)}
              maxLength={2000} required />
          </div>
          <Button type="submit" disabled={busy} className="w-full">Send</Button>
        </form>

        <section className="space-y-2">
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Your previous feedback
          </h2>
          {mine.length === 0 && (
            <p className="rounded-2xl bg-surface p-6 text-center text-sm text-muted-foreground ring-1 ring-border">
              Nothing yet.
            </p>
          )}
          {mine.map((f: any) => (
            <div key={f.id} className="rounded-2xl bg-surface p-4 ring-1 ring-border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{f.subject}</span>
                <span className={
                  "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase " +
                  (f.status === "answered" ? "bg-accent/20 text-accent-foreground"
                   : f.status === "closed" ? "bg-muted text-muted-foreground"
                   : "bg-primary/10 text-primary")
                }>{f.status}</span>
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">{f.category} • {timeAgo(f.created_at)}</div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{f.message}</p>
              {f.admin_reply && (
                <div className="mt-3 rounded-lg bg-background p-3 ring-1 ring-border">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Admin reply</div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{f.admin_reply}</p>
                </div>
              )}
            </div>
          ))}
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
