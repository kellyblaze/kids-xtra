"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { fulfillRewardRedemption } from "@/app/actions/approval-actions"
import { CheckCircle2, Loader2 } from "lucide-react"

interface Props {
  redemptionId: string
}

export function FulfillRewardButton({ redemptionId }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await fulfillRewardRedemption(redemptionId)
          router.refresh()
        })
      }}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
      Fulfill
    </Button>
  )
}
