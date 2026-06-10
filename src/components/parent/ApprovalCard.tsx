"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { AVATAR_EMOJI, CATEGORY_EMOJI } from "@/lib/constants"
import {
  approveChoreCompletion,
  rejectChoreCompletion,
  approveRewardRedemption,
  denyRewardRedemption,
} from "@/app/actions/approval-actions"
import { CheckCircle, XCircle, Gift, Star } from "lucide-react"

type ChildInfo = { id: string; name: string; avatar_key: string | null }

interface ChoreItem {
  id: string
  completed_at: string
  photo_url?: string | null
  child_profiles: ChildInfo | null
  chore_assignments: { chores: { title: string; category: string; credit_value: number } | null } | null
}

interface RewardItem {
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
  const [note, setNote] = useState("")

  const child = item.child_profiles
  const avatarEmoji = AVATAR_EMOJI[child?.avatar_key ?? "star"] ?? "⭐"

  function handleApprove() {
    startTransition(async () => {
      if (type === "chore") await approveChoreCompletion(item.id)
      else await approveRewardRedemption(item.id)
      router.refresh()
    })
  }

  function handleReject() {
    startTransition(async () => {
      if (type === "chore") await rejectChoreCompletion(item.id, note)
      else await denyRewardRedemption(item.id, note)
      setShowReject(false)
      setNote("")
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
            className="rounded-lg w-full max-h-40 object-cover border"
          />
        )}

        {showReject ? (
          <div className="space-y-2">
            <Textarea
              placeholder="Optional note for your child…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={handleReject} disabled={isPending} className="flex-1">
                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                {type === "chore" ? "Reject" : "Deny"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setShowReject(false); setNote("") }} disabled={isPending}>
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
              {type === "chore" ? "Reject" : "Deny"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
