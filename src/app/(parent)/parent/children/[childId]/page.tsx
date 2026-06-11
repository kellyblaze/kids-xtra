import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AVATAR_EMOJI, CATEGORY_EMOJI } from "@/lib/constants"
import { ArrowLeft, Star, CheckCircle, XCircle, Clock } from "lucide-react"
import { EditChildDialog } from "@/components/parent/EditChildDialog"
import { DeleteChildButton } from "@/components/parent/DeleteChildButton"

interface PageProps {
  params: Promise<{ childId: string }>
}

export default async function ChildDetailPage({ params }: PageProps) {
  const { childId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("parent_profiles")
    .select("family_id")
    .eq("id", user.id)
    .single()
  if (!profile) redirect("/login")

  const { data: child } = await supabase
    .from("child_profiles")
    .select("id, name, nickname, avatar_key, color_theme, credit_balance, level, xp_total, is_active")
    .eq("id", childId)
    .eq("family_id", profile.family_id)
    .single()

  if (!child || !child.is_active) notFound()

  const [
    { data: completions },
    { data: transactions },
    { data: assignments },
  ] = await Promise.all([
    supabase
      .from("chore_completions")
      .select("id, status, completed_at, chore_assignments(chores(title, category, credit_value))")
      .eq("child_id", childId)
      .order("completed_at", { ascending: false })
      .limit(10),
    supabase
      .from("credit_transactions")
      .select("id, type, amount, note, created_at")
      .eq("child_id", childId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("chore_assignments")
      .select("id, chores(id, title, category, credit_value, frequency)")
      .eq("child_id", childId)
      .eq("family_id", profile.family_id),
  ])

  const approvedCount = completions?.filter((c) => c.status === "approved").length ?? 0

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon">
          <Link href="/parent/children"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold">{child.name}</h1>
      </div>

      <div className="flex items-start gap-4 p-5 rounded-2xl bg-primary/5 border border-primary/10">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-3xl shrink-0">
          {AVATAR_EMOJI[child.avatar_key ?? "star"] ?? "⭐"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold">{child.name}</h2>
            {child.nickname && <span className="text-muted-foreground text-sm">({child.nickname})</span>}
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm flex-wrap">
            <span><span className="font-semibold text-primary">{child.credit_balance}</span> credits</span>
            <span>Level <span className="font-semibold">{child.level}</span></span>
            <span><span className="font-semibold">{approvedCount}</span> chores done</span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <EditChildDialog child={child} />
          <DeleteChildButton childId={child.id} childName={child.name} />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Assigned chores ({assignments?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!assignments?.length ? (
              <p className="text-sm text-muted-foreground">No chores assigned yet.</p>
            ) : (
              assignments.map((a) => {
                type ChoreShape = { id: string; title: string; category: string; credit_value: number; frequency: string }
                const chore = a.chores as ChoreShape | null
                if (!chore) return null
                return (
                  <div key={a.id} className="flex items-center gap-2 text-sm">
                    <span>{CATEGORY_EMOJI[chore.category as keyof typeof CATEGORY_EMOJI] ?? "📋"}</span>
                    <span className="flex-1 truncate">{chore.title}</span>
                    <Badge variant="secondary" className="shrink-0">{chore.credit_value} cr</Badge>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent completions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!completions?.length ? (
              <p className="text-sm text-muted-foreground">No completions yet.</p>
            ) : (
              completions.map((c) => {
                type AssignShape = { chores: { title: string; category: string } }
                const chore = (c.chore_assignments as AssignShape | null)?.chores
                const StatusIcon =
                  c.status === "approved" ? CheckCircle
                  : c.status === "rejected" ? XCircle
                  : Clock
                const iconColor =
                  c.status === "approved" ? "text-emerald-500"
                  : c.status === "rejected" ? "text-destructive"
                  : "text-amber-500"
                return (
                  <div key={c.id} className="flex items-center gap-2 text-sm">
                    <StatusIcon className={`w-4 h-4 shrink-0 ${iconColor}`} />
                    <span className="flex-1 truncate">{chore?.title ?? "Chore"}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(c.completed_at).toLocaleDateString()}
                    </span>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" /> Credit history
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!transactions?.length ? (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between text-sm">
                <div className="flex-1 min-w-0">
                  <p className="truncate">{tx.note ?? tx.type.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`font-semibold shrink-0 ml-3 ${tx.amount >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                  {tx.amount >= 0 ? "+" : ""}{tx.amount}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
