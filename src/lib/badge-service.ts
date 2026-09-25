import type { SupabaseClient } from "@supabase/supabase-js"
import { evaluateBadges, type ChildStats } from "./badges"

export async function awardMilestoneBadges(
  admin: SupabaseClient,
  childId: string,
  familyId: string,
): Promise<void> {
  const [completionsRes, creditsRes, redemptionsRes, earnedRes] = await Promise.all([
    admin.from("chore_completions").select("id, completed_at").eq("child_id", childId).eq("status", "approved"),
    admin.from("credit_transactions").select("amount").eq("child_id", childId).gt("amount", 0),
    admin.from("reward_redemptions").select("id").eq("child_id", childId).limit(1),
    admin.from("child_badges").select("badge_key").eq("child_id", childId),
  ])

  const completions = completionsRes.data ?? []
  const totalChores = completions.length

  const totalCreditsEarned = (creditsRes.data ?? []).reduce((sum, t) => sum + (t.amount as number), 0)

  const hasRedeemedReward = (redemptionsRes.data?.length ?? 0) > 0

  const currentStreak = computeStreak(completions.map((c) => c.completed_at as string))

  const stats: ChildStats = { totalChores, totalCreditsEarned, currentStreak, hasRedeemedReward }
  const earnedKeys = new Set((earnedRes.data ?? []).map((b) => b.badge_key as string))

  const toAward = evaluateBadges(stats, earnedKeys)
  if (!toAward.length) return

  await admin.from("child_badges").insert(
    toAward.map((badge_key) => ({ child_id: childId, family_id: familyId, badge_key })),
  )
}

function computeStreak(completedAts: string[]): number {
  if (!completedAts.length) return 0

  const uniqueDays = Array.from(
    new Set(completedAts.map((d) => new Date(d).toISOString().slice(0, 10))),
  ).sort((a, b) => b.localeCompare(a))

  let streak = 1
  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = new Date(uniqueDays[i - 1])
    const curr = new Date(uniqueDays[i])
    const diffDays = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24)
    if (diffDays === 1) {
      streak++
    } else {
      break
    }
  }
  return streak
}
