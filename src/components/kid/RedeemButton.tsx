"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { requestRewardRedemption } from "@/app/actions/reward-actions"
import { Gift } from "lucide-react"

interface Props {
  rewardId: string
  childId: string
  canAfford: boolean
  creditCost: number
}

export function RedeemButton({ rewardId, childId, canAfford, creditCost }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!canAfford) return
    startTransition(async () => {
      await requestRewardRedemption(rewardId, childId)
      router.refresh()
    })
  }

  return (
    <Button
      size="sm"
      onClick={handleClick}
      disabled={isPending || !canAfford}
      className="shrink-0 rounded-xl"
      variant={canAfford ? "default" : "outline"}
      title={canAfford ? `Spend ${creditCost} credits` : `Need ${creditCost} credits`}
    >
      <Gift className="w-4 h-4 mr-1.5" />
      {isPending ? "…" : canAfford ? "Get it!" : `${creditCost} ⭐`}
    </Button>
  )
}
