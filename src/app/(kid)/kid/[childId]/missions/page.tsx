import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { EmptyState } from "@/components/shared/EmptyState"
import { MarkDoneButton } from "@/components/kid/MarkDoneButton"
import { CATEGORY_EMOJI } from "@/lib/constants"
import { Star } from "lucide-react"

interface PageProps {
  params: Promise<{ childId: string }>
}

export default async function KidMissionsPage({ params }: PageProps) {
  const { childId } = await params
  const supabase = await createClient()

  const { data: child } = await supabase
    .from("child_profiles")
    .select("family_id")
    .eq("id", childId)
    .single()

  if (!child) redirect("/kid/select")

  const { data: assignments } = await supabase
    .from("chore_assignments")
    .select(`id, chores(id, title, description, credit_value, category, due_time, requires_photo, times_per_period, period_unit)`)
    .eq("child_id", childId)
    .eq("is_active", true)

  const now = new Date()
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { data: periodCompletions } = await supabase
    .from("chore_completions")
    .select("assignment_id, completed_at, status")
    .eq("child_id", childId)
    .in("status", ["pending_approval", "approved"])
    .gte("completed_at", monthStart)

  function countForAssignment(assignmentId: string, periodUnit: string): number {
    const cutoff = periodUnit === "week" ? weekStart : periodUnit === "month" ? monthStart : dayStart
    return (periodCompletions ?? []).filter(
      (c) => c.assignment_id === assignmentId && c.completed_at >= cutoff
    ).length
  }

  type ChoreShape = {
    id: string
    title: string
    description?: string | null
    credit_value: number
    category: string
    due_time?: string | null
    requires_photo?: boolean
    times_per_period?: number
    period_unit?: string
  }

  const items = (assignments ?? []).map((a) => {
    const chore = (Array.isArray(a.chores) ? a.chores[0] : a.chores) as ChoreShape | null
    if (!chore) return null
    const timesAllowed = chore.times_per_period ?? 1
    const periodUnit = chore.period_unit ?? "day"
    const doneCount = countForAssignment(a.id, periodUnit)
    return { assignmentId: a.id, chore, timesAllowed, periodUnit, doneCount }
  }).filter(Boolean) as { assignmentId: string; chore: ChoreShape; timesAllowed: number; periodUnit: string; doneCount: number }[]

  const todo = items.filter((i) => i.doneCount < i.timesAllowed)
  const done = items.filter((i) => i.doneCount >= i.timesAllowed)

  const PERIOD_LABEL: Record<string, string> = { day: "day", week: "week", month: "month" }

  if (!items.length) {
    return (
      <EmptyState icon={Star} title="No missions yet" description="Your parent will add chores for you soon!" />
    )
  }

  return (
    <div className="space-y-5 pb-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800">My Missions 🗂️</h1>
        <p className="text-sm font-bold text-slate-500 mt-1">
          {todo.length} to do · {done.length} done
        </p>
      </div>

      {todo.length > 0 && (
        <div className="space-y-3">
          {todo.map(({ assignmentId, chore, timesAllowed, periodUnit, doneCount }) => (
            <div key={assignmentId} className="rounded-3xl border-4 border-violet-200 bg-white p-4 flex items-start gap-3 shadow-[0_4px_0_#ddd6fe]">
              <div className="text-3xl shrink-0">
                {CATEGORY_EMOJI[chore.category as keyof typeof CATEGORY_EMOJI] ?? "📋"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-slate-800">{chore.title}</p>
                {chore.description && (
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">{chore.description}</p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 border-2 border-amber-200 text-xs font-black px-2 py-0.5 rounded-full">
                    <Star className="w-3 h-3" />
                    {chore.credit_value} credits
                  </span>
                  {timesAllowed > 1 && (
                    <span className="text-xs font-black bg-violet-100 text-violet-700 border-2 border-violet-200 px-2 py-0.5 rounded-full">
                      {doneCount}/{timesAllowed}× this {PERIOD_LABEL[periodUnit] ?? periodUnit}
                    </span>
                  )}
                  {chore.due_time && (
                    <span className="text-xs font-bold text-slate-400">Due {chore.due_time}</span>
                  )}
                </div>
              </div>
              <MarkDoneButton
                assignmentId={assignmentId}
                childId={childId}
                familyId={child.family_id}
                requiresPhoto={chore.requires_photo ?? false}
              />
            </div>
          ))}
        </div>
      )}

      {done.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Completed ✅</h2>
          {done.map(({ assignmentId, chore, timesAllowed, periodUnit }) => (
            <div key={assignmentId} className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-3 flex items-center gap-3 opacity-70">
              <span className="text-xl shrink-0">
                {CATEGORY_EMOJI[chore.category as keyof typeof CATEGORY_EMOJI] ?? "📋"}
              </span>
              <p className="text-sm font-bold flex-1 truncate line-through text-slate-500">{chore.title}</p>
              <span className="text-xs font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full shrink-0">
                {timesAllowed > 1
                  ? `${timesAllowed}× this ${PERIOD_LABEL[periodUnit] ?? periodUnit} ✓`
                  : `+${chore.credit_value} ⭐`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
