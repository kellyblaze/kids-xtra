"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { markChoreComplete } from "@/app/actions/completion-actions"
import { CheckCircle2 } from "lucide-react"

interface Props {
  assignmentId: string
  childId: string
  requiresPhoto: boolean
}

export function MarkDoneButton({ assignmentId, childId, requiresPhoto }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (requiresPhoto) {
      alert("Ask a parent to take a photo of your completed chore!")
      return
    }
    startTransition(async () => {
      await markChoreComplete(assignmentId, childId)
      router.refresh()
    })
  }

  return (
    <Button
      size="sm"
      onClick={handleClick}
      disabled={isPending}
      className="shrink-0 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white"
    >
      <CheckCircle2 className="w-4 h-4 mr-1.5" />
      {isPending ? "…" : "Done!"}
    </Button>
  )
}
