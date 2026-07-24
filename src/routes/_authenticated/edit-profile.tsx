  async function uploadAvatar(file: File) {
    if (!user) return;

    const toastId = toast.loading("Uploading avatar...", {
      description: "Compressing image",
    });

    try {
      const result = await uploadImage(
        {
          type: "avatar",
          file,
          user: {
            uid: user.id,
            id: user.id,
          },
        },
        (progress) => {
          toast.loading("Uploading avatar...", {
            id: toastId,
            description: `${progress.percentage}%`,
          });
        }
      );

      setForm((f) => ({
        ...f,
        avatar_url: result.url,
      }));

      toast.success("Avatar uploaded!", {
        id: toastId,
        description: "Image compressed and saved",
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      });
    } catch (err: any) {
      toast.error("Failed to upload avatar", {
        id: toastId,
        description: err?.message ?? "Please try again",
        icon: <XCircle className="h-5 w-5 text-red-500" />,
      });
    }
  }
