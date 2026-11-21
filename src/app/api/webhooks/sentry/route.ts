import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendAlert, type AlertPayload } from "@/lib/alerts"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const DEDUP_WINDOW_MS = 60 * 60 * 1000 // 1 hour

interface SentryIssuePayload {
  action: string
  data: {
    issue: {
      id: string
      title: string
      culprit?: string
      level: string
      firstSeen: string
      lastSeen: string
      count?: number
    }
  }
  installation?: { uuid: string }
}

export async function POST(request: Request): Promise<NextResponse> {
  const secret = process.env.SENTRY_WEBHOOK_SECRET
  if (secret) {
    const sentryHook = request.headers.get("sentry-hook-signature")
    if (!sentryHook) {
      return NextResponse.json({ error: "missing_signature" }, { status: 401 })
    }
  }

  let body: SentryIssuePayload
  try {
    body = (await request.json()) as SentryIssuePayload
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  if (body.action !== "created" && body.action !== "triggered") {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const issue = body.data?.issue
  if (!issue?.id) {
    return NextResponse.json({ error: "missing_issue" }, { status: 400 })
  }

  const fingerprint = `sentry-${issue.id}`

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from("incident_fingerprints")
    .select("last_alerted_at, alert_count")
    .eq("fingerprint", fingerprint)
    .maybeSingle()

  const now = new Date()
  if (existing) {
    const lastAlerted = new Date(existing.last_alerted_at as string)
    if (now.getTime() - lastAlerted.getTime() < DEDUP_WINDOW_MS) {
      return NextResponse.json({ ok: true, deduplicated: true })
    }
  }

  const severity = levelToSeverity(issue.level)
  const payload: AlertPayload = {
    severity,
    title: issue.title,
    service: "app",
    summary: issue.culprit ? `${issue.title} in ${issue.culprit}` : issue.title,
    firstSeen: issue.firstSeen,
    latestSeen: issue.lastSeen,
    count: Number(issue.count ?? 1),
    fingerprint,
  }

  await sendAlert(payload)

  const newCount = (existing?.alert_count as number | null ?? 0) + 1
  await admin.from("incident_fingerprints").upsert(
    { fingerprint, last_alerted_at: now.toISOString(), alert_count: newCount },
    { onConflict: "fingerprint" },
  )

  logger.info("sentry_alert_dispatched", { fingerprint, severity, count: newCount })
  return NextResponse.json({ ok: true })
}

function levelToSeverity(level: string): AlertPayload["severity"] {
  switch (level) {
    case "fatal":
      return "P0"
    case "error":
      return "P1"
    case "warning":
      return "P2"
    default:
      return "P3"
  }
}
