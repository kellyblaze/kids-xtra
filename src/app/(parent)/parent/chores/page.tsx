export const dynamic = "force-dynamic"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/shared/EmptyState"
import { CATEGORY_EMOJI, CATEGORY_LABELS, FREQUENCY_LABELS } from "@/lib/constants"
import { Plus, CheckSquare, Pencil } from "lucide-react"
import { DeleteChoreButton } from "@/components/parent/DeleteChoreButton"
import { SuggestChoresButton } from "@/components/parent/SuggestChoresButton"

export default async function ChoresPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("parent_profiles")
    .select("family_id")
    .eq("id", user.id)
    .single()
  if (!profile) redirect("/login")

  const { data: chores } = await supabase
    .from("chores")
    .select(`
      id, title, description, category, frequency, credit_value, is_active,
      chore_assignments(child_id, child_profiles(name))
    `)
    .eq("family_id", profile.family_id)
    .eq("is_active", true)
    .order("created_at")

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Chores</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage tasks your children can complete for credits</p>
        </div>
        <div className="flex gap-2">
          <SuggestChoresButton />
          <Button>
            <Link href="/parent/chores/new"><Plus className="mr-2 w-4 h-4" /> Add chore</Link>
          </Button>
        </div>
      </div>

      {!chores?.length ? (
        <EmptyState
          icon={CheckSquare}
          title="No chores yet"
          description="Add your first chore so your children can start earning credits."
          action={{ label: "Add a chore", href: "/parent/chores/new" }}
        />
      ) : (
        <div className="space-y-3">
          {chores.map((chore) => {
            const assignments = (() => {
              const raw = chore.chore_assignments
              if (!raw) return []
              return Array.isArray(raw) ? raw : [raw]
            })()
            return (
              <Card key={chore.id}>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl shrink-0">
                    {CATEGORY_EMOJI[chore.category as keyof typeof CATEGORY_EMOJI] ?? "📋"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{chore.title}</p>
                      <Badge variant="secondary">{chore.credit_value} credits</Badge>
                      <Badge variant="outline" className="text-xs">
                        {FREQUENCY_LABELS[chore.frequency] ?? chore.frequency}
                      </Badge>
                    </div>
                    {chore.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">{chore.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {CATEGORY_LABELS[chore.category as keyof typeof CATEGORY_LABELS] ?? chore.category}
                      {assignments.length > 0 && (
                        <span className="ml-2">
                          · Assigned to{" "}
                          {assignments
                            .map((a) => {
                              const child = Array.isArray(a.child_profiles)
                                ? a.child_profiles[0] ?? null
                                : a.child_profiles
                              return child?.name ?? "unknown"
                            })
                            .join(", ")}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="w-8 h-8">
                      <Link href={`/parent/chores/${chore.id}/edit`}>
                        <Pencil className="w-4 h-4" />
                      </Link>
                    </Button>
                    <DeleteChoreButton choreId={chore.id} choreTitle={chore.title} />
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
