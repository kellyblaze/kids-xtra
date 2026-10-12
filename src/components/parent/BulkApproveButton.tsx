"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckSquare } from "lucide-react"
import { approveAllPendingChoreCompletions } from "@/app/actions/approval-actions"

interface Props {
  count: number
}

export function BulkApproveButton({ count }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  function handleApproveAll() {
    startTransition(async () => {
      await approveAllPendingChoreCompletions()
      setDone(true)
      setTimeout(() => router.refresh(), 600)
    })
  }

  if (done) return null

  return (
    <button
      onClick={handleApproveAll}
      disabled={isPending}
      className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 active:translate-y-0 disabled:opacity-50"
    >
      <CheckSquare className="w-4 h-4" />
      {isPending ? "Approving…" : `Approve all ${count}`}
    </button>
  )
}
