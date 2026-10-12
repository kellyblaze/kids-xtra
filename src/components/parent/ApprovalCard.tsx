"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AVATAR_EMOJI } from "@/lib/constants"
import {
  approveChoreCompletion,
  rejectChoreCompletion,
  approveRewardRedemption,
  denyRewardRedemption,
  deleteChoreCompletion,
  deleteRewardRedemption,
} from "@/app/actions/approval-actions"
import { getRejectionReasons, addRejectionReason } from "@/app/actions/rejection-actions"
import { CheckCircle, XCircle, Gift, Star, ChevronDown, Plus, Trash2 } from "lucide-react"

type ChildInfo = { id: string; name: string; avatar_key: string | null }

export interface ChoreItem {
  id: string
  completed_at: string
  photo_url?: string | null
  checklist_completed?: string[]
  child_profiles: ChildInfo | null
  chore_assignments: {
    chores: {
      title: string
      category: string
      credit_value: number
      xp_value?: number | null
      checklist_items?: string[] | null
    } | null
  } | null
}

export interface RewardItem {
  id: string
  requested_at: string
  credits_spent: number
  child_profiles: ChildInfo | null
  rewards: { title: string; category: string | null } | null
}

interface Props {
  type: "chore" | "reward"
  item: ChoreItem | RewardItem
}

export function ApprovalCard({ type, item }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showReject, setShowReject] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [reasons, setReasons] = useState<string[]>([])
  const [selected, setSelected] = useState("")
  const [newReason, setNewReason] = useState("")
  const [addingReason, setAddingReason] = useState(false)

  useEffect(() => {
    if (showReject && reasons.length === 0) {
      getRejectionReasons().then(({ reasons: r }) => {
        setReasons(r)
        if (r.length > 0) setSelected(r[0])
      })
    }
  }, [showReject, reasons.length])

  const child = item.child_profiles
  const avatarEmoji = AVATAR_EMOJI[child?.avatar_key ?? "star"] ?? "⭐"

  function handleApprove() {
    startTransition(async () => {
      if (type === "chore") await approveChoreCompletion(item.id)
      else await approveRewardRedemption(item.id)
      router.refresh()
    })
  }

  async function handleAddReason() {
    if (!newReason.trim()) return
    setAddingReason(true)
    await addRejectionReason(newReason.trim())
    setReasons((prev) => [...prev, newReason.trim()])
    setSelected(newReason.trim())
    setNewReason("")
    setAddingReason(false)
  }

  function handleReject() {
    if (!selected) return
    startTransition(async () => {
      if (type === "chore") await rejectChoreCompletion(item.id, selected)
      else await denyRewardRedemption(item.id, selected)
      setShowReject(false)
      router.refresh()
    })
  }

  function handleDelete() {
    startTransition(async () => {
      if (type === "chore") await deleteChoreCompletion(item.id)
      else await deleteRewardRedemption(item.id)
      router.refresh()
    })
  }

  const choreItem = type === "chore" ? (item as ChoreItem) : null
  const rewardItem = type === "reward" ? (item as RewardItem) : null
  const choreInfo = choreItem?.chore_assignments?.chores
  const rewardInfo = rewardItem?.rewards

  const title = type === "chore" ? choreInfo?.title : rewardInfo?.title
  const subtitle = type === "chore"
    ? `${choreInfo?.credit_value ?? 0} Credits, ${choreInfo?.xp_value ?? 0} XP, ${choreInfo?.category ?? "Mission"}`
    : `${rewardItem?.credits_spent ?? 0} Credits`
  const dateStr = new Date(
    type === "chore" ? choreItem!.completed_at : rewardItem!.requested_at
  ).toLocaleString()

  return (
    <Card className="rounded-3xl border border-slate-200 bg-white py-0 shadow-sm">
      <CardContent className="space-y-4 p-4 md:p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xl">
            {avatarEmoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black text-slate-950">{child?.name ?? "Child"}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">{dateStr}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {type === "chore"
                ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                : <Gift className="w-3.5 h-3.5 text-violet-500 shrink-0" />}
              <p className="truncate text-base font-black text-slate-900">{title ?? "Untitled"}</p>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 font-bold">
              <Star className="w-3 h-3 text-amber-400" />
              {subtitle}
            </p>
          </div>
        </div>

        {choreItem?.photo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={choreItem.photo_url}
            alt="Completion photo"
            className="max-h-72 w-full rounded-2xl border border-slate-200 object-cover"
          />
        )}

        {type === "chore" && (choreInfo?.checklist_items?.length ?? 0) > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-xs font-black text-slate-500">Checklist</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {(choreInfo?.checklist_items ?? []).map((item) => {
                const checked = choreItem?.checklist_completed?.includes(item) ?? false
                return (
                  <div key={item} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm">
                    <span className={checked ? "font-black text-emerald-600" : "font-black text-slate-300"}>
                      {checked ? "✓" : "□"}
                    </span>
                    <span className={checked ? "font-medium text-slate-700" : "text-slate-500"}>{item}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {showReject ? (
          <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm font-black text-rose-950">
              {type === "chore" ? "What needs more work?" : "Select a reason"}
            </p>

            <div className="relative">
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="w-full appearance-none rounded-xl border border-rose-200 bg-white px-3 py-2 pr-8 text-sm font-medium text-slate-800 focus:outline-none focus:ring-4 focus:ring-rose-100"
              >
                {reasons.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Add new reason..."
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddReason()}
                className="text-sm"
                disabled={addingReason}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddReason}
                disabled={!newReason.trim() || addingReason}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={handleReject}
                disabled={isPending || !selected}
                className="h-9 flex-1 rounded-xl bg-rose-600 text-white hover:bg-rose-700"
              >
                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                {type === "chore" ? "Needs More Work" : "Deny Request"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowReject(false)}
                disabled={isPending}
                className="h-9 rounded-xl bg-white"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : showDelete ? (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-black text-slate-800">Are you sure you want to delete?</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
                className="h-9 flex-1 rounded-xl bg-rose-600 text-white hover:bg-rose-700"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Yes, Delete
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDelete(false)}
                disabled={isPending}
                className="h-9 rounded-xl bg-white"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Button size="sm" onClick={handleApprove} disabled={isPending} className="h-10 rounded-xl bg-emerald-600 font-black text-white hover:bg-emerald-700">
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
              {type === "chore" ? "Approve Mission" : "Approve Reward"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowReject(true)} disabled={isPending} className="h-10 rounded-xl border-rose-200 bg-white font-black text-rose-700 hover:bg-rose-50">
              <XCircle className="w-3.5 h-3.5 mr-1.5" />
              {type === "chore" ? "Needs More Work" : "Deny"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowDelete(true)} disabled={isPending} className="h-10 rounded-xl border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
