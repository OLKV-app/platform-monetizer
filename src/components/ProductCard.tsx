import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { formatINR, timeAgo } from "@/lib/format";
import { useLang } from "@/lib/i18n";

export interface ListingCardData {
  id: string;
  title: string;
  price: number | string;
  island: string;
  condition: "new" | "used";
  created_at: string;
  image?: string | null;
}

export function ProductCard({ listing }: { listing: ListingCardData }) {
  const { t } = useLang();
  return (
    <Link to="/product/$id" params={{ id: listing.id }} className="group block space-y-2 animate-fade-up">
      <div className="relative overflow-hidden rounded-2xl bg-muted ring-1 ring-border">
        <div className="aspect-[3/4] w-full">
          {listing.image ? (
            <img src={listing.image} alt={listing.title} loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="grid size-full place-items-center text-xs text-muted-foreground">No photo</div>
          )}
        </div>
        <button
          onClick={(e) => { e.preventDefault(); }}
          className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-background/80 backdrop-blur ring-1 ring-border"
          aria-label="Favourite"
        >
          <Heart className="size-3.5" />
        </button>
        <span
          className={
            "absolute bottom-2 left-2 rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white " +
            (listing.condition === "new" ? "bg-accent" : "bg-ink/80")
          }
        >
          {listing.condition === "new" ? t("new") : t("used")}
        </span>
      </div>
      <div className="px-0.5">
        <h3 className="line-clamp-1 text-sm font-medium">{listing.title}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{listing.island} • {timeAgo(listing.created_at)}</p>
        <p className="mt-1 text-base font-semibold text-primary">{formatINR(listing.price)}</p>
      </div>
    </Link>
  );
}
