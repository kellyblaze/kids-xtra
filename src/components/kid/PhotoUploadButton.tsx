"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Check, Loader2 } from "lucide-react";

interface Props {
  childId: string;
  onUploaded: (url: string) => void;
}

export function PhotoUploadButton({ childId, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function compressImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX = 1024;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas
          .getContext("2d")!
          .drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", 0.82);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("That photo could not be opened."));
      };
      img.src = url;
    });
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.[0]) return;

    const file = e.target.files[0];

    if (file.size > 20 * 1024 * 1024) {
      setError("Photo must be under 20MB.");
      e.currentTarget.value = "";
      return;
    }

    setError(null);
    setUploading(true);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    try {
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append("childId", childId);
      formData.append(
        "file",
        new File([compressed], "photo.jpg", { type: "image/jpeg" }),
      );

      const res = await fetch("/api/kid-upload-photo", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Photo did not upload. Try again.");
        setUploading(false);
        e.currentTarget.value = "";
        return;
      }

      const { path } = await res.json();
      setUploaded(true);
      onUploaded(path);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Photo did not upload. Try again.");
      setUploading(false);
      e.currentTarget.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleUpload}
        disabled={uploading || uploaded}
        className="hidden"
      />
      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Mission proof preview"
          className="h-28 w-full rounded-2xl border-2 border-white object-cover shadow-inner"
        />
      )}
      <Button
        variant={uploaded ? "default" : "outline"}
        size="sm"
        className={`h-11 w-full rounded-2xl text-xs font-black ${uploaded ? "bg-emerald-500 hover:bg-emerald-500 text-white" : "border-2 border-amber-300 bg-white text-amber-700 hover:bg-amber-100"}`}
        disabled={uploading || uploaded}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading...
          </>
        ) : uploaded ? (
          <>
            <Check className="w-4 h-4" />
            Photo ready
          </>
        ) : (
          <>
            <Camera className="w-4 h-4" />
            Take photo
          </>
        )}
      </Button>
      {error && (
        <p className="rounded-xl bg-red-50 px-2 py-1.5 text-xs font-black text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
