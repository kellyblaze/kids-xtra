import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  CHORE_PHOTO_BUCKET,
  isAuthorizedChorePhotoPath,
} from "@/lib/chore-photos"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("parent_profiles")
    .select("family_id")
    .eq("id", user.id)
    .maybeSingle()
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const path = request.nextUrl.searchParams.get("path") ?? ""
  if (!isAuthorizedChorePhotoPath(path, profile.family_id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.storage.from(CHORE_PHOTO_BUCKET).download(path)
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return new NextResponse(data, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": "inline",
      "Content-Type": data.type || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
