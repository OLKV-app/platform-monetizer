import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { timeAgo } from "@/lib/format";
import { Shield, ShieldOff } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({ component: AdminUsers });

function AdminUsers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "banned">("all");

  const { data = [] } = useQuery({
    queryKey: ["admin-users", tab],
    queryFn: async () => {
      let q = supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (tab === "banned") q = q.eq("is_banned", true);
      const { data: rows, error } = await q;
      if (error) {
        console.error("[admin-users]", error);
        return [];
      }
      const ids = (rows ?? []).map((r: any) => r.id);
      const rolesRes = ids.length
        ? await supabase.from("user_roles").select("user_id, role").in("user_id", ids)
        : { data: [] as any[] };
      const rmap = new Map<string, any[]>();
      for (const r of rolesRes.data ?? []) {
        const arr = rmap.get(r.user_id) ?? [];
        arr.push({ role: r.role });
        rmap.set(r.user_id, arr);
      }
      return (rows ?? []).map((u: any) => ({ ...u, user_roles: rmap.get(u.id) ?? [] }));
    },
  });

  const filtered = data.filter((u: any) => {
    const s = search.trim().toLowerCase();
    if (!s) return true;
    return (u.full_name?.toLowerCase() ?? "").includes(s)
      || (u.phone ?? "").includes(s)
      || (u.island?.toLowerCase() ?? "").includes(s);
  });

  async function unban(id: string) {
    const { error } = await supabase.from("profiles")
      .update({ is_banned: false, ban_reason: null, banned_at: null }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("User unbanned");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5">
          {(["all","banned"] as const).map((s) => (
            <button key={s} onClick={() => setTab(s)} className={"rounded-full px-3 py-1 text-xs font-semibold ring-1 " +
              (tab === s ? "bg-primary text-primary-foreground ring-primary" : "bg-surface ring-border")}>{s}</button>
          ))}
        </div>
        <Input placeholder="Search name, phone, island…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="ml-auto max-w-xs" />
      </div>

      <div className="space-y-2">
        {filtered.map((u: any) => (
          <div key={u.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-border">
            <div className="size-11 shrink-0 overflow-hidden rounded-full bg-muted">
              {u.avatar_url && <img src={u.avatar_url} alt="" className="size-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{u.full_name ?? "—"}</span>
                {u.user_roles?.some((r: any) => r.role === "admin") && (
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary">Admin</span>
                )}
                {u.is_banned && (
                  <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-destructive">Banned</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {u.phone ?? "no phone"} • {u.island ?? "—"} • joined {timeAgo(u.created_at)}
              </div>
              {u.is_banned && u.ban_reason && (
                <div className="mt-1 text-xs text-destructive">Reason: {u.ban_reason}</div>
              )}
            </div>
            <div className="flex gap-2">
              {u.is_banned ? (
                <Button size="sm" variant="outline" onClick={() => unban(u.id)}>
                  <ShieldOff className="mr-1 size-3" /> Unban
                </Button>
              ) : (
                <BanDialog user={u} onDone={() => qc.invalidateQueries({ queryKey: ["admin-users"] })} />
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="rounded-2xl bg-surface p-8 text-center text-sm text-muted-foreground ring-1 ring-border">
            No users found.
          </p>
        )}
      </div>
    </div>
  );
}

function BanDialog({ user, onDone }: { user: any; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  async function ban() {
    if (reason.trim().length < 3) return toast.error("Give a reason.");
    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      is_banned: true, ban_reason: reason.trim(), banned_at: new Date().toISOString(),
    }).eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("User banned");
    setOpen(false); setReason(""); onDone();
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive"><Shield className="mr-1 size-3" /> Ban</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ban {user.full_name ?? "user"}?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          The user will be signed out of all sessions on next check, their listings will be hidden from
          the marketplace, and they'll see the ban screen where they can appeal.
        </p>
        <Textarea placeholder="Reason (shown to the user)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={ban} disabled={busy}>Ban user</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
