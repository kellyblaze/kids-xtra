"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AVATAR_EMOJI, CATEGORY_EMOJI } from "@/lib/constants"
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
  child_profiles: ChildInfo | null
  chore_assignments: { chores: { title: string; category: string; credit_value: number } | null } | null
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
    ? `${choreInfo?.credit_value ?? 0} credits · ${CATEGORY_EMOJI[choreInfo?.category as keyof typeof CATEGORY_EMOJI] ?? "📋"} ${choreInfo?.category ?? ""}`
    : `${rewardItem?.credits_spent ?? 0} credits`
  const dateStr = new Date(
    type === "chore" ? choreItem!.completed_at : rewardItem!.requested_at
  ).toLocaleString()

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xl shrink-0">
            {avatarEmoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{child?.name ?? "Child"}</span>
              <span className="text-muted-foreground text-xs">{dateStr}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {type === "chore"
                ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                : <Gift className="w-3.5 h-3.5 text-violet-500 shrink-0" />}
              <p className="text-sm font-medium truncate">{title ?? "—"}</p>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
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
            className="rounded-lg w-full max-h-48 object-cover border"
          />
        )}

        {showReject ? (
          <div className="space-y-3 border-t pt-3">
            <p className="text-sm font-semibold text-slate-700">Select a reason</p>

            <div className="relative">
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="w-full appearance-none rounded-lg border border-input bg-background px-3 py-2 text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {reasons.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Add new reason…"
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
                className="flex-1"
              >
                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                Send Rejection
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowReject(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : showDelete ? (
          <div className="space-y-2 border-t pt-3">
            <p className="text-sm font-semibold text-slate-700">Are you sure you want to delete?</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
                className="flex-1"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Yes, Delete
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDelete(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" onClick={handleApprove} disabled={isPending} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
              Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowReject(true)} disabled={isPending} className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10">
              <XCircle className="w-3.5 h-3.5 mr-1.5" />
              Reject
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowDelete(true)} disabled={isPending} className="text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-700">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
