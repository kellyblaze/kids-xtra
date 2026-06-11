import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { EmptyState } from "@/components/shared/EmptyState"
import { RedeemButton } from "@/components/kid/RedeemButton"
import { Gift, Star } from "lucide-react"

interface PageProps {
  params: Promise<{ childId: string }>
}

export default async function KidRewardsPage({ params }: PageProps) {
  const { childId } = await params

  const supabase = await createClient()

  const [{ data: child }, { data: rewards }, { data: pendingRedemptions }] = await Promise.all([
    supabase
      .from("child_profiles")
      .select("credit_balance, family_id")
      .eq("id", childId)
      .single(),

    supabase
      .from("rewards")
      .select("id, title, description, credit_cost, category, quantity_available, quantity_redeemed, family_id")
      .eq("is_active", true)
      .order("credit_cost"),

    supabase
      .from("reward_redemptions")
      .select("reward_id")
      .eq("child_id", childId)
      .eq("status", "requested"),
  ])

  if (!child) redirect("/kid/select")

  const familyRewards = rewards?.filter((r) => r.family_id === child.family_id) ?? []
  const pendingSet = new Set(pendingRedemptions?.map((r) => r.reward_id) ?? [])
  const balance = child.credit_balance ?? 0

  if (!familyRewards.length) {
    return (
      <EmptyState
        icon={Gift}
        title="No rewards yet"
        description="Your parent will add rewards for you to earn!"
      />
    )
  }

  return (
    <div className="space-y-5 pb-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800">Rewards 🎁</h1>
        <div className="mt-2 inline-flex items-center gap-2 bg-amber-100 border-2 border-amber-200 text-amber-700 font-black text-sm px-3 py-1.5 rounded-full">
          <Star className="w-4 h-4" />
          {balance} credits to spend
        </div>
      </div>

      <div className="space-y-3">
        {familyRewards.map((reward) => {
          const remaining = reward.quantity_available != null
            ? reward.quantity_available - (reward.quantity_redeemed ?? 0)
            : null
          const canAfford = balance >= reward.credit_cost
          const outOfStock = remaining !== null && remaining <= 0
          const alreadyPending = pendingSet.has(reward.id)
          const dim = outOfStock || alreadyPending

          return (
            <div
              key={reward.id}
              className={`rounded-3xl border-4 p-4 flex items-start gap-3 transition-all ${dim ? "border-slate-200 bg-slate-50 opacity-60 shadow-none" : canAfford ? "border-amber-200 bg-amber-50 shadow-[0_4px_0_#fde68a]" : "border-slate-200 bg-white shadow-[0_4px_0_#e2e8f0]"}`}
            >
              <div className="w-12 h-12 rounded-2xl bg-violet-100 border-2 border-violet-200 flex items-center justify-center text-2xl shrink-0">
                🎁
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-slate-800">{reward.title}</p>
                {reward.description && (
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 font-medium">{reward.description}</p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-full border-2 ${canAfford ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                    <Star className="w-3 h-3" />
                    {reward.credit_cost} credits
                  </span>
                  {remaining !== null && !outOfStock && (
                    <span className="text-xs font-bold text-slate-400">{remaining} left</span>
                  )}
                  {outOfStock && <span className="text-xs font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Out of stock</span>}
                  {alreadyPending && <span className="text-xs font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Requested ✓</span>}
                </div>
              </div>
              {!outOfStock && !alreadyPending && (
                <RedeemButton
                  rewardId={reward.id}
                  childId={childId}
                  canAfford={canAfford}
                  creditCost={reward.credit_cost}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
