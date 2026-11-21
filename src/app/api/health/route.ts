import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const ts = new Date().toISOString()
  let dbStatus: "ok" | "error" = "ok"

  try {
    const admin = createAdminClient()
    const { error } = await admin.from("families").select("id").limit(1)
    if (error) dbStatus = "error"
  } catch {
    dbStatus = "error"
  }

  const ok = dbStatus === "ok"
  return NextResponse.json(
    {
      ok,
      db: dbStatus,
      ts,
      env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    },
    {
      status: ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  )
}
