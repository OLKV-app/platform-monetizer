import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadImage } from "@/services/upload";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/banner-requests")({
  component: BannerRequestsPage,
});

const empty = {
  title: "",
  description: "",
  link_url: "",
  duration_days: 7,
  notes: "",
};

function BannerRequestsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [form, setForm] = useState({ ...empty });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const { data = [] } = useQuery({
    queryKey: ["my-banner-requests", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (
        await supabase
          .from("banner_requests")
          .select("*")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
      ).data ?? [],
  });

  function handleSubmitClick() {
    if (!file) {
      return toast.error("Upload a banner image");
    }

    if (!form.title) {
      return toast.error("Title required");
    }

    // Show confirmation dialog
    setShowConfirmDialog(true);
  }

  async function confirmSubmit() {
    if (!user) return;
    
    setShowConfirmDialog(false);
    setBusy(true);
    setUploadProgress(0);

    const toastId = toast.loading("Submitting banner request...", {
      description: "Compressing and uploading banner image",
    });

    try {
      // Upload the banner image with compression
      const result = await uploadImage(
        {
          type: "banner",
          file: file!,
          user: {
            uid: user.id,
            id: user.id,
          },
        },
        (progress) => {
          setUploadProgress(progress.percentage);
        }
      );

      // Insert banner request
      const { error } = await supabase.from("banner_requests").insert({
        user_id: user.id,
        title: form.title,
        description: form.description,
        link_url: form.link_url,
        duration_days: Number(form.duration_days),
        notes: form.notes,
        image_url: result.url,
      });

      if (error) throw error;

      toast.success("Banner request submitted!", {
        id: toastId,
        description: "Our team will review it shortly",
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
        duration: 5000,
      });

      // Reset form
      setForm({ ...empty });
      setFile(null);

      qc.invalidateQueries({
        queryKey: ["my-banner-requests"],
      });
    } catch (err: any) {
      console.error("Banner submission error:", err);
      
      toast.error("Failed to submit banner request", {
        id: toastId,
        description: err?.message ?? "Please try again",
        icon: <XCircle className="h-5 w-5 text-red-500" />,
        action: {
          label: "Retry",
          onClick: () => confirmSubmit(),
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
      <TopBar subtitle="Banner requests" />

      <main className="mx-auto max-w-[430px] space-y-5 px-4 pt-4">
        <h1 className="font-heading text-2xl font-bold">
          Promote with a banner
        </h1>

        <p className="text-sm text-muted-foreground">
          Submit a banner and our team will review it before it goes live on the
          home page.
        </p>

        <div className="space-y-2 rounded-2xl bg-surface p-4 ring-1 ring-border">
          <div>
            <Label>Title</Label>
            <Input
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
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm({
                  ...form,
                  description: e.target.value,
                })
              }
            />
          </div>

          <div>
            <Label>Link URL (optional)</Label>
            <Input
              value={form.link_url}
              onChange={(e) =>
                setForm({
                  ...form,
                  link_url: e.target.value,
                })
              }
            />
          </div>

          <div>
            <Label>Duration (days)</Label>
            <Input
              type="number"
              min={1}
              max={90}
              value={form.duration_days}
              onChange={(e) =>
                setForm({
                  ...form,
                  duration_days: Number(e.target.value),
                })
              }
            />
          </div>

          <div>
            <Label>Notes for the team</Label>
            <Textarea
              value={form.notes}
              onChange={(e) =>
                setForm({
                  ...form,
                  notes: e.target.value,
                })
              }
            />
          </div>

          <div>
            <Label>Banner image (2:1 recommended)</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setFile(e.target.files?.[0] ?? null)
              }
            />
            {file && (
              <p className="mt-1 text-xs text-muted-foreground">
                Selected: {file.name} (will be compressed)
              </p>
            )}
          </div>

          <Button
            onClick={handleSubmitClick}
            disabled={busy}
            className="w-full"
          >
            {busy ? (
              <>
                Submitting... {uploadProgress > 0 && `${uploadProgress}%`}
              </>
            ) : (
              "Submit request"
            )}
          </Button>
          
          <p className="text-center text-xs text-muted-foreground">
            ✓ Image will be automatically compressed
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="font-heading text-base font-semibold">
            Your requests
          </h2>

          {data.length === 0 && (
            <p className="rounded-2xl bg-surface p-6 text-center text-sm text-muted-foreground ring-1 ring-border">
              No requests yet.
            </p>
          )}

          {data.map((r: any) => (
            <div
              key={r.id}
              className="rounded-2xl bg-surface p-3 ring-1 ring-border"
            >
              <div className="flex items-start gap-3">
                <img
                  src={r.image_url}
                  alt=""
                  className="h-14 w-24 shrink-0 rounded-lg object-cover"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="line-clamp-1 font-semibold">
                      {r.title}
                    </span>

                    <StatusPill status={r.status} />
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {r.duration_days} days
                  </div>

                  {r.admin_note && (
                    <p className="mt-1 rounded-lg bg-muted p-2 text-xs">
                      Admin: {r.admin_note}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit banner request?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Please review your banner request:</p>
              <ul className="list-inside list-disc space-y-1 text-sm">
                <li><strong>{form.title}</strong></li>
                <li>Duration: {form.duration_days} days</li>
                {form.link_url && <li>Link: {form.link_url}</li>}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                Your banner will be reviewed by our team before going live.
              </p>
              <p className="text-xs text-green-600">
                Image will be compressed and optimized automatically.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSubmit} disabled={busy}>
              Confirm & Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-muted text-muted-foreground",
    approved: "bg-accent/10 text-accent",
    rejected: "bg-destructive/10 text-destructive",
    live: "bg-primary/10 text-primary",
  };

  return (
    <span
      className={
        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase " +
        (map[status] ?? "bg-muted")
      }
    >
      {status}
    </span>
  );
}
