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

  const buttonClass = canAfford
    ? "shrink-0 rounded-2xl border-2 border-emerald-200 bg-emerald-400 px-4 py-2 text-xs font-black text-emerald-950 shadow-[0_5px_0_#047857] transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-300 focus-visible:ring-4 focus-visible:ring-emerald-200/70 active:translate-y-1 active:shadow-none"
    : "shrink-0 rounded-2xl border-2 border-white/15 bg-white/10 px-4 py-2 text-xs font-black text-white/55 transition-all duration-200"

  return (
    <>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <Button
          size="sm"
          onClick={handleClick}
          disabled={isPending || !canAfford}
          className={buttonClass}
          variant="outline"
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
