"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { PhotoUploadButton } from "@/components/kid/PhotoUploadButton"
import { markChoreComplete } from "@/app/actions/completion-actions"
import { Camera, CheckCircle2, X } from "lucide-react"

interface Props {
  assignmentId: string
  childId: string
  familyId: string
  requiresPhoto: boolean
}

export function MarkDoneButton({ assignmentId, childId, familyId, requiresPhoto }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [showPhotoFlow, setShowPhotoFlow] = useState(false)

  function handleDoneClick() {
    if (requiresPhoto && !photoUrl) {
      setShowPhotoFlow(true)
      return
    }
    startTransition(async () => {
      await markChoreComplete(assignmentId, childId, photoUrl ?? undefined)
      router.refresh()
    })
  }

  if (showPhotoFlow && !photoUrl) {
    return (
      <div className="shrink-0 w-40 space-y-2">
        <PhotoUploadButton
          familyId={familyId}
          childId={childId}
          onUploaded={(url) => { setPhotoUrl(url); setShowPhotoFlow(false) }}
        />
        <button
          type="button"
          onClick={() => setShowPhotoFlow(false)}
          className="text-xs text-slate-400 w-full text-center flex items-center justify-center gap-1"
        >
          <X className="w-3 h-3" /> Cancel
        </button>
      </div>
    )
  }

  return (
    <div className="shrink-0 flex flex-col gap-1 items-end">
      <Button
        size="sm"
        onClick={handleDoneClick}
        disabled={isPending}
        className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white"
      >
        <CheckCircle2 className="w-4 h-4 mr-1.5" />
        {isPending ? "…" : photoUrl ? "Submit! 📸" : requiresPhoto ? "Add Photo" : "Done!"}
      </Button>
      {!requiresPhoto && !photoUrl && (
        <button
          type="button"
          onClick={() => setShowPhotoFlow(true)}
          className="text-xs text-slate-400 hover:text-violet-600 flex items-center gap-1 transition-colors"
        >
          <Camera className="w-3 h-3" /> add photo proof
        </button>
      )}
      {photoUrl && !requiresPhoto && (
        <button
          type="button"
          onClick={() => setPhotoUrl(null)}
          className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
        >
          <X className="w-3 h-3" /> remove photo
        </button>
      )}
    </div>
  )
}
