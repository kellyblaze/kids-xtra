import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { EmptyState } from "@/components/shared/EmptyState"
import { ApprovalCard } from "@/components/parent/ApprovalCard"
import { CheckSquare } from "lucide-react"

export default async function ApprovalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("parent_profiles")
    .select("family_id")
    .eq("id", user.id)
    .single()
  if (!profile) redirect("/login")

  const [{ data: completions }, { data: redemptions }] = await Promise.all([
    supabase
      .from("chore_completions")
      .select(`
        id, status, completed_at, photo_url,
        child_profiles(id, name, avatar_key),
        chore_assignments(chores(title, category, credit_value))
      `)
      .eq("family_id", profile.family_id)
      .eq("status", "pending_approval")
      .order("completed_at"),
    supabase
      .from("reward_redemptions")
      .select(`
        id, status, requested_at, credits_spent,
        child_profiles(id, name, avatar_key),
        rewards(title, category)
      `)
      .eq("family_id", profile.family_id)
      .eq("status", "requested")
      .order("requested_at"),
  ])

  const total = (completions?.length ?? 0) + (redemptions?.length ?? 0)

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Approvals</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {total > 0
            ? `${total} item${total !== 1 ? "s" : ""} waiting for review`
            : "Nothing pending review"}
        </p>
      </div>

      {total === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="All caught up!"
          description="No chore completions or reward requests waiting for your review."
        />
      ) : (
        <div className="space-y-6">
          {completions && completions.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Chore completions ({completions.length})
              </h2>
              {completions.map((c) => {
                type ChoreInfo = { title: string; category: string; credit_value: number }
                const child = Array.isArray(c.child_profiles) ? c.child_profiles[0] ?? null : c.child_profiles
                const assignment = Array.isArray(c.chore_assignments) ? c.chore_assignments[0] ?? null : c.chore_assignments
                const chore = (() => {
                  const chores = assignment?.chores
                  if (!chores) return null
                  return Array.isArray(chores) ? chores[0] ?? null : chores
                })() as ChoreInfo | null
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return (
                  <ApprovalCard key={c.id} type="chore" item={{ ...c, child_profiles: child as any, chore_assignments: chore ? { chores: chore } : null } as any} />
                )
              })}
            </section>
          )}

          {redemptions && redemptions.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Reward requests ({redemptions.length})
              </h2>
              {redemptions.map((r) => {
                const child = Array.isArray(r.child_profiles) ? r.child_profiles[0] ?? null : r.child_profiles
                const reward = Array.isArray(r.rewards) ? r.rewards[0] ?? null : r.rewards
                return (
                  <ApprovalCard key={r.id} type="reward" item={{ ...r, child_profiles: child, rewards: reward }} />
                )
              })}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
