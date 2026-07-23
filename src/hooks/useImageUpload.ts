import { useCallback, useRef, useState } from "react";

import {
  uploadImage,
  type UploadRequest,
  type UploadResult,
} from "@/services/upload";

export interface UseImageUploadReturn {
  upload: (
    request: UploadRequest,
  ) => Promise<UploadResult>;

  progress: number;

  isUploading: boolean;

  error: Error | null;

  result: UploadResult | null;

  reset: () => void;
}

export function useImageUpload(): UseImageUploadReturn {
  const [progress, setProgress] = useState(0);

  const [isUploading, setIsUploading] = useState(false);

  const [error, setError] = useState<Error | null>(null);

  const [result, setResult] =
    useState<UploadResult | null>(null);

  const mounted = useRef(true);

  const reset = useCallback(() => {
    setProgress(0);
    setError(null);
    setResult(null);
  }, []);

  const upload = useCallback(
    async (
      request: UploadRequest,
    ): Promise<UploadResult> => {
      reset();

      setIsUploading(true);

      try {
        const uploaded = await uploadImage(
          request,
          (progress) => {
            if (!mounted.current) return;

            setProgress(progress.percentage);
          },
        );

        if (mounted.current) {
          setResult(uploaded);
        }

        return uploaded;
      } catch (err) {
        if (mounted.current) {
          setError(err as Error);
        }

        throw err;
      } finally {
        if (mounted.current) {
          setIsUploading(false);
        }
      }
    },
    [reset],
  );

  return {
    upload,
    progress,
    isUploading,
    error,
    result,
    reset,
  };
}
