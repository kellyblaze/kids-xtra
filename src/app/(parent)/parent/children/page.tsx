import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AddChildDialog } from "@/components/parent/AddChildDialog"
import { EmptyState } from "@/components/shared/EmptyState"
import { AVATAR_EMOJI } from "@/lib/constants"
import { Users, ArrowRight } from "lucide-react"

export default async function ChildrenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("parent_profiles")
    .select("family_id")
    .eq("id", user.id)
    .single()
  if (!profile) redirect("/login")

  const { data: children } = await supabase
    .from("child_profiles")
    .select("id, name, nickname, avatar_key, color_theme, credit_balance, level")
    .eq("family_id", profile.family_id)
    .eq("is_active", true)
    .order("created_at")

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Children</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your children&apos;s profiles</p>
        </div>
        <AddChildDialog />
      </div>

      {!children?.length ? (
        <EmptyState
          icon={Users}
          title="No children yet"
          description="Add your first child to get started with chores and rewards."
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {children.map((child) => (
            <Card key={child.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl shrink-0">
                  {AVATAR_EMOJI[child.avatar_key ?? "star"] ?? "⭐"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{child.name}</p>
                  {child.nickname && (
                    <p className="text-xs text-muted-foreground">{child.nickname}</p>
                  )}
                  <p className="text-sm mt-0.5">
                    <span className="font-medium">{child.credit_balance}</span>
                    <span className="text-muted-foreground"> credits · Level {child.level}</span>
                  </p>
                </div>
                <Button variant="ghost" size="icon" asChild className="shrink-0">
                  <Link href={`/parent/children/${child.id}`}>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
