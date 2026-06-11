import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, Clock, Gift, ChevronRight } from "lucide-react"

interface PageProps {
  params: Promise<{ childId: string }>
}

export default async function KidDashboardPage({ params }: PageProps) {
  const { childId } = await params

  const supabase = await createClient()
  const admin = createAdminClient()

  const [{ data: child }, { data: completions }, { data: redemptions }, { data: streak }, { data: goalRow }] = await Promise.all([
    supabase
      .from("child_profiles")
      .select("id, name, credit_balance, level, xp_total")
      .eq("id", childId)
      .single(),

    supabase
      .from("chore_completions")
      .select(`id, status, completed_at, chore_assignments(chores(title, credit_value))`)
      .eq("child_id", childId)
      .in("status", ["pending_approval", "approved"])
      .order("completed_at", { ascending: false })
      .limit(5),

    supabase
      .from("reward_redemptions")
      .select("id, status, requested_at, rewards(title)")
      .eq("child_id", childId)
      .in("status", ["requested", "approved"])
      .order("requested_at", { ascending: false })
      .limit(3),

    supabase
      .from("child_streaks")
      .select("current_streak, longest_streak")
      .eq("child_id", childId)
      .maybeSingle(),

    admin
      .from("child_goals")
      .select("reward_id, rewards(title, credit_cost)")
      .eq("child_id", childId)
      .maybeSingle(),
  ])

  if (!child) redirect("/kid/select")

  const pendingCount = completions?.filter((c) => c.status === "pending_approval").length ?? 0

  const currentXp = child.xp_total ?? 0
  const currentLevel = child.level ?? 1
  const xpForCurrentLevel = Math.pow(currentLevel - 1, 2) * 50
  const xpForNextLevel = Math.pow(currentLevel, 2) * 50
  const xpProgress = xpForNextLevel > xpForCurrentLevel
    ? Math.round(((currentXp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100)
    : 100
  const currentStreakCount = streak?.current_streak ?? 0
  const balance = child.credit_balance ?? 0

  const goalReward = (() => {
    if (!goalRow) return null
    const r = Array.isArray(goalRow.rewards) ? goalRow.rewards[0] : goalRow.rewards
    return r as { title: string; credit_cost: number } | null
  })()
  const goalProgress = goalReward
    ? Math.min(100, Math.round((balance / goalReward.credit_cost) * 100))
    : 0

  return (
    <div className="space-y-5 pb-6">
      <div className="rounded-3xl bg-gradient-to-br from-violet-600 to-purple-700 text-white p-6 text-center shadow-[0_6px_0_#5b21b6]">
        <p className="text-3xl mb-1">👋</p>
        <h1 className="text-2xl font-black">Hey, {child.name}!</h1>
        <p className="text-white/80 text-sm font-medium mt-1">Keep going — you&apos;re doing amazing! 🌟</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-3xl border-4 border-amber-200 bg-amber-50 p-3 text-center shadow-[0_4px_0_#fde68a]">
          <p className="text-2xl">⭐</p>
          <p className="text-2xl font-black text-amber-700">{balance}</p>
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wide">Credits</p>
        </div>
        <div className="rounded-3xl border-4 border-violet-200 bg-violet-50 p-3 text-center shadow-[0_4px_0_#ddd6fe]">
          <p className="text-2xl">🏆</p>
          <p className="text-2xl font-black text-violet-700">Lv {currentLevel}</p>
          <p className="text-xs font-bold text-violet-600 uppercase tracking-wide">Level</p>
        </div>
        <div className={`rounded-3xl border-4 p-3 text-center shadow-[0_4px_0] ${currentStreakCount >= 3 ? "border-orange-200 bg-orange-50 shadow-orange-200" : "border-slate-200 bg-slate-50 shadow-slate-200"}`}>
          <p className="text-2xl">🔥</p>
          <p className={`text-2xl font-black ${currentStreakCount >= 3 ? "text-orange-700" : "text-slate-500"}`}>{currentStreakCount}</p>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Streak</p>
        </div>
      </div>

      <div className="rounded-3xl border-4 border-violet-200 bg-violet-50 p-4 shadow-[0_4px_0_#ddd6fe]">
        <div className="flex items-center justify-between text-xs font-bold text-violet-700 mb-2">
          <span>Level {currentLevel}</span>
          <span>{currentXp - xpForCurrentLevel} / {xpForNextLevel - xpForCurrentLevel} XP</span>
          <span>Level {currentLevel + 1}</span>
        </div>
        <div className="h-4 rounded-full bg-violet-200 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all" style={{ width: `${xpProgress}%` }} />
        </div>
      </div>

      {goalReward ? (
        <Link href={`/kid/${childId}/rewards`} className="block rounded-3xl border-4 border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 p-4 shadow-[0_4px_0_#fcd34d] hover:translate-y-[2px] hover:shadow-[0_2px_0_#fcd34d] transition-all">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wide">🎯 My Goal</p>
              <p className="font-black text-slate-800 mt-0.5">{goalReward.title}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-amber-600">{goalProgress}%</p>
              <p className="text-xs font-bold text-amber-500">{balance} / {goalReward.credit_cost} ⭐</p>
            </div>
          </div>
          <div className="h-4 rounded-full bg-amber-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 transition-all"
              style={{ width: `${goalProgress}%` }}
            />
          </div>
          {goalProgress >= 100 && (
            <p className="text-xs font-black text-emerald-600 mt-2 text-center">🎉 You can afford this! Go get it!</p>
          )}
        </Link>
      ) : (
        <Link href={`/kid/${childId}/rewards`} className="block rounded-3xl border-4 border-dashed border-amber-200 bg-amber-50/50 p-4 text-center hover:bg-amber-50 transition-colors">
          <p className="text-2xl mb-1">🎯</p>
          <p className="font-black text-slate-600 text-sm">Set a goal!</p>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Pick a reward to save up for</p>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link href={`/kid/${childId}/missions`} className="flex flex-col items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-black text-lg py-5 rounded-3xl shadow-[0_6px_0_#5b21b6] hover:shadow-[0_3px_0_#5b21b6] hover:translate-y-[3px] transition-all">
          <span className="text-3xl">🗂️</span>
          Missions
        </Link>
        <Link href={`/kid/${childId}/rewards`} className="flex flex-col items-center justify-center gap-2 bg-amber-400 hover:bg-amber-500 text-slate-900 font-black text-lg py-5 rounded-3xl shadow-[0_6px_0_#d97706] hover:shadow-[0_3px_0_#d97706] hover:translate-y-[3px] transition-all">
          <span className="text-3xl">🎁</span>
          Rewards
        </Link>
      </div>

      {pendingCount > 0 && (
        <div className="rounded-3xl border-4 border-amber-200 bg-amber-50 p-4 flex items-center gap-3 shadow-[0_4px_0_#fde68a]">
          <Clock className="w-6 h-6 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 font-bold flex-1">
            {pendingCount} mission{pendingCount !== 1 ? "s" : ""} waiting for parent to approve ⏳
          </p>
        </div>
      )}

      {(completions?.length ?? 0) > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-slate-700 text-sm uppercase tracking-wide">Recent missions</h2>
            <Link href={`/kid/${childId}/missions`} className="text-xs font-bold text-violet-600 flex items-center gap-0.5">
              See all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {completions!.map((c) => {
            const assignment = Array.isArray(c.chore_assignments) ? c.chore_assignments[0] : c.chore_assignments
            const chore = Array.isArray(assignment?.chores) ? assignment?.chores[0] : assignment?.chores
            const approved = c.status === "approved"
            return (
              <div key={c.id} className={`rounded-2xl border-2 p-3 flex items-center gap-3 ${approved ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
                <CheckCircle2 className={`w-5 h-5 shrink-0 ${approved ? "text-emerald-500" : "text-slate-300"}`} />
                <p className="text-sm font-bold flex-1 truncate text-slate-700">{chore?.title ?? "Chore"}</p>
                <span className={`text-xs font-black px-2 py-1 rounded-full ${approved ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {approved ? `+${chore?.credit_value ?? 0} ⭐` : "⏳ Pending"}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {(redemptions?.length ?? 0) > 0 && (
        <div className="space-y-3">
          <h2 className="font-black text-slate-700 text-sm uppercase tracking-wide">Reward requests</h2>
          {redemptions!.map((r) => {
            const reward = Array.isArray(r.rewards) ? r.rewards[0] : r.rewards
            const approved = r.status === "approved"
            return (
              <div key={r.id} className={`rounded-2xl border-2 p-3 flex items-center gap-3 ${approved ? "border-violet-200 bg-violet-50" : "border-slate-200 bg-white"}`}>
                <Gift className={`w-5 h-5 shrink-0 ${approved ? "text-violet-500" : "text-slate-300"}`} />
                <p className="text-sm font-bold flex-1 truncate text-slate-700">{reward?.title ?? "Reward"}</p>
                <span className={`text-xs font-black px-2 py-1 rounded-full ${approved ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"}`}>
                  {approved ? "Ready! 🎉" : "⏳ Pending"}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
