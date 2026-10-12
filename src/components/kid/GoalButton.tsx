"use client"

import { useState, useTransition } from "react"
import { setGoal, clearGoal } from "@/app/actions/goal-actions"
import { Star, X } from "lucide-react"

interface Props {
  childId: string
  rewardId: string
  isCurrentGoal: boolean
}

export function GoalButton({ childId, rewardId, isCurrentGoal }: Props) {
  const [isPending, startTransition] = useTransition()
  const [optimistic, setOptimistic] = useState(isCurrentGoal)

  function handleToggle() {
    const next = !optimistic
    setOptimistic(next)
    startTransition(async () => {
      if (next) await setGoal(childId, rewardId)
      else await clearGoal(childId)
    })
  }

  if (optimistic) {
    return (
      <button
        onClick={handleToggle}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-full border-2 border-emerald-200 bg-emerald-300 px-3 py-1.5 text-xs font-black text-emerald-950 shadow-[0_3px_0_#047857] transition-all duration-200 hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-100 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200/70 active:translate-y-0.5 active:shadow-none disabled:opacity-60"
      >
        <Star className="w-3.5 h-3.5 fill-current" />
        My Goal
        <X className="w-3 h-3 ml-0.5 opacity-60" />
      </button>
    )
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className="flex items-center gap-1.5 rounded-full border-2 border-cyan-200/80 bg-cyan-300 px-3 py-1.5 text-xs font-black text-cyan-950 shadow-[0_3px_0_#0891b2] transition-all duration-200 hover:-translate-y-0.5 hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/70 active:translate-y-0.5 active:shadow-none disabled:opacity-60"
    >
      <Star className="w-3.5 h-3.5" />
      Add as Goal
    </button>
  )
}
