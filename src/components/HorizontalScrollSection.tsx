import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  viewAllTo?: string;
  viewAllLabel?: string;
  children: ReactNode;
  className?: string;
}

export function HorizontalScrollSection({ title, viewAllTo, viewAllLabel = "View all", children, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [canL, setCanL] = useState(false);
  const [canR, setCanR] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanL(el.scrollLeft > 8);
    setCanR(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); };
  }, [update]);

  const scrollBy = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.8, 320), behavior: "smooth" });
  };

  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-base font-semibold">{title}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            disabled={!canL}
            aria-label="Scroll left"
            className="grid size-8 place-items-center rounded-full bg-surface ring-1 ring-border transition-opacity disabled:opacity-30"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            disabled={!canR}
            aria-label="Scroll right"
            className="grid size-8 place-items-center rounded-full bg-surface ring-1 ring-border transition-opacity disabled:opacity-30"
          >
            <ChevronRight className="size-4" />
          </button>
          {viewAllTo && (
            <Link to={viewAllTo} className="ml-1 text-xs font-semibold text-primary">
              {viewAllLabel}
            </Link>
          )}
        </div>
      </div>
      <div
        ref={ref}
        className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto scroll-smooth px-4 [scroll-snap-type:x_mandatory]"
      >
        {children}
      </div>
    </section>
  );
}
