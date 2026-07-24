import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { ISLANDS } from "@/lib/islands";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { uploadFile } from "@/lib/storage";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { X, Upload, Loader2, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sell")({
  component: Sell,
});

const schema = z.object({
  title: z.string().trim().min(4, "Title must be at least 4 characters").max(120),
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(4000),
  price: z.coerce.number().min(0, "Price must be 0 or greater").max(100000000),
  category_slug: z.string().min(1, "Please select a category"),
  condition: z.enum(["new", "used"]),
  island: z.string().min(1, "Please select an island"),
  location: z.string().max(120).optional(),
  contact_number: z.string().trim().min(6, "Contact number is required").max(20),
});

function Sell() {
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { t } = useLang();

  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [failed, setFailed] = useState(false);

  const { data: cats = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () =>
      (await supabase.from("categories").select("*").eq("active", true).order("position")).data ??
      [],
  });

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    category_slug: "",
    condition: "used" as "new" | "used",
    island: "",
    location: "",
    contact_number: "",
  });

  function addFiles(list: FileList | null) {
    if (!list) return;
    const arr = Array.from(list).filter((f) => f.type.startsWith("image/"));
    setFiles((prev) => [...prev, ...arr].slice(0, 10));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    const parsed = schema.safeParse({
      ...form,
      price: form.price,
    });

    if (!parsed.success) {
      return toast.error(parsed.error.issues[0].message);
    }

    if (!user) {
      return toast.error("You must be logged in to publish a listing");
    }

    if (files.length === 0) {
      return toast.error("Add at least one photo");
    }

    setBusy(true);
    setFailed(false);
    setUploadStatus("Preparing listing upload...");

    const listingId = crypto.randomUUID();

    try {
      // 1. Upload Images to Firebase Storage FIRST
      const uploads: { listing_id: string; url: string; position: number }[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filename = `${listingId}/${Date.now()}-${i}.webp`;

        setUploadStatus(`Uploading image ${i + 1} of ${files.length}...`);

        const url = await uploadFile({
          type: "listing",
          user: { uid: user.uid, id: user.id },
          listingId,
          file,
          filename,
          onProgress: (progress) => {
            setUploadStatus(
              `Uploading image ${i + 1} of ${files.length} (${progress.percentage}%)...`,
            );
          },
        });

        uploads.push({
          listing_id: listingId,
          url,
          position: i,
        });
      }

      // 2. Create Database Record
      setUploadStatus("Saving listing details...");

      const { error: listingError } = await supabase.from("listings").insert({
        id: listingId,
        user_id: user.id,
        title: parsed.data.title,
        description: parsed.data.description,
        price: parsed.data.price,
        category_slug: parsed.data.category_slug,
        condition: parsed.data.condition,
        island: parsed.data.island,
        location: parsed.data.location || null,
        contact_number: parsed.data.contact_number,
        status: "approved",
      });

      if (listingError) throw listingError;

      // 3. Save Image URLs
      setUploadStatus("Attaching images to listing...");

      const { error: imageError } = await supabase.from("listing_images").insert(uploads);

      if (imageError) throw imageError;

      // 4. Refresh Cache
      setUploadStatus("Finalizing...");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["listings"] }),
        qc.invalidateQueries({ queryKey: ["my-ads"] }),
        qc.invalidateQueries({ queryKey: ["recent-listings"] }),
        qc.invalidateQueries({ queryKey: ["featured-listings"] }),
      ]);

      // 5. Success Message & Navigation
      toast.success("Your listing has been published successfully.");

      nav({
        to: "/product/$id",
        params: { id: listingId },
      });
    } catch (err: any) {
      console.error("Failed to publish listing:", err);
      setFailed(true);
      toast.error(err?.message ?? "Could not publish listing. Please try again.");
    } finally {
      setBusy(false);
      setUploadStatus("");
    }
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <TopBar subtitle={t("sell")} />

      <main className="mx-auto max-w-[430px] space-y-4 px-4 pt-4">
        <h1 className="font-heading text-2xl font-bold">Post a Listing</h1>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>{t("photos")}</Label>

            <div className="mt-2 grid grid-cols-4 gap-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="relative aspect-square overflow-hidden rounded-lg bg-muted"
                >
                  <img src={URL.createObjectURL(file)} alt="" className="size-full object-cover" />

                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                    className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-background/90"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}

              {files.length < 10 && (
                <label className="grid aspect-square cursor-pointer place-items-center rounded-lg border-2 border-dashed border-border bg-muted/30 text-muted-foreground">
                  <Upload className="size-5" />

                  <input
                    hidden
                    multiple
                    type="file"
                    accept="image/*"
                    onChange={(e) => addFiles(e.target.files)}
                  />
                </label>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="title">{t("title")}</Label>

            <Input
              id="title"
              required
              maxLength={120}
              value={form.title}
              onChange={(e) =>
                setForm({
                  ...form,
                  title: e.target.value,
                })
              }
            />
          </div>

          <div>
            <Label htmlFor="desc">{t("description")}</Label>

            <Textarea
              id="desc"
              required
              rows={5}
              maxLength={4000}
              value={form.description}
              onChange={(e) =>
                setForm({
                  ...form,
                  description: e.target.value,
                })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="price">{t("price")}</Label>

              <Input
                id="price"
                required
                min={0}
                type="number"
                value={form.price}
                onChange={(e) =>
                  setForm({
                    ...form,
                    price: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <Label>{t("condition")}</Label>

              <Select
                value={form.condition}
                onValueChange={(value) =>
                  setForm({
                    ...form,
                    condition: value as "new" | "used",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="new">{t("new")}</SelectItem>

                  <SelectItem value="used">{t("used")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>{t("category")}</Label>

            <Select
              value={form.category_slug}
              onValueChange={(value) =>
                setForm({
                  ...form,
                  category_slug: value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose category" />
              </SelectTrigger>

              <SelectContent>
                {cats.map((category) => (
                  <SelectItem key={category.slug} value={category.slug}>
                    {category.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{t("island")}</Label>

            <Select
              value={form.island}
              onValueChange={(value) =>
                setForm({
                  ...form,
                  island: value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select island" />
              </SelectTrigger>

              <SelectContent>
                {ISLANDS.map((island) => (
                  <SelectItem key={island} value={island}>
                    {island}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="loc">{t("location")}</Label>

            <Input
              id="loc"
              maxLength={120}
              value={form.location}
              onChange={(e) =>
                setForm({
                  ...form,
                  location: e.target.value,
                })
              }
            />
          </div>

          <div>
            <Label htmlFor="contact">{t("contact_number")}</Label>

            <Input
              id="contact"
              required
              type="tel"
              placeholder="+91..."
              value={form.contact_number}
              onChange={(e) =>
                setForm({
                  ...form,
                  contact_number: e.target.value,
                })
              }
            />
          </div>

          {busy && (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-muted p-3 text-sm text-foreground">
              <Loader2 className="size-4 animate-spin text-primary" />
              <span>{uploadStatus || "Processing..."}</span>
            </div>
          )}

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Publishing...
              </span>
            ) : failed ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="size-4" />
                Retry Submission
              </span>
            ) : (
              t("publish")
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Your listing will be published immediately after submission.
          </p>
        </form>
      </main>

      <BottomNav />
    </div>
  );
}
