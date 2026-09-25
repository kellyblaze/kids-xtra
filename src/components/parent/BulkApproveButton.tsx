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
      className="flex items-center gap-2 text-sm font-black px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-[0_3px_0_#059669] hover:shadow-[0_1px_0_#059669] hover:translate-y-[2px] transition-all"
    >
      <CheckSquare className="w-4 h-4" />
      {isPending ? "Approving…" : `Approve all ${count}`}
    </button>
  )
}
