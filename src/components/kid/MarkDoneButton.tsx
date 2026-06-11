"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { PhotoUploadButton } from "@/components/kid/PhotoUploadButton"
import { markChoreComplete } from "@/app/actions/completion-actions"
import { CheckCircle2 } from "lucide-react"

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
          onUploaded={(url) => setPhotoUrl(url)}
        />
        <button
          type="button"
          onClick={() => setShowPhotoFlow(false)}
          className="text-xs text-muted-foreground w-full text-center"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <Button
      size="sm"
      onClick={handleDoneClick}
      disabled={isPending}
      className="shrink-0 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white"
    >
      <CheckCircle2 className="w-4 h-4 mr-1.5" />
      {isPending ? "…" : photoUrl ? "Submit!" : "Done!"}
    </Button>
  )
}
