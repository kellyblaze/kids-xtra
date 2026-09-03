export const dynamic = "force-dynamic"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import {
  ApprovalCard,
  type ChoreItem,
  type RewardItem,
} from "@/components/parent/ApprovalCard"
import { RealtimeApprovalsRefresh } from "@/components/parent/RealtimeApprovalsRefresh"

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
      <RealtimeApprovalsRefresh familyId={profile.family_id} />
      <div>
        <h1 className="text-2xl font-black text-slate-800">Approvals ✅</h1>
        <p className="text-slate-500 text-sm mt-1 font-medium">
          {total > 0
            ? `${total} item${total !== 1 ? "s" : ""} waiting for review`
            : "Nothing pending review"}
        </p>
      </div>

      {total === 0 ? (
        <div className="rounded-3xl border-4 border-emerald-200 bg-emerald-50 p-10 text-center shadow-[0_4px_0_#a7f3d0]">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="font-black text-xl text-emerald-800">All caught up!</h2>
          <p className="text-emerald-700 font-medium mt-1 text-sm">No chore completions or reward requests waiting.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {completions && completions.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">
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
                const item: ChoreItem = {
                  id: c.id,
                  completed_at: c.completed_at,
                  photo_url: c.photo_url,
                  child_profiles: child,
                  chore_assignments: chore ? { chores: chore } : null,
                }
                return (
                  <ApprovalCard key={c.id} type="chore" item={item} />
                )
              })}
            </section>
          )}

          {redemptions && redemptions.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Reward requests ({redemptions.length})
              </h2>
              {redemptions.map((r) => {
                const child = Array.isArray(r.child_profiles) ? r.child_profiles[0] ?? null : r.child_profiles
                const reward = Array.isArray(r.rewards) ? r.rewards[0] ?? null : r.rewards
                const item: RewardItem = {
                  id: r.id,
                  requested_at: r.requested_at,
                  credits_spent: r.credits_spent,
                  child_profiles: child,
                  rewards: reward,
                }
                return (
                  <ApprovalCard key={r.id} type="reward" item={item} />
                )
              })}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
