"use client"

import { useTransition } from "react"
import { toggleWeeklyReport } from "@/app/actions/family-actions"

export function WeeklyReportToggle({ enabled }: { enabled: boolean }) {
  const [isPending, startTransition] = useTransition()

  function handleChange(next: boolean) {
    startTransition(async () => {
      await toggleWeeklyReport(next)
    })
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold">Weekly progress emails</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Receive a summary of each child&apos;s missions, credits, and streaks every Monday.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={isPending}
        onClick={() => handleChange(!enabled)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:opacity-50 ${
          enabled ? "bg-violet-600" : "bg-slate-200"
        }`}
      >
        <span
          className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  )
}
