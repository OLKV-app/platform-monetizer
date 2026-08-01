import { useState, useEffect } from "react";
import { ExternalLink, Sparkles } from "lucide-react";
import { getAdMobConfig, type AdMobConfig } from "@/lib/admob";

interface AdMobBannerProps {
  slot: "home" | "listing" | "search" | "native";
  className?: string;
  compact?: boolean;
}

export function AdMobBanner({ slot, className = "", compact = false }: AdMobBannerProps) {
  const [config, setConfig] = useState<AdMobConfig>(getAdMobConfig());
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    setConfig(getAdMobConfig());
  }, []);

  if (!config.enabled || closed) return null;

  // Check specific slot toggle
  if (slot === "home" && !config.showOnHome) return null;
  if (slot === "listing" && !config.showOnListings) return null;
  if (slot === "search" && !config.showOnSearch) return null;

  if (compact) {
    return (
      <div
        className={`relative overflow-hidden rounded-xl border border-border/60 bg-muted/30 p-2.5 text-xs shadow-xs ${className}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary uppercase">
              Ad
            </span>
            <span className="truncate text-xs font-medium text-foreground">
              Express Marine & Travel Services • Lakshadweep
            </span>
          </div>
          <button
            onClick={() => setClosed(true)}
            className="text-muted-foreground hover:text-foreground text-[11px] px-1"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border/80 bg-surface p-3 shadow-xs transition-all hover:border-primary/30 ${className}`}
    >
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5">
        <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground uppercase">
          Ad
        </span>
        <button
          onClick={() => setClosed(true)}
          className="text-muted-foreground hover:text-foreground text-xs font-medium px-1"
          title="Close Ad"
        >
          ✕
        </button>
      </div>

      <a
        href="https://admob.google.com"
        target="_blank"
        rel="noreferrer"
        className="group block relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/5 via-background to-accent/5 p-3.5 ring-1 ring-border/60 hover:ring-primary/30 transition-all"
      >
        <div className="flex items-start justify-between gap-3 pr-10">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
              <Sparkles className="size-3.5 text-amber-500 shrink-0" />
              <span className="truncate">Lakshadweep Express Marine & Travel Services</span>
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">
              Fast inter-island vessel booking, scuba equipment rentals, and cargo shipping.
            </p>
          </div>
          <div className="shrink-0 text-right">
            <span className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground shadow-xs group-hover:scale-105 transition-transform">
              Visit <ExternalLink className="size-3" />
            </span>
          </div>
        </div>
      </a>
    </div>
  );
}
