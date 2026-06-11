"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Upload, Camera, Check } from "lucide-react"

interface Props {
  familyId: string
  childId: string
  onUploaded: (url: string) => void
}

export function PhotoUploadButton({ familyId, childId, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const supabase = createClient()

  async function compressImage(file: File): Promise<Blob> {
    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const MAX = 1024
        const scale = Math.min(1, MAX / Math.max(img.width, img.height))
        const canvas = document.createElement("canvas")
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", 0.82)
      }
      img.src = url
    })
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.[0]) return

    const file = e.target.files[0]

    if (file.size > 20 * 1024 * 1024) {
      alert("Photo must be under 20MB")
      return
    }

    setUploading(true)
    try {
      const compressed = await compressImage(file)
      const timestamp = Date.now()
      const filename = `${familyId}/${childId}/${timestamp}.jpg`

      const { error } = await supabase.storage.from("chore-photos").upload(filename, compressed, { contentType: "image/jpeg" })

      if (error) {
        alert("Upload failed: " + error.message)
        setUploading(false)
        return
      }

      const { data } = supabase.storage.from("chore-photos").getPublicUrl(filename)
      setUploaded(true)
      onUploaded(data.publicUrl)
    } catch (error) {
      alert("Upload failed: " + (error instanceof Error ? error.message : "Unknown error"))
      setUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleUpload}
        disabled={uploading || uploaded}
        className="hidden"
        id="photo-input"
      />
      <Button
        variant={uploaded ? "default" : "outline"}
        size="sm"
       
        className={`${uploaded ? "bg-emerald-500 hover:bg-emerald-500 text-white" : ""}`}
        disabled={uploading}
      >
        <label htmlFor="photo-input" className="cursor-pointer flex items-center gap-2">
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
        </label>
      </Button>
    </div>
  )
}
