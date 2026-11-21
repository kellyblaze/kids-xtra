import { NextRequest, NextResponse } from "next/server"
import { authorizeCronRequest } from "@/lib/cron-auth"
import { createAdminClient } from "@/lib/supabase/admin"

const CHILD_RETENTION_DAYS = 90
const ACTIVITY_LOG_RETENTION_DAYS = 365

export async function GET(request: NextRequest) {
  const authError = authorizeCronRequest(request)
  if (authError) return authError

  const admin = createAdminClient()
  const results: Record<string, number | string> = {}

  // Hard-delete child profiles soft-deleted more than 90 days ago (COPPA §312.10)
  const childCutoff = new Date(Date.now() - CHILD_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const { data: expiredChildren, error: childFetchError } = await admin
    .from("child_profiles")
    .select("id, photo_url")
    .not("deleted_at", "is", null)
    .lt("deleted_at", childCutoff)

  if (childFetchError) {
    results.childProfilesError = childFetchError.message
  } else {
    // Remove Supabase Storage photos for each expired child profile
    const photoKeys = (expiredChildren ?? [])
      .map((c) => {
        if (!c.photo_url) return null
        try {
          const url = new URL(c.photo_url as string)
          const parts = url.pathname.split("/object/public/")
          if (parts.length < 2) return null
          const [bucket, ...rest] = parts[1].split("/")
          return { bucket, path: rest.join("/") }
        } catch {
          return null
        }
      })
      .filter((x): x is { bucket: string; path: string } => x !== null)

    for (const { bucket, path } of photoKeys) {
      await admin.storage.from(bucket).remove([path]).catch(() => null)
    }

    const expiredIds = (expiredChildren ?? []).map((c) => c.id)
    if (expiredIds.length > 0) {
      const { error: deleteError } = await admin
        .from("child_profiles")
        .delete()
        .in("id", expiredIds)
      results.childProfilesDeleted = deleteError ? `error: ${deleteError.message}` : expiredIds.length
    } else {
      results.childProfilesDeleted = 0
    }
  }

  // Purge activity_logs older than 1 year
  const logCutoff = new Date(Date.now() - ACTIVITY_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const { error: logError, count: logsDeleted } = await admin
    .from("activity_logs")
    .delete({ count: "exact" })
    .lt("created_at", logCutoff)

  results.activityLogsDeleted = logError ? `error: ${logError.message}` : (logsDeleted ?? 0)

  return NextResponse.json({ ok: true, results })
}
