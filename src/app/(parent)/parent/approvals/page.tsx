export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import type React from "react"
import { CheckCircle2, Gift, Inbox, ShieldCheck } from "lucide-react"
import {
  ApprovalCard,
  type ChoreItem,
  type RewardItem,
} from "@/components/parent/ApprovalCard"
import { RealtimeApprovalsRefresh } from "@/components/parent/RealtimeApprovalsRefresh"
import { BulkApproveButton } from "@/components/parent/BulkApproveButton"
import { chorePhotoUrl, normalizeStoredChorePhotoPath } from "@/lib/chore-photos"

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
        id, status, completed_at, photo_url, checklist_completed,
        child_profiles(id, name, avatar_key),
        chore_assignments(chores(title, category, credit_value, xp_value, checklist_items))
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

  const completionCount = completions?.length ?? 0
  const redemptionCount = redemptions?.length ?? 0
  const total = completionCount + redemptionCount

  return (
    <div className="mx-auto max-w-6xl space-y-8 text-slate-950">
      <RealtimeApprovalsRefresh familyId={profile.family_id} />

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="p-6 md:p-8">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <ShieldCheck className="size-6" />
            </div>
            <p className="mt-5 text-sm font-bold text-emerald-700">
              Mission Review Desk
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
              Review proof, approve effort, keep rewards moving.
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-600">
              Mission Checks and reward requests appear here as soon as
              children submit them. Use Needs More Work when a Mission needs a
              clearer finish.
            </p>
          </div>

          <div className="grid gap-3 border-t border-slate-200 bg-slate-50 p-6 md:p-8 lg:border-l lg:border-t-0">
            <ReviewStat
              icon={Inbox}
              label="Total waiting"
              value={total}
              detail="Items in the parent queue"
            />
            <ReviewStat
              icon={CheckCircle2}
              label="Mission Checks"
              value={completionCount}
              detail="Proof ready to review"
            />
            <ReviewStat
              icon={Gift}
              label="Reward requests"
              value={redemptionCount}
              detail="Rewards awaiting approval"
            />
          </div>
        </div>
      </section>

      {total === 0 ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-10 text-center shadow-sm">
          <div className="mx-auto flex size-14 items-center justify-center rounded-3xl bg-white text-emerald-700 shadow-sm">
            <CheckCircle2 className="size-7" />
          </div>
          <h2 className="mt-5 text-2xl font-black text-emerald-950">
            All caught up
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-emerald-800">
            No Mission Checks or reward requests are waiting right now. New
            submissions will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
          <div className="space-y-8">
            {completions && completions.length > 0 && (
              <section className="space-y-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="text-xl font-black text-slate-950">
                      Mission Checks
                    </h2>
                    <p className="text-sm font-medium text-slate-500">
                      Review completion proof and award Credits.
                    </p>
                  </div>
                  {completions.length > 1 && (
                    <BulkApproveButton count={completions.length} />
                  )}
                </div>
                <div className="space-y-4">
                  {completions.map((c) => {
                    type ChoreInfo = {
                      title: string
                      category: string
                      credit_value: number
                      xp_value?: number | null
                      checklist_items?: string[] | null
                    }
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
                      photo_url: c.photo_url
                        ? (() => {
                            const path = normalizeStoredChorePhotoPath(c.photo_url)
                            return path ? chorePhotoUrl(path) : null
                          })()
                        : null,
                      child_profiles: child,
                      checklist_completed: c.checklist_completed ?? [],
                      chore_assignments: chore ? { chores: chore } : null,
                    }
                    return (
                      <ApprovalCard key={c.id} type="chore" item={item} />
                    )
                  })}
                </div>
              </section>
            )}

            {redemptions && redemptions.length > 0 && (
              <section className="space-y-4">
                <div>
                  <h2 className="text-xl font-black text-slate-950">
                    Reward requests
                  </h2>
                  <p className="text-sm font-medium text-slate-500">
                    Confirm the reward is ready before approving.
                  </p>
                </div>
                <div className="space-y-4">
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
                </div>
              </section>
            )}
          </div>

          <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-black text-slate-950">
              Review rhythm
            </h2>
            <div className="mt-4 space-y-4">
              <ReviewStep
                number="1"
                title="Check the proof"
                body="Look for photo evidence, checklist items, or the child note."
              />
              <ReviewStep
                number="2"
                title="Approve or coach"
                body="Approve strong effort, or choose Needs More Work with a clear note."
              />
              <ReviewStep
                number="3"
                title="Fulfill rewards"
                body="Approve reward requests only when the reward can be delivered."
              />
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

type IconType = React.ComponentType<{ className?: string }>

function ReviewStat({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: IconType
  label: string
  value: number
  detail: string
}) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-sm font-black text-slate-950">{label}</p>
        <p className="text-xs font-bold text-slate-500">{detail}</p>
      </div>
      <p className="text-2xl font-black text-slate-950">{value}</p>
    </div>
  )
}

function ReviewStep({
  number,
  title,
  body,
}: {
  number: string
  title: string
  body: string
}) {
  return (
    <div className="flex gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">
        {number}
      </div>
      <div>
        <p className="text-sm font-black text-slate-950">{title}</p>
        <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
          {body}
        </p>
      </div>
    </div>
  )
}
