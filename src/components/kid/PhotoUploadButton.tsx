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

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.[0]) return

    const file = e.target.files[0]

    if (file.size > 5 * 1024 * 1024) {
      alert("Photo must be under 5MB")
      return
    }

    setUploading(true)
    try {
      const timestamp = Date.now()
      const ext = file.name.split(".").pop()
      const filename = `${familyId}/${childId}/${timestamp}.${ext}`

      const { error } = await supabase.storage.from("chore-photos").upload(filename, file)

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
