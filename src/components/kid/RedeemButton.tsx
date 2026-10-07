"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { requestRewardRedemption } from "@/app/actions/reward-actions"
import { Gift } from "lucide-react"

interface Props {
  rewardId: string
  childId: string
  canAfford: boolean
  creditCost: number
  balance: number
  goalTitle?: string | null
  goalCost?: number | null
}

export function RedeemButton({
  rewardId,
  childId,
  canAfford,
  creditCost,
  balance,
  goalTitle,
  goalCost,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const hasGoalImpact = canAfford && !!goalTitle && !!goalCost && balance < goalCost
  const balanceAfterSpend = balance - creditCost

  function redeem() {
    if (!canAfford) return
    setOpen(false)
    startTransition(async () => {
      await requestRewardRedemption(rewardId, childId)
      router.refresh()
    })
  }

  function handleClick() {
    if (hasGoalImpact) {
      setOpen(true)
      return
    }
    if (!hasGoalImpact) redeem()
  }

  return (
    <>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <Button
          size="sm"
          onClick={handleClick}
          disabled={isPending || !canAfford}
          className="shrink-0 rounded-xl"
          variant={canAfford ? "default" : "outline"}
          title={canAfford ? `Spend ${creditCost} Credits` : `Need ${creditCost} Credits`}
        >
          <Gift className="w-4 h-4 mr-1.5" />
          {isPending ? "..." : canAfford ? "Get it!" : `${creditCost} Credits`}
        </Button>
        {hasGoalImpact && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Spend or keep saving?</AlertDialogTitle>
              <AlertDialogDescription>
                You are saving for {goalTitle}. If you spend {creditCost} Credits now, you will have {balanceAfterSpend} Credits left.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Saving</AlertDialogCancel>
              <AlertDialogAction onClick={redeem} disabled={isPending}>
                Spend {creditCost}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </>
  )
}
