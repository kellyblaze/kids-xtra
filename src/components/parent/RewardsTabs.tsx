"use client"

import { useState, type ReactNode } from "react"

interface Props {
  catalogContent: ReactNode
  redemptionsContent: ReactNode
  pendingCount: number
}

export function RewardsTabs({ catalogContent, redemptionsContent, pendingCount }: Props) {
  const [tab, setTab] = useState<"catalog" | "redemptions">("catalog")

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab("catalog")}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
            tab === "catalog"
              ? "bg-white shadow text-slate-900"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Catalog
        </button>
        <button
          onClick={() => setTab("redemptions")}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
            tab === "redemptions"
              ? "bg-white shadow text-slate-900"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Redemptions
          {pendingCount > 0 && (
            <span className="bg-amber-500 text-white text-xs font-black rounded-full w-5 h-5 flex items-center justify-center">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {tab === "catalog" ? catalogContent : redemptionsContent}
    </div>
  )
}
