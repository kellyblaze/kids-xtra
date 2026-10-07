import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { toCsv } from "@/lib/csv"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("parent_profiles")
    .select("family_id")
    .eq("id", user.id)
    .single()
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

  const url = new URL(request.url)
  const fromParam = url.searchParams.get("from") ?? ""
  const toParam = url.searchParams.get("to") ?? ""

  const fromDate = new Date(fromParam)
  const toDate = new Date(toParam)
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 })
  }
  if (fromDate > toDate) {
    return NextResponse.json({ error: "from must be before to" }, { status: 400 })
  }
  const rangeDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
  if (rangeDays > 366) {
    return NextResponse.json({ error: "Range cannot exceed 366 days" }, { status: 400 })
  }

  const toExclusive = new Date(toDate)
  toExclusive.setDate(toExclusive.getDate() + 1)

  const { data: logs } = await supabase
    .from("activity_logs")
    .select("created_at, event_type, metadata, child_profiles(name)")
    .eq("family_id", profile.family_id)
    .gte("created_at", fromDate.toISOString())
    .lt("created_at", toExclusive.toISOString())
    .order("created_at")
    .limit(10000)

  const headers = ["date", "child", "event", "mission_title", "credits", "reward_title", "note"]
  const rows = (logs ?? []).map((log) => {
    const child = Array.isArray(log.child_profiles) ? log.child_profiles[0] : log.child_profiles
    const meta = (log.metadata ?? {}) as Record<string, string>
    return [
      new Date(log.created_at).toISOString().slice(0, 10),
      child?.name ?? "",
      log.event_type,
      meta.mission_title ?? meta.chore_title ?? "",
      meta.credits ?? "",
      meta.reward_title ?? "",
      meta.note ?? "",
    ]
  })

  const csv = toCsv(headers, rows)
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="activity-${fromParam}-to-${toParam}.csv"`,
    },
  })
}
