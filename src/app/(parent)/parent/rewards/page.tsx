export const dynamic = "force-dynamic"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/shared/EmptyState"
import { Gift, Plus, Star } from "lucide-react"
import { DeleteRewardButton } from "@/components/parent/DeleteRewardButton"
import { RewardsTabs } from "@/components/parent/RewardsTabs"

export default async function RewardsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("parent_profiles")
    .select("family_id")
    .eq("id", user.id)
    .single()
  if (!profile) redirect("/login")

  const [{ data: rewards }, { data: redemptions }] = await Promise.all([
    supabase
      .from("rewards")
      .select("id, title, description, credit_cost, category, is_active, quantity_available, quantity_redeemed")
      .eq("family_id", profile.family_id)
      .eq("is_active", true)
      .order("created_at"),
    supabase
      .from("reward_redemptions")
      .select(`id, status, requested_at, credits_spent, child_profiles(name), rewards(title)`)
      .eq("family_id", profile.family_id)
      .order("requested_at", { ascending: false })
      .limit(100),
  ])

  const rewardsCatalog = (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button asChild>
          <Link href="/parent/rewards/new"><Plus className="mr-2 w-4 h-4" /> Add reward</Link>
        </Button>
      </div>
      {!rewards?.length ? (
        <EmptyState
          icon={Gift}
          title="No rewards yet"
          description="Add rewards your children can redeem using their earned credits."
          action={{ label: "Add a reward", href: "/parent/rewards/new" }}
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {rewards.map((reward) => {
            const remaining = reward.quantity_available != null
              ? reward.quantity_available - (reward.quantity_redeemed ?? 0)
              : null
            return (
              <Card key={reward.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{reward.title}</p>
                      {reward.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{reward.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                          <Star className="w-3 h-3 mr-1" />{reward.credit_cost} credits
                        </Badge>
                        {reward.category && (
                          <Badge variant="outline" className="text-xs">{reward.category}</Badge>
                        )}
                        {remaining !== null && (
                          <Badge variant="secondary" className="text-xs">{remaining} left</Badge>
                        )}
                      </div>
                    </div>
                    <DeleteRewardButton rewardId={reward.id} rewardTitle={reward.title} />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )

  const STATUS_LABEL: Record<string, { label: string; color: string }> = {
    requested: { label: "Pending",   color: "bg-amber-100 text-amber-700 border-amber-200" },
    approved:  { label: "Approved",  color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    fulfilled: { label: "Fulfilled", color: "bg-blue-100 text-blue-700 border-blue-200" },
    denied:    { label: "Denied",    color: "bg-red-100 text-red-700 border-red-200" },
    cancelled: { label: "Cancelled", color: "bg-slate-100 text-slate-500 border-slate-200" },
  }

  const redemptionsList = (
    <div className="space-y-2">
      {!redemptions?.length ? (
        <EmptyState icon={Gift} title="No redemptions yet" description="Redemptions will appear here when children request rewards." />
      ) : redemptions.map((r) => {
        const child = Array.isArray(r.child_profiles) ? r.child_profiles[0] : r.child_profiles
        const reward = Array.isArray(r.rewards) ? r.rewards[0] : r.rewards
        const { label, color } = STATUS_LABEL[r.status] ?? { label: r.status, color: "bg-slate-100 text-slate-500" }
        return (
          <div key={r.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-white hover:bg-slate-50 transition-colors">
            <div className="text-xl shrink-0">🎁</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{(reward as { title?: string } | null)?.title ?? "—"}</p>
              <p className="text-xs text-muted-foreground">
                {(child as { name?: string } | null)?.name ?? "Unknown"} · {new Date(r.requested_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-amber-600">{r.credits_spent}⭐</span>
              <Badge className={`text-xs border ${color}`}>{label}</Badge>
            </div>
          </div>
        )
      })}
    </div>
  )

  const pendingCount = (redemptions ?? []).filter((r) => r.status === "requested").length

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Rewards</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage rewards and track redemption history</p>
      </div>
      <RewardsTabs
        catalogContent={rewardsCatalog}
        redemptionsContent={redemptionsList}
        pendingCount={pendingCount}
      />
    </div>
  )
}
