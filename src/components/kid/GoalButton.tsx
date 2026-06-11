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
        className="flex items-center gap-1.5 text-xs font-black bg-emerald-100 text-emerald-700 border-2 border-emerald-300 px-3 py-1.5 rounded-full hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
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
      className="flex items-center gap-1.5 text-xs font-black bg-violet-50 text-violet-600 border-2 border-violet-200 px-3 py-1.5 rounded-full hover:bg-violet-100 transition-colors"
    >
      <Star className="w-3.5 h-3.5" />
      Add as Goal
    </button>
  )
}
