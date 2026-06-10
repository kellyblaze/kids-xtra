import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Rewards</h1>
        <p className="text-sm text-muted-foreground mt-1">
          You have <span className="font-semibold text-amber-600">⭐ {balance} credits</span> to spend
        </p>
      </div>

      <div className="space-y-3">
        {familyRewards.map((reward) => {
          const remaining = reward.quantity_available != null
            ? reward.quantity_available - (reward.quantity_redeemed ?? 0)
            : null
          const canAfford = balance >= reward.credit_cost
          const outOfStock = remaining !== null && remaining <= 0
          const alreadyPending = pendingSet.has(reward.id)

          return (
            <Card
              key={reward.id}
              className={`transition-opacity ${outOfStock || alreadyPending ? "opacity-60" : ""}`}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center text-2xl shrink-0">
                  🎁
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{reward.title}</p>
                  {reward.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{reward.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge
                      className={`text-xs ${canAfford ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-muted text-muted-foreground"}`}
                    >
                      <Star className="w-3 h-3 mr-1" />
                      {reward.credit_cost} credits
                    </Badge>
                    {remaining !== null && !outOfStock && (
                      <span className="text-xs text-muted-foreground">{remaining} left</span>
                    )}
                    {outOfStock && <Badge variant="secondary" className="text-xs">Out of stock</Badge>}
                    {alreadyPending && <Badge variant="secondary" className="text-xs">Requested ✓</Badge>}
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
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
