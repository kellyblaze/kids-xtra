"use server"

import { Resend } from "resend"
import { createClient } from "@/lib/supabase/server"

const resend = new Resend(process.env.RESEND_API_KEY)

interface ActivitySummary {
  childId: string
  childName: string
  choresCompleted: number
  creditsEarned: number
  currentStreak: number
  rewardsRedeemed: number
}

export async function sendWeeklyFamilyReport(): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { success: false, error: "Email service not configured" }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  const { data: profile } = await supabase
    .from("parent_profiles")
    .select("family_id, email, display_name")
    .eq("id", user.id)
    .single()
  if (!profile) return { success: false, error: "Profile not found" }

  const { data: family } = await supabase
    .from("families")
    .select("id, name")
    .eq("id", profile.family_id)
    .single()
  if (!family) return { success: false, error: "Family not found" }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: activities } = await supabase
    .from("activity_logs")
    .select("child_id, event_type, metadata, created_at")
    .eq("family_id", profile.family_id)
    .gte("created_at", sevenDaysAgo)
    .order("created_at", { ascending: false })

  const { data: children } = await supabase
    .from("child_profiles")
    .select("id, name, credit_balance, level")
    .eq("family_id", profile.family_id)
    .eq("is_active", true)

  const { data: streaks } = await supabase
    .from("child_streaks")
    .select("child_id, current_streak")
    .eq("family_id", profile.family_id)

  const summaryMap = new Map<string, ActivitySummary>()
  children?.forEach((child) => {
    summaryMap.set(child.id, {
      childId: child.id,
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

  const summaries = Array.from(summaryMap.values()).sort((a, b) =>
    a.childName.localeCompare(b.childName),
  )

  const today = new Date()
  const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const dateRange = `${weekStart.toLocaleDateString()} - ${today.toLocaleDateString()}`

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
      <h1>Weekly Report: ${family.name}</h1>
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
    await resend.emails.send({
      from: "Kids Xtra <noreply@kids-xtra.app>",
      to: profile.email || user.email,
      subject: `${family.name} - Weekly Activity Report`,
      html: htmlBody,
    })
    return { success: true }
  } catch (error) {
    return { success: false, error: `Failed to send email: ${error instanceof Error ? error.message : "Unknown error"}` }
  }
}
