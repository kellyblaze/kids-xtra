"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { awardBonusCredits } from "@/app/actions/reward-actions"
import { PlusCircle } from "lucide-react"

interface Props {
  childId: string
}

export function AwardBonusCreditsForm({ childId }: Props) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const result = await awardBonusCredits(childId, formData)
      if (result.error) {
        setError(result.error)
        return
      }
      formRef.current?.reset()
      setMessage("Bonus Credits awarded.")
      router.refresh()
    })
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor="bonus-amount">Credits</Label>
          <Input
            id="bonus-amount"
            name="amount"
            type="number"
            min="1"
            max="500"
            defaultValue="10"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bonus-description">Reason</Label>
          <Input
            id="bonus-description"
            name="description"
            maxLength={160}
            placeholder="Great attitude bonus"
            required
          />
        </div>
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
      {message && <p role="status" className="text-sm font-semibold text-emerald-700">{message}</p>}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        <PlusCircle className="size-4" />
        {pending ? "Awarding..." : "Award Bonus Credits"}
      </Button>
    </form>
  )
}
