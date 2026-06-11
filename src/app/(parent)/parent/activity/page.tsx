export const dynamic = "force-dynamic"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/shared/EmptyState"
import { AVATAR_EMOJI } from "@/lib/constants"
import { Activity } from "lucide-react"

export default async function ActivityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("parent_profiles")
    .select("family_id")
    .eq("id", user.id)
    .single()
  if (!profile) redirect("/login")

  const { data: logs } = await supabase
    .from("activity_logs")
    .select(`
      id, created_at, event_type, metadata,
      child_profiles(name, avatar_key)
    `)
    .eq("family_id", profile.family_id)
    .order("created_at", { ascending: false })
    .limit(100)

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Activity</h1>
        <p className="text-muted-foreground text-sm mt-1">Recent family activity — last 100 events</p>
      </div>

      {!logs?.length ? (
        <EmptyState
          icon={Activity}
          title="No activity yet"
          description="Chore completions, reward redemptions, and credit changes will appear here."
        />
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const child = Array.isArray(log.child_profiles)
              ? log.child_profiles[0]
              : log.child_profiles
            const emoji = AVATAR_EMOJI[child?.avatar_key ?? "star"] ?? "⭐"
            const date = new Date(log.created_at)
            const dateStr = date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
            const timeStr = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })

            return (
              <Card key={log.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-3 flex items-start gap-3">
                  {child ? (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-base shrink-0">
                      {emoji}
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Activity className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {child && (
                      <span className="text-xs font-semibold text-primary mr-1.5">{child.name}</span>
                    )}
                    <span className="text-sm">
                      {(log.metadata as Record<string, string> | null)?.chore_title
                        ?? (log.metadata as Record<string, string> | null)?.reward_title
                        ?? log.event_type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">{dateStr}</p>
                    <p className="text-xs text-muted-foreground">{timeStr}</p>
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
