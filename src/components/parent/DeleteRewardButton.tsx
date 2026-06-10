"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { deleteReward } from "@/app/actions/reward-actions"
import { Trash2 } from "lucide-react"

interface Props {
  rewardId: string
  rewardTitle: string
}

export function DeleteRewardButton({ rewardId, rewardTitle }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm(`Remove "${rewardTitle}"? Redemption history will be kept.`)) return
    startTransition(async () => {
      await deleteReward(rewardId)
      router.refresh()
    })
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="w-8 h-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
      onClick={handleDelete}
      disabled={isPending}
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  )
}
