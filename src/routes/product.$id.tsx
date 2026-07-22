import { createFileRoute, useParams, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { formatINR, timeAgo } from "@/lib/format";
import {
  Heart,
  Phone,
  MessageCircle,
  Share2,
  Flag,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/product/$id")({ component: Product });

function Product() {
  const { id } = useParams({ from: "/product/$id" });
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { t } = useLang();
  const [imgIdx, setImgIdx] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const { data: listing, error: lErr } = await supabase
        .from("listings")
        .select("*,listing_images(url,position)")
        .eq("id", id)
        .maybeSingle();
      if (lErr) {
        console.error("[product listing]", lErr);
        throw lErr;
      }
      if (!listing) return null;
      const { data: seller, error: pErr } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, phone, island, hide_contact")
        .eq("id", listing.user_id)
        .maybeSingle();
      if (pErr) console.error("[product seller]", pErr);
      return { ...listing, profiles: seller ?? null } as any;
    },
  });

  // Track a view once per page visit. Fire-and-forget: view_count is a
  // moderation/analytics signal (shown in the admin listings page), not
  // something the visitor needs to wait on.
  useEffect(() => {
    if (!id) return;
    supabase.rpc("increment_listing_views", { _listing_id: id });
  }, [id]);

  const { data: fav } = useQuery({
    queryKey: ["fav", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("favourites")
        .select("listing_id")
        .eq("user_id", user.id)
        .eq("listing_id", id)
        .maybeSingle();
      return !!data;
    },
  });

  async function toggleFav() {
    if (!user) return nav({ to: "/auth", search: { redirect: window.location.pathname } });
    if (fav) {
      await supabase.from("favourites").delete().eq("user_id", user.id).eq("listing_id", id);
    } else {
      await supabase.from("favourites").insert({ user_id: user.id, listing_id: id });
    }
    qc.invalidateQueries({ queryKey: ["fav", id] });
    qc.invalidateQueries({ queryKey: ["favourites"] });
  }

  async function startChat() {
    if (!user) return nav({ to: "/auth", search: { redirect: window.location.pathname } });
    if (!data) return;
    if (user.id === data.user_id) return toast.info("This is your own listing.");
    // upsert chat
    const { data: existing } = await supabase
      .from("chats")
      .select("id")
      .eq("listing_id", id)
      .eq("buyer_id", user.id)
      .maybeSingle();
    let chatId = existing?.id;
    if (!chatId) {
      const { data: created, error } = await supabase
        .from("chats")
        .insert({ listing_id: id, buyer_id: user.id, seller_id: data.user_id })
        .select("id")
        .maybeSingle();
      if (error) return toast.error(error.message);
      chatId = created?.id;
    }
    if (chatId) nav({ to: "/chats/$id", params: { id: chatId } });
  }

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: data?.title, url });
        return;
      } catch {
        // Web Share API rejected (unsupported context, or the person
        // cancelled the native share sheet) — fall through to clipboard
        // instead of doing nothing.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy the link — copy it from the address bar instead.");
    }
  }

  if (isLoading)
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>;
  if (error)
    return (
      <div className="p-8 text-center text-sm text-destructive">
        Couldn't load this listing. Please try again.
      </div>
    );
  if (!data) return <div className="p-8 text-center">Listing not found.</div>;

  const imgs = (data.listing_images ?? []).sort((a: any, b: any) => a.position - b.position);
  const seller: any = data.profiles;
  const digits = (data.contact_number || "").replace(/[^0-9+]/g, "");

  return (
    <div className="min-h-screen bg-background pb-24">
      <TopBar subtitle="Listing" />
      <main className="mx-auto max-w-[430px] space-y-5 px-4 pt-4">
        {/* Gallery */}
        <div className="relative overflow-hidden rounded-2xl bg-muted ring-1 ring-border">
          <div className="aspect-square w-full">
            {imgs.length > 0 ? (
              <img src={imgs[imgIdx].url} alt={data.title} className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center text-sm text-muted-foreground">
                No photos
              </div>
            )}
          </div>
          {imgs.length > 1 && (
            <>
              <button
                onClick={() => setImgIdx((i) => (i - 1 + imgs.length) % imgs.length)}
                className="absolute left-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-background/80 ring-1 ring-border"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                onClick={() => setImgIdx((i) => (i + 1) % imgs.length)}
                className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-background/80 ring-1 ring-border"
              >
                <ChevronRight className="size-4" />
              </button>
              <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                {imgs.map((_: any, i: number) => (
                  <span
                    key={i}
                    className={
                      "size-1.5 rounded-full " + (i === imgIdx ? "bg-white" : "bg-white/50")
                    }
                  />
                ))}
              </div>
            </>
          )}
          <button
            onClick={toggleFav}
            className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-background/85 ring-1 ring-border"
          >
            <Heart className={"size-4 " + (fav ? "fill-destructive text-destructive" : "")} />
          </button>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span
              className={
                "rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white " +
                (data.condition === "new" ? "bg-accent" : "bg-ink/80")
              }
            >
              {data.condition === "new" ? t("new") : t("used")}
            </span>
            {data.status !== "approved" && (
              <span className="rounded bg-muted px-2 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">
                {data.status}
              </span>
            )}
          </div>
          <h1 className="mt-2 font-heading text-2xl font-bold">{data.title}</h1>
          <div className="mt-1 text-2xl font-bold text-primary">{formatINR(data.price)}</div>
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3" /> {data.island}
            {data.location ? ` • ${data.location}` : ""} • {timeAgo(data.created_at)}
          </div>
        </div>

        <section className="rounded-2xl bg-surface p-4 ring-1 ring-border">
          <h2 className="mb-2 font-heading font-semibold">Description</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {data.description}
          </p>
        </section>

        {/* Seller */}
        {seller && (
          <section className="rounded-2xl bg-surface p-4 ring-1 ring-border">
            <h2 className="mb-3 font-heading font-semibold">Seller</h2>
            <div className="flex items-center gap-3">
              <div className="size-12 overflow-hidden rounded-full bg-muted">
                {seller.avatar_url && (
                  <img src={seller.avatar_url} alt="" className="size-full object-cover" />
                )}
              </div>
              <div>
                <div className="font-medium">{seller.full_name ?? "OLKV user"}</div>
                <div className="text-xs text-muted-foreground">{seller.island ?? data.island}</div>
              </div>
            </div>
          </section>
        )}

        {seller && <SellerReviews sellerId={seller.id} sellerName={seller.full_name ?? "seller"} />}

        {/* Actions */}
        <div className={"grid gap-2 " + (!seller?.hide_contact && digits ? "grid-cols-2" : "grid-cols-1")}>
          {!seller?.hide_contact && digits && (
            <a
              href={`tel:${digits}`}
              className="flex flex-col items-center gap-1 rounded-2xl bg-primary py-3 text-primary-foreground shadow-float"
            >
              <Phone className="size-4" />
              <span className="text-xs font-semibold">{t("call")}</span>
            </a>
          )}
          <button
            onClick={startChat}
            className="flex flex-col items-center gap-1 rounded-2xl bg-surface py-3 ring-1 ring-border"
          >
            <MessageCircle className="size-4" />
            <span className="text-xs font-semibold">{t("chat")}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={share}
            className="flex items-center justify-center gap-2 rounded-xl bg-muted py-2 text-sm"
          >
            <Share2 className="size-4" /> {t("share")}
          </button>
          <Dialog open={reportOpen} onOpenChange={setReportOpen}>
            <DialogTrigger asChild>
              <button className="flex items-center justify-center gap-2 rounded-xl bg-muted py-2 text-sm">
                <Flag className="size-4" /> {t("report")}
              </button>
            </DialogTrigger>
            <ReportDialog listingId={id} onClose={() => setReportOpen(false)} />
          </Dialog>
        </div>
      </main>
    </div>
  );
}

