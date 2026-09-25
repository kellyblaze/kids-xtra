import type { SupabaseClient } from "@supabase/supabase-js"

export interface LeaderboardEntry {
  childId: string
  name: string
  avatarEmoji: string
  weeklyCredits: number
  rank: number
}

export async function getWeeklyLeaderboard(
  admin: SupabaseClient,
  familyId: string,
  weekStartIso: string,
): Promise<LeaderboardEntry[]> {
  const weekEnd = new Date(weekStartIso)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const { data: children } = await admin
    .from("child_profiles")
    .select("id, name, avatar_emoji")
    .eq("family_id", familyId)
    .eq("is_active", true)

  if (!children?.length) return []

  const { data: txns } = await admin
    .from("credit_transactions")
    .select("child_id, amount")
    .eq("family_id", familyId)
    .gte("created_at", weekStartIso)
    .lt("created_at", weekEnd.toISOString())
    .gt("amount", 0)

  const totals = new Map<string, number>()
  for (const t of txns ?? []) {
    totals.set(t.child_id, (totals.get(t.child_id) ?? 0) + t.amount)
  }

  const entries = children
    .map((c) => ({
      childId: c.id as string,
      name: c.name as string,
      avatarEmoji: (c.avatar_emoji as string) ?? "🧒",
      weeklyCredits: totals.get(c.id) ?? 0,
    }))
    .sort((a, b) => b.weeklyCredits - a.weeklyCredits)
    .map((entry, i) => ({ ...entry, rank: i + 1 }))

  return entries
}
