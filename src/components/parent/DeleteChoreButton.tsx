"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { deleteChore } from "@/app/actions/chore-actions"
import { Trash2 } from "lucide-react"

interface Props {
  choreId: string
  choreTitle: string
}

export function DeleteChoreButton({ choreId, choreTitle }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm(`Remove "${choreTitle}"? Completion history will be kept.`)) return
    startTransition(async () => {
      await deleteChore(choreId)
      router.refresh()
    })
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="w-8 h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
      onClick={handleDelete}
      disabled={isPending}
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  )
}
