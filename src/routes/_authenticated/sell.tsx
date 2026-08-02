import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
import { uploadImage } from "@/services/upload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { X, Upload, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sell")({
  component: Sell,
});

const schema = z.object({
  title: z.string().trim().min(4).max(120),
  description: z.string().trim().min(10).max(4000),
  price: z.coerce.number().min(0).max(100000000),
  category_slug: z.string().min(1),
  condition: z.enum(["new", "used"]),
  island: z.string().min(1),
  location: z.string().max(120).optional(),
  contact_number: z.string().trim().min(6).max(20),
});

function Sell() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { t } = useLang();

  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const parsed = schema.safeParse({
      ...form,
      price: form.price,
    });

    if (!parsed.success) {
      return toast.error(parsed.error.issues[0].message);
    }

    if (!user) return;

    if (files.length === 0) {
      return toast.error("Add at least one photo");
    }

    // Show confirmation dialog
    setShowConfirmDialog(true);
  }

  async function confirmPublish() {
    setShowConfirmDialog(false);
    if (!user) return toast.error("You must be signed in");
    setBusy(true);
    setUploadProgress(0);

    const toastId = toast.loading("Publishing your listing...", {
      description: "Compressing and uploading images",
    });

    try {
      // Create listing first
      const { data: listing, error } = await supabase
        .from("listings")
        .insert({
          ...schema.parse({ ...form, price: form.price }),
          user_id: user.id,
          status: "approved",
        })
        .select("id")
        .maybeSingle();

      if (error || !listing) throw error;

      // Upload images with progress tracking
      const totalFiles = files.length;
      const uploads = await Promise.all(
        files.map(async (file, index) => {
          try {
            const result = await uploadImage(
              {
                type: "listing",
                file,
                listingId: listing.id,
                user: {
                  uid: user.uid,
                  id: user.id,
                },
              },
              (progress) => {
                // Update progress
                const fileProgress = ((index + progress.percentage / 100) / totalFiles) * 100;
                setUploadProgress(Math.round(fileProgress));
              }
            );

            return {
              listing_id: listing.id,
              url: result.url,
              position: index,
            };
          } catch (error) {
            console.error(`Failed to upload image ${index}:`, error);
            throw error;
          }
        })
      );

      // Save image records to database
      const { error: imageError } = await supabase.from("listing_images").insert(uploads);

      if (imageError) throw imageError;

      // Success toast with action button
      toast.success("Listing published successfully!", {
        id: toastId,
        description: `${files.length} images compressed and uploaded`,
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
        action: {
          label: "View Listing",
          onClick: () => nav({ to: "/my-ads" }),
        },
        duration: 5000,
      });

      // Navigate after short delay
      setTimeout(() => {
        nav({ to: "/my-ads" });
      }, 1000);
    } catch (err: any) {
      console.error("Publication error:", err);
      
      toast.error("Failed to publish listing", {
        id: toastId,
        description: err?.message ?? "Please try again",
        icon: <XCircle className="h-5 w-5 text-red-500" />,
        action: {
          label: "Retry",
          onClick: () => confirmPublish(),
        },
        duration: 7000,
      });
    } finally {
      setBusy(false);
      setUploadProgress(0);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <TopBar subtitle={t("sell")} />

      <main className="mx-auto max-w-[430px] md:max-w-5xl space-y-4 px-4 pt-4">
        <h1 className="font-heading text-2xl font-bold">Post a Listing</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            
            {files.length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                {files.length} image{files.length !== 1 ? 's' : ''} selected (will be compressed)
              </p>
            )}
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

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? (
              <>
                Publishing... {uploadProgress > 0 && `${uploadProgress}%`}
              </>
            ) : (
              t("publish")
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            ✓ Images will be automatically compressed before upload
            <br />
            ✓ Your listing will be published immediately
          </p>
        </form>
      </main>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ready to publish?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Please review your listing before publishing:</p>
              <ul className="list-inside list-disc space-y-1 text-sm">
                <li><strong>{form.title}</strong></li>
                <li>Price: {form.price}</li>
                <li>{files.length} photo{files.length !== 1 ? 's' : ''}</li>
                <li>Category: {cats.find(c => c.slug === form.category_slug)?.name_en}</li>
              </ul>
              <p className="mt-2 text-xs text-green-600">
                Images will be compressed and optimized automatically.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPublish} disabled={busy}>
              Confirm & Publish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
}
