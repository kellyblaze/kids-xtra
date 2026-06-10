import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, CheckSquare, Gift, Star, ArrowRight, Clock } from "lucide-react"
import { AVATAR_EMOJI } from "@/lib/constants"

export default async function ParentDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("parent_profiles")
    .select("family_id")
    .eq("id", user.id)
    .single()

  if (!profile) redirect("/login")

  const familyId = profile.family_id

  const [
    { data: children },
    { data: pendingCompletions },
    { data: pendingRedemptions },
    { data: recentActivity },
  ] = await Promise.all([
    supabase
      .from("child_profiles")
      .select("id, name, avatar_key, color_theme, credit_balance, level")
      .eq("family_id", familyId)
      .eq("is_active", true)
      .order("created_at"),
    supabase
      .from("chore_completions")
      .select("id, child_id, completed_at")
      .eq("family_id", familyId)
      .eq("status", "pending_approval")
      .limit(10),
    supabase
      .from("reward_redemptions")
      .select("id, child_id, requested_at")
      .eq("family_id", familyId)
      .eq("status", "requested")
      .limit(10),
    supabase
      .from("activity_logs")
      .select("id, event_type, metadata, created_at, child_profiles(name)")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false })
      .limit(8),
  ])

  const pendingCount = (pendingCompletions?.length ?? 0) + (pendingRedemptions?.length ?? 0)

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of your family&apos;s progress</p>
      </div>

      {pendingCount > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-amber-900 text-sm">
                {pendingCount} item{pendingCount !== 1 ? "s" : ""} waiting for your approval
              </p>
              <p className="text-amber-700 text-xs">Completed chores and reward requests</p>
            </div>
          </div>
          <Button size="sm" asChild className="bg-amber-600 hover:bg-amber-700 text-white shrink-0">
            <Link href="/parent/approvals">
              Review now <ArrowRight className="ml-1 w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Children", value: children?.length ?? 0, icon: Users, color: "bg-primary/10 text-primary" },
          { label: "Pending chores", value: pendingCompletions?.length ?? 0, icon: CheckSquare, color: "bg-amber-100 text-amber-600" },
          { label: "Reward requests", value: pendingRedemptions?.length ?? 0, icon: Gift, color: "bg-violet-100 text-violet-600" },
          { label: "Total credits", value: children?.reduce((s, c) => s + c.credit_balance, 0) ?? 0, icon: Star, color: "bg-emerald-100 text-emerald-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Your children</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/parent/children">Manage <ArrowRight className="ml-1 w-3.5 h-3.5" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {!children?.length ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm mb-3">No children yet</p>
                <Button size="sm" asChild><Link href="/parent/children">Add your first child</Link></Button>
              </div>
            ) : (
              children.map((child) => (
                <Link
                  key={child.id}
                  href={`/parent/children/${child.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">
                    {AVATAR_EMOJI[child.avatar_key ?? "star"] ?? "⭐"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{child.name}</p>
                    <p className="text-xs text-muted-foreground">Level {child.level}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-sm">{child.credit_balance}</p>
                    <p className="text-xs text-muted-foreground">credits</p>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent activity</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/parent/activity">All <ArrowRight className="ml-1 w-3.5 h-3.5" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {!recentActivity?.length ? (
              <p className="text-muted-foreground text-sm text-center py-6">No activity yet</p>
            ) : (
              recentActivity.map((log) => (
                <div key={log.id} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-sm shrink-0">
                    {activityEmoji(log.event_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">
                        {(log.child_profiles as { name: string } | null)?.name ?? "Parent"}
                      </span>{" "}
                      {activityLabel(log.event_type, log.metadata as Record<string, string>)}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatRelativeTime(log.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { href: "/parent/chores/new", label: "Add a chore", icon: CheckSquare, color: "bg-primary/10 text-primary" },
          { href: "/parent/rewards/new", label: "Add a reward", icon: Gift, color: "bg-violet-100 text-violet-600" },
          { href: "/parent/children", label: "Add a child", icon: Users, color: "bg-emerald-100 text-emerald-600" },
        ].map(({ href, label, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 p-4 rounded-xl border bg-white hover:shadow-sm transition-shadow"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="font-medium text-sm">{label}</span>
            <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto" />
          </Link>
        ))}
      </div>
    </div>
  )
}

function activityEmoji(eventType: string): string {
  const map: Record<string, string> = {
    chore_completed: "✅",
    chore_approved: "🌟",
    chore_rejected: "💬",
    reward_requested: "🎁",
    reward_approved: "🎉",
    child_created: "👤",
    chore_created: "📋",
  }
  return map[eventType] ?? "📝"
}

function activityLabel(eventType: string, metadata: Record<string, string> | null): string {
  const m = metadata ?? {}
  const map: Record<string, string> = {
    chore_completed: `completed "${m.chore_title ?? "a chore"}"`,
    chore_approved: `earned ${m.credits ?? ""} credits`,
    chore_rejected: `got feedback on a chore`,
    reward_requested: `requested "${m.reward_title ?? "a reward"}"`,
    reward_approved: `redeemed "${m.reward_title ?? "a reward"}"`,
    child_created: "profile was created",
    chore_created: `new chore "${m.chore_title ?? ""}" added`,
  }
  return map[eventType] ?? eventType.replace(/_/g, " ")
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
