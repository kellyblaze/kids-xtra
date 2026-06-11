import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
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
        <h1 className="text-2xl font-black text-slate-800">Dashboard 🏡</h1>
        <p className="text-slate-500 text-sm mt-1 font-medium">Overview of your family&apos;s progress</p>
      </div>

      {pendingCount > 0 && (
        <Link
          href="/parent/approvals"
          className="flex items-center justify-between gap-4 rounded-3xl border-4 border-amber-200 bg-amber-50 p-4 shadow-[0_4px_0_#fde68a] hover:translate-y-[2px] hover:shadow-[0_2px_0_#fde68a] transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-200 flex items-center justify-center text-xl">⏳</div>
            <div>
              <p className="font-black text-amber-900 text-sm">
                {pendingCount} item{pendingCount !== 1 ? "s" : ""} waiting for your approval
              </p>
              <p className="text-amber-700 text-xs font-medium">Tap to review now</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-amber-600 shrink-0" />
        </Link>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { emoji: "👧", label: "Children", value: children?.length ?? 0, border: "border-blue-200", bg: "bg-blue-50", shadow: "shadow-blue-200", text: "text-blue-700" },
          { emoji: "✅", label: "Pending chores", value: pendingCompletions?.length ?? 0, border: "border-amber-200", bg: "bg-amber-50", shadow: "shadow-amber-200", text: "text-amber-700" },
          { emoji: "🎁", label: "Reward requests", value: pendingRedemptions?.length ?? 0, border: "border-violet-200", bg: "bg-violet-50", shadow: "shadow-violet-200", text: "text-violet-700" },
          { emoji: "⭐", label: "Total credits", value: children?.reduce((s, c) => s + c.credit_balance, 0) ?? 0, border: "border-emerald-200", bg: "bg-emerald-50", shadow: "shadow-emerald-200", text: "text-emerald-700" },
        ].map(({ emoji, label, value, border, bg, shadow, text }) => (
          <div key={label} className={`rounded-3xl border-4 ${border} ${bg} p-4 text-center shadow-[0_4px_0_0] ${shadow}`}>
            <p className="text-2xl mb-1">{emoji}</p>
            <p className={`text-3xl font-black ${text}`}>{value}</p>
            <p className="text-xs font-bold text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Children card */}
        <div className="rounded-3xl border-4 border-slate-200 bg-white shadow-[0_4px_0_#e2e8f0] overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="font-black text-slate-800">Your children</h2>
            <Link href="/parent/children" className="text-xs font-bold text-violet-600 flex items-center gap-1">
              Manage <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="px-3 pb-4 space-y-1">
            {!children?.length ? (
              <div className="text-center py-6">
                <p className="text-slate-500 text-sm mb-3 font-medium">No children yet</p>
                <Link href="/parent/children" className="inline-flex items-center gap-2 bg-violet-600 text-white font-bold text-sm px-4 py-2 rounded-2xl shadow-[0_3px_0_#5b21b6]">
                  Add your first child
                </Link>
              </div>
            ) : (
              children.map((child) => (
                <Link
                  key={child.id}
                  href={`/parent/children/${child.id}`}
                  className="flex items-center gap-3 p-3 rounded-2xl hover:bg-violet-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-2xl bg-violet-100 flex items-center justify-center text-xl border-2 border-violet-200">
                    {AVATAR_EMOJI[child.avatar_key ?? "star"] ?? "⭐"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-slate-800 truncate">{child.name}</p>
                    <p className="text-xs font-medium text-slate-500">Level {child.level}</p>
                  </div>
                  <p className="font-black text-sm text-amber-600 shrink-0">{child.credit_balance} ⭐</p>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Activity card */}
        <div className="rounded-3xl border-4 border-slate-200 bg-white shadow-[0_4px_0_#e2e8f0] overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="font-black text-slate-800">Recent activity</h2>
            <Link href="/parent/activity" className="text-xs font-bold text-violet-600 flex items-center gap-1">
              All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="px-4 pb-4 space-y-3">
            {!recentActivity?.length ? (
              <p className="text-slate-500 text-sm text-center py-6 font-medium">No activity yet</p>
            ) : (
              recentActivity.map((log) => (
                <div key={log.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-2xl bg-slate-100 flex items-center justify-center text-base shrink-0 border-2 border-slate-200">
                    {activityEmoji(log.event_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-700">
                      {(() => {
                        const child = Array.isArray(log.child_profiles)
                          ? log.child_profiles[0] ?? null
                          : log.child_profiles
                        return child?.name ?? "Parent"
                      })()}
                      {" "}
                      <span className="font-medium text-slate-500">{activityLabel(log.event_type, log.metadata as Record<string, string>)}</span>
                    </p>
                    <p className="text-xs text-slate-400 font-medium">{formatRelativeTime(log.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { href: "/parent/chores/new", label: "Add a chore", emoji: "✅", border: "border-blue-200", shadow: "shadow-blue-200" },
          { href: "/parent/rewards/new", label: "Add a reward", emoji: "🎁", border: "border-violet-200", shadow: "shadow-violet-200" },
          { href: "/parent/children", label: "Add a child", emoji: "👧", border: "border-emerald-200", shadow: "shadow-emerald-200" },
        ].map(({ href, label, emoji, border, shadow }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 p-4 rounded-3xl border-4 ${border} bg-white shadow-[0_4px_0_0] ${shadow} hover:translate-y-[2px] hover:shadow-[0_2px_0_0] transition-all`}
          >
            <span className="text-2xl">{emoji}</span>
            <span className="font-black text-sm text-slate-700">{label}</span>
            <ArrowRight className="w-4 h-4 text-slate-400 ml-auto" />
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
