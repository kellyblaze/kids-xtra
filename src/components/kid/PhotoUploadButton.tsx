"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Check } from "lucide-react";

interface Props {
  childId: string;
  onUploaded: (url: string) => void;
}

export function PhotoUploadButton({ childId, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function compressImage(file: File): Promise<Blob> {
    return new Promise((resolve) => {
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
      img.src = url;
    });
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.[0]) return;

    const file = e.target.files[0];

    if (file.size > 20 * 1024 * 1024) {
      alert("Photo must be under 20MB");
      return;
    }

    setUploading(true);
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
        alert("Upload failed: " + (body.error ?? res.statusText));
        setUploading(false);
        return;
      }

      const { path } = await res.json();
      setUploaded(true);
      onUploaded(path);
    } catch (error) {
      alert(
        "Upload failed: " +
          (error instanceof Error ? error.message : "Unknown error"),
      );
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        disabled={uploading || uploaded}
        className="hidden"
      />
      <Button
        variant={uploaded ? "default" : "outline"}
        size="sm"
        className={`${uploaded ? "bg-emerald-500 hover:bg-emerald-500 text-white" : ""}`}
        disabled={uploading || uploaded}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <>
            <span className="animate-spin">⏳</span>
            Uploading…
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
    </div>
  );
}