function ReportDialog({ listingId, onClose }: { listingId: string; onClose: () => void }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (!user) return nav({ to: "/auth", search: { redirect: window.location.pathname } });
    setBusy(true);
    const { error } = await supabase
      .from("reports")
      .insert({ listing_id: listingId, reporter_id: user.id, reason, details });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Thanks — we'll review it.");
    onClose();
  }
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Report this listing</DialogTitle>
      </DialogHeader>
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-full rounded-lg border bg-background p-2 text-sm"
      >
        <option value="spam">Spam / duplicate</option>
        <option value="scam">Fraud / scam</option>
        <option value="offensive">Offensive content</option>
        <option value="wrong_category">Wrong category</option>
        <option value="other">Other</option>
      </select>
      <Textarea
        placeholder="Details (optional)"
        value={details}
        onChange={(e) => setDetails(e.target.value)}
      />
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={busy}>
          Submit report
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function SellerReviews({ sellerId, sellerName }: { sellerId: string; sellerName: string }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews", sellerId],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("[reviews]", error);
        return [];
      }
      const { fetchProfilesByIds, attachProfiles } = await import("@/lib/attach-profiles");
      const profs = await fetchProfilesByIds((rows ?? []).map((r: any) => r.reviewer_id));
      return attachProfiles(rows ?? [], "reviewer_id", profs);
    },
  });

  const { data: mine } = useQuery({
    queryKey: ["my-review", sellerId, user?.id],
    enabled: !!user && user.id !== sellerId,
    queryFn: async () =>
      (
        await supabase
          .from("reviews")
          .select("*")
          .eq("seller_id", sellerId)
          .eq("reviewer_id", user!.id)
          .maybeSingle()
      ).data,
  });

  const avg = reviews.length
    ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length
    : 0;

  async function submit() {
    if (!user) return nav({ to: "/auth", search: { redirect: window.location.pathname } });
    if (user.id === sellerId) return toast.info("You can't review yourself.");
    setBusy(true);
    const payload = {
      seller_id: sellerId,
      reviewer_id: user.id,
      rating,
      comment: comment.trim() || null,
    };
    const { error } = mine
      ? await supabase.from("reviews").update(payload).eq("id", mine.id)
      : await supabase.from("reviews").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(mine ? "Review updated" : "Review posted");
    setOpen(false);
    setComment("");
    qc.invalidateQueries({ queryKey: ["reviews", sellerId] });
    qc.invalidateQueries({ queryKey: ["my-review", sellerId] });
  }

  const canReview = user && user.id !== sellerId;

  return (
    <section className="rounded-2xl bg-surface p-4 ring-1 ring-border">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-heading font-semibold">Seller reviews</h2>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            {reviews.length > 0 ? (
              <>
                <Star className="size-3 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold text-foreground">{avg.toFixed(1)}</span>
                <span>
                  · {reviews.length} review{reviews.length === 1 ? "" : "s"}
                </span>
              </>
            ) : (
              "No reviews yet"
            )}
          </div>
        </div>
        {canReview && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setRating(mine?.rating ?? 5);
              setComment(mine?.comment ?? "");
              setOpen((o) => !o);
            }}
          >
            {mine ? "Edit review" : "Write review"}
          </Button>
        )}
      </div>

      {open && canReview && (
        <div className="mb-3 space-y-2 rounded-xl bg-background p-3 ring-1 ring-border">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)}>
                <Star
                  className={
                    "size-6 " +
                    (n <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")
                  }
                />
              </button>
            ))}
          </div>
          <Textarea
            rows={3}
            placeholder={`Share your experience with ${sellerName}…`}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={submit} disabled={busy}>
              {mine ? "Update" : "Post"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {reviews.slice(0, 5).map((r: any) => (
          <div key={r.id} className="rounded-xl bg-background p-3 ring-1 ring-border">
            <div className="flex items-center gap-2">
              <div className="size-7 overflow-hidden rounded-full bg-muted">
                {r.profiles?.avatar_url && (
                  <img src={r.profiles.avatar_url} alt="" className="size-full object-cover" />
                )}
              </div>
              <span className="text-sm font-medium">{r.profiles?.full_name ?? "user"}</span>
              <div className="ml-auto flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={
                      "size-3 " +
                      (n <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")
                    }
                  />
                ))}
              </div>
            </div>
            {r.comment && <p className="mt-1.5 text-sm text-muted-foreground">{r.comment}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
