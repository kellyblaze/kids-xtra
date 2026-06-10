"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { deleteChildProfile } from "@/app/actions/child-actions"
import { Trash2 } from "lucide-react"

interface Props {
  childId: string
  childName: string
}

export function DeleteChildButton({ childId, childName }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm(`Remove ${childName}? Their chore and credit history will be kept.`)) return
    startTransition(async () => {
      await deleteChildProfile(childId)
      router.push("/parent/children")
      router.refresh()
    })
  }

  return (
    <Button
      variant="outline"
      size="icon"
      className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
      onClick={handleDelete}
      disabled={isPending}
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  )
}
