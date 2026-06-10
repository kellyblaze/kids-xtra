import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export const maxDuration = 300

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } },
    )

    const { data: families } = await supabase.from("families").select("id").eq("is_active", true)

    if (!families || families.length === 0) {
      return NextResponse.json({ success: true, message: "No families to process" })
    }

    const results = {
      total: families.length,
      sent: 0,
      failed: 0,
    }

    for (const family of families) {
      const { data: parents } = await supabase
        .from("parent_profiles")
        .select("user_id, email, display_name")
        .eq("family_id", family.id)
        .limit(1)

      if (!parents || parents.length === 0) continue

      const parent = parents[0]

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const { data: activities } = await supabase
        .from("activity_logs")
        .select("child_id, event_type, metadata")
        .eq("family_id", family.id)
        .gte("created_at", sevenDaysAgo)

      const { data: children } = await supabase
        .from("child_profiles")
        .select("id, name")
        .eq("family_id", family.id)
        .eq("is_active", true)

      const { data: streaks } = await supabase
        .from("child_streaks")
        .select("child_id, current_streak")
        .eq("family_id", family.id)

      const summaryMap = new Map<
        string,
        { childName: string; choresCompleted: number; creditsEarned: number; currentStreak: number; rewardsRedeemed: number }
      >()

      children?.forEach((child) => {
        summaryMap.set(child.id, {
          childName: child.name,
          choresCompleted: 0,
          creditsEarned: 0,
          currentStreak: 0,
          rewardsRedeemed: 0,
        })
      })

      streaks?.forEach((streak) => {
        const summary = summaryMap.get(streak.child_id)
        if (summary) summary.currentStreak = streak.current_streak
      })

      activities?.forEach((activity) => {
        const summary = summaryMap.get(activity.child_id)
        if (!summary) return

        if (activity.event_type === "chore_approved") {
          summary.choresCompleted += 1
          const credits = parseInt((activity.metadata as Record<string, string>)?.credits ?? "0", 10)
          summary.creditsEarned += credits
        } else if (activity.event_type === "reward_approved") {
          summary.rewardsRedeemed += 1
        }
      })

      const summaries = Array.from(summaryMap.values())

      const today = new Date()
      const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      const dateRange = `${weekStart.toLocaleDateString()} - ${today.toLocaleDateString()}`

      const { data: familyData } = await supabase
        .from("families")
        .select("name")
        .eq("id", family.id)
        .single()

      const htmlBody = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; border-radius: 8px 8px 0 0; text-align: center; }
      .header h1 { margin: 0; font-size: 24px; }
      .header p { margin: 0.5rem 0 0 0; font-size: 14px; opacity: 0.9; }
      .content { background: #f9fafb; padding: 2rem; }
      .child-card { background: white; padding: 1.5rem; margin-bottom: 1rem; border-radius: 8px; border-left: 4px solid #667eea; }
      .child-name { font-size: 18px; font-weight: 600; margin-bottom: 0.5rem; }
      .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; }
      .stat { background: #f0f4ff; padding: 1rem; border-radius: 6px; text-align: center; }
      .stat-number { font-size: 24px; font-weight: 700; color: #667eea; }
      .stat-label { font-size: 12px; color: #666; margin-top: 0.25rem; text-transform: uppercase; }
      .footer { background: #f0f4ff; padding: 2rem; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #666; }
      .footer p { margin: 0.5rem 0; }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>Weekly Report: ${familyData?.name || "Family"}</h1>
      <p>${dateRange}</p>
    </div>

    <div class="content">
      ${summaries.length === 0
        ? '<p style="text-align: center; color: #999;">No activity this week yet. Encourage your children to complete chores and earn credits!</p>'
        : summaries.map((s) => `
          <div class="child-card">
            <div class="child-name">${s.childName}</div>
            <div class="stats">
              <div class="stat">
                <div class="stat-number">${s.choresCompleted}</div>
                <div class="stat-label">Chores Done</div>
              </div>
              <div class="stat">
                <div class="stat-number">${s.creditsEarned}</div>
                <div class="stat-label">Credits Earned</div>
              </div>
              <div class="stat">
                <div class="stat-number">${s.currentStreak}</div>
                <div class="stat-label">Day Streak</div>
              </div>
              <div class="stat">
                <div class="stat-number">${s.rewardsRedeemed}</div>
                <div class="stat-label">Rewards Redeemed</div>
              </div>
            </div>
          </div>
        `).join("")
      }
    </div>

    <div class="footer">
      <p>Keep up the great work! 🎉</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL || "https://kids-xtra.vercel.app"}/parent/dashboard" style="color: #667eea; text-decoration: none;">View Dashboard</a></p>
    </div>
  </body>
</html>
`

      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Kids Xtra <noreply@kids-xtra.app>",
            to: parent.email,
            subject: `${familyData?.name || "Family"} - Weekly Activity Report`,
            html: htmlBody,
          }),
        })

        if (response.ok) {
          results.sent += 1
        } else {
          results.failed += 1
        }
      } catch (error) {
        results.failed += 1
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send reports" },
      { status: 500 },
    )
  }
}
