"use client"

import { useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Camera, Loader2, CheckCircle2 } from "lucide-react"

interface Props {
  familyId: string
  childId: string
  onUploaded: (url: string) => void
}

export function PhotoUploadButton({ familyId, childId, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError("Photo must be under 5 MB")
      return
    }

    setUploading(true)
    setError(null)

    const supabase = createClient()
    const ext = file.name.split(".").pop() ?? "jpg"
    const path = `${familyId}/${childId}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from("chore-photos")
      .upload(path, file, { upsert: false })

    if (uploadError) {
      setError("Upload failed — try again")
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from("chore-photos").getPublicUrl(path)
    setUploaded(true)
    setUploading(false)
    onUploaded(data.publicUrl)
  }

  return (
    <div className="space-y-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
      <Button
        type="button"
        variant={uploaded ? "default" : "outline"}
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={`w-full rounded-xl ${uploaded ? "bg-emerald-500 hover:bg-emerald-600 text-white" : ""}`}
      >
        {uploading
          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading…</>
          : uploaded
          ? <><CheckCircle2 className="w-4 h-4 mr-2" />Photo ready — tap to retake</>
          : <><Camera className="w-4 h-4 mr-2" />Take a photo</>}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
