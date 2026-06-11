import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/shared/EmptyState"
import { Gift, Plus, Star } from "lucide-react"
import { DeleteRewardButton } from "@/components/parent/DeleteRewardButton"

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

  const { data: rewards } = await supabase
    .from("rewards")
    .select("id, title, description, credit_cost, category, is_active, quantity_available, quantity_redeemed")
    .eq("family_id", profile.family_id)
    .eq("is_active", true)
    .order("created_at")

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rewards</h1>
          <p className="text-muted-foreground text-sm mt-1">Things your children can redeem with their credits</p>
        </div>
        <Button>
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
                          <Star className="w-3 h-3 mr-1" />
                          {reward.credit_cost} credits
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
}
