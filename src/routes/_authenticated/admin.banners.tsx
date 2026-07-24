  async function add() {
    if (!file) return toast.error("Add an image");
    if (!user) return;

    setBusy(true);

    const toastId = toast.loading("Adding banner...", {
      description: "Compressing and uploading image",
    });

    try {
      // Upload with compression
      const result = await uploadImage(
        {
          type: "banner",
          file,
          user: {
            uid: user.id,
            id: user.id,
          },
        },
        (progress) => {
          toast.loading("Adding banner...", {
            id: toastId,
            description: `Uploading: ${progress.percentage}%`,
          });
        }
      );

      const { error } = await supabase.from("banners").insert({
        title: form.title,
        subtitle: form.subtitle,
        link_url: form.link_url,
        position: Number(form.position),
        image_url: result.url,
        banner_type: form.banner_type,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
      });

      if (error) throw error;

      setForm({ ...emptyForm });
      setFile(null);

      invalidate();

      toast.success("Banner added successfully!", {
        id: toastId,
        description: "Image compressed and uploaded",
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      });
    } catch (err: any) {
      toast.error("Failed to add banner", {
        id: toastId,
        description: err?.message ?? "Please try again",
        icon: <XCircle className="h-5 w-5 text-red-500" />,
      });
    } finally {
      setBusy(false);
    }
  }
