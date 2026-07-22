import { Link } from "@tanstack/react-router";
import * as Icons from "lucide-react";

export interface Category {
  slug: string;
  name_en: string;
  name_ml: string;
  icon: string;
}

const categoryImages: Record<string, string> = {
  mobiles:
    "https://img.icons8.com/fluency/96/smartphone.png",
  electronics:
    "https://img.icons8.com/fluency/96/laptop.png",
  vehicles:
    "https://img.icons8.com/fluency/96/car.png",
  property:
    "https://img.icons8.com/fluency/96/home.png",
  fashion:
    "https://img.icons8.com/fluency/96/t-shirt.png",
  jobs:
    "https://img.icons8.com/fluency/96/briefcase.png",
  services:
    "https://img.icons8.com/fluency/96/services.png",
  pets:
    "https://img.icons8.com/fluency/96/dog.png",
  books:
    "https://img.icons8.com/fluency/96/books.png",
  sports:
    "https://img.icons8.com/fluency/96/basketball.png",
  furniture:
    "https://img.icons8.com/fluency/96/sofa.png",
  bikes:
    "https://img.icons8.com/fluency/96/motorcycle.png",
  computers:
    "https://img.icons8.com/fluency/96/desktop.png",
  appliances:
    "https://img.icons8.com/fluency/96/washing-machine.png",
  beauty:
    "https://img.icons8.com/fluency/96/lipstick.png",
  default:
    "https://img.icons8.com/fluency/96/package.png",
};

export function CategoryChip({
  cat,
  lang,
}: {
  cat: Category;
  lang: "en" | "ml";
}) {
  const Icon =
    ((Icons as unknown) as Record<
      string,
      React.ComponentType<{ className?: string }>
    >)[cat.icon] ?? Icons.Package;


  const image = categoryImages[cat.slug] ?? categoryImages.default;

  return (
    <Link
      to="/category/$slug"
      params={{ slug: cat.slug }}
      className="group flex w-[82px] shrink-0 flex-col items-center gap-2"
    >
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-surface ring-1 ring-border shadow-card transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg">
        <img
          src={image}
          alt={cat.name_en}
          className="h-11 w-11 object-contain"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            const parent = e.currentTarget.parentElement;
            if (parent) {
              parent.innerHTML = "";
            }
          }}
        />
        <Icon className="absolute h-6 w-6 text-primary opacity-0" />
      </div>

      <span className="line-clamp-2 text-center text-[11px] font-medium leading-tight">
        {lang === "ml" ? cat.name_ml : cat.name_en}
      </span>
    </Link>
  );
}
