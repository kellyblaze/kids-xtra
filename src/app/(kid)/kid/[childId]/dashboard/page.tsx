import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, Clock, Star, Gift, ChevronRight, Flame } from "lucide-react"

interface PageProps {
  params: Promise<{ childId: string }>
}

export default async function KidDashboardPage({ params }: PageProps) {
  const { childId } = await params

  const supabase = await createClient()

  const [{ data: child }, { data: completions }, { data: redemptions }, { data: streak }] = await Promise.all([
    supabase
      .from("child_profiles")
      .select("id, name, credit_balance, level, xp_total")
      .eq("id", childId)
      .single(),

    supabase
      .from("chore_completions")
      .select(`
        id, status, completed_at,
        chore_assignments(chores(title, credit_value))
      `)
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
  ])

  if (!child) redirect("/kid/select")

  const pendingCount = completions?.filter((c) => c.status === "pending_approval").length ?? 0

  // XP needed to reach next level: level N requires (N-1)^2 * 50 XP
  const currentXp = child?.xp_total ?? 0
  const currentLevel = child?.level ?? 1
  const xpForCurrentLevel = Math.pow(currentLevel - 1, 2) * 50
  const xpForNextLevel = Math.pow(currentLevel, 2) * 50
  const xpProgress = xpForNextLevel > xpForCurrentLevel
    ? Math.round(((currentXp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100)
    : 100
  const currentStreakCount = streak?.current_streak ?? 0

  return (
    <div className="space-y-6">
      <div className="text-center py-2">
        <p className="text-lg font-semibold text-violet-700">Great job, {child.name}! 🎉</p>
        <p className="text-sm text-muted-foreground mt-1">Keep earning credits to unlock rewards</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-3 text-center">
            <Star className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-amber-700">{child.credit_balance ?? 0}</p>
            <p className="text-xs text-amber-600 font-medium">Credits</p>
          </CardContent>
        </Card>
        <Card className="bg-violet-50 border-violet-200">
          <CardContent className="p-3 text-center">
            <span className="text-xl block mb-1">🏆</span>
            <p className="text-xl font-bold text-violet-700">Lv {child.level ?? 1}</p>
            <p className="text-xs text-violet-600 font-medium">Level</p>
          </CardContent>
        </Card>
        <Card className={`${currentStreakCount >= 3 ? "bg-orange-50 border-orange-200" : "bg-muted/50"}`}>
          <CardContent className="p-3 text-center">
            <Flame className={`w-5 h-5 mx-auto mb-1 ${currentStreakCount >= 3 ? "text-orange-500" : "text-muted-foreground"}`} />
            <p className={`text-xl font-bold ${currentStreakCount >= 3 ? "text-orange-700" : "text-foreground"}`}>
              {currentStreakCount}
            </p>
            <p className="text-xs text-muted-foreground font-medium">Streak</p>
          </CardContent>
        </Card>
      </div>

      {/* XP progress bar */}
      <Card className="bg-violet-50 border-violet-100">
        <CardContent className="p-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-violet-700 font-medium">Level {currentLevel} → {currentLevel + 1}</span>
            <span className="text-violet-500">{currentXp - xpForCurrentLevel} / {xpForNextLevel - xpForCurrentLevel} XP</span>
          </div>
          <Progress value={xpProgress} className="h-2 bg-violet-100 [&>div]:bg-violet-500" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Button asChild size="lg" className="h-14 text-base font-semibold rounded-xl">
          <Link href={`/kid/${childId}/missions`}>
            <Star className="w-5 h-5 mr-2" />
            Missions
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-14 text-base font-semibold rounded-xl border-2">
          <Link href={`/kid/${childId}/rewards`}>
            <Gift className="w-5 h-5 mr-2" />
            Rewards
          </Link>
        </Button>
      </div>

      {pendingCount > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-700 font-medium flex-1">
              {pendingCount} mission{pendingCount !== 1 ? "s" : ""} waiting for parent approval
            </p>
          </CardContent>
        </Card>
      )}

      {(completions?.length ?? 0) > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recent</h2>
            <Link href={`/kid/${childId}/missions`} className="text-xs text-primary flex items-center gap-0.5">
              See all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {completions!.map((c) => {
            const assignment = Array.isArray(c.chore_assignments) ? c.chore_assignments[0] : c.chore_assignments
            const chore = Array.isArray(assignment?.chores) ? assignment?.chores[0] : assignment?.chores
            return (
              <Card key={c.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <p className="text-sm flex-1 truncate">{chore?.title ?? "Chore"}</p>
                  <Badge variant={c.status === "approved" ? "default" : "secondary"} className="text-xs shrink-0">
                    {c.status === "approved" ? `+${chore?.credit_value ?? 0} ⭐` : "Pending"}
                  </Badge>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {(redemptions?.length ?? 0) > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Reward requests</h2>
          {redemptions!.map((r) => {
            const reward = Array.isArray(r.rewards) ? r.rewards[0] : r.rewards
            return (
              <Card key={r.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <Gift className="w-4 h-4 text-violet-500 shrink-0" />
                  <p className="text-sm flex-1 truncate">{reward?.title ?? "Reward"}</p>
                  <Badge variant={r.status === "approved" ? "default" : "secondary"} className="text-xs shrink-0">
                    {r.status === "approved" ? "Ready! 🎉" : "Pending"}
                  </Badge>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
