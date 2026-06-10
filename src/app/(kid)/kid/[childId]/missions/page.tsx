import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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

  const { data: assignments } = await supabase
    .from("chore_assignments")
    .select(`
      id,
      chores(id, title, description, credit_value, category, due_time, requires_photo)
    `)
    .eq("child_id", childId)
    .eq("is_active", true)

  const { data: todayCompletions } = await supabase
    .from("chore_completions")
    .select("chore_assignment_id, status")
    .eq("child_id", childId)
    .in("status", ["pending_approval", "approved"])
    .gte("completed_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())

  const doneSet = new Set(todayCompletions?.map((c) => c.chore_assignment_id) ?? [])

  const items = (assignments ?? []).map((a) => {
    const chore = Array.isArray(a.chores) ? a.chores[0] : a.chores
    return { assignmentId: a.id, chore }
  }).filter((item) => item.chore != null)

  const todo = items.filter((i) => !doneSet.has(i.assignmentId))
  const done = items.filter((i) => doneSet.has(i.assignmentId))

  if (!items.length) {
    return (
      <EmptyState
        icon={Star}
        title="No missions yet"
        description="Your parent will add chores for you soon!"
      />
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Missions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {todo.length} to do · {done.length} done today
        </p>
      </div>

      {todo.length > 0 && (
        <div className="space-y-3">
          {todo.map(({ assignmentId, chore }) => (
            <Card key={assignmentId} className="border-2 border-primary/20">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="text-2xl shrink-0 mt-0.5">
                  {CATEGORY_EMOJI[chore!.category as keyof typeof CATEGORY_EMOJI] ?? "📋"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{chore!.title}</p>
                  {chore!.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{chore!.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                      <Star className="w-3 h-3 mr-1" />
                      {chore!.credit_value} credits
                    </Badge>
                    {chore!.due_time && (
                      <span className="text-xs text-muted-foreground">Due {chore!.due_time}</span>
                    )}
                  </div>
                </div>
                <MarkDoneButton
                  assignmentId={assignmentId}
                  childId={childId}
                  requiresPhoto={chore!.requires_photo ?? false}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {done.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Done today ✅
          </h2>
          {done.map(({ assignmentId, chore }) => (
            <Card key={assignmentId} className="opacity-60">
              <CardContent className="p-3 flex items-center gap-3">
                <span className="text-xl shrink-0">
                  {CATEGORY_EMOJI[chore!.category as keyof typeof CATEGORY_EMOJI] ?? "📋"}
                </span>
                <p className="text-sm flex-1 truncate line-through">{chore!.title}</p>
                <Badge variant="secondary" className="text-xs shrink-0">
                  +{chore!.credit_value} ⭐
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
