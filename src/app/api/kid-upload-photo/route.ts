import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { authorizeChildAccess } from "@/lib/kid-authorization"

export async function POST(request: NextRequest) {
  const form = await request.formData()
  const childId = (form.get("childId") as string | null)?.trim() ?? ""
  const file = form.get("file") as File | null

  if (!childId || !file) {
    return NextResponse.json({ error: "Missing childId or file" }, { status: 400 })
  }

  const authorization = await authorizeChildAccess(childId)
  if (!authorization) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 })
  }

  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "Photo must be under 20MB" }, { status: 413 })
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, WebP, or GIF images are allowed" }, { status: 415 })
  }

  const filename = `${authorization.familyId}/${childId}/${Date.now()}.jpg`

  const admin = createAdminClient()
  const { error } = await admin.storage.from("chore-photos").upload(filename, file, {
    contentType: "image/jpeg",
    upsert: false,
  })

  if (error) {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }

  const { data } = admin.storage.from("chore-photos").getPublicUrl(filename)
  return NextResponse.json({ url: data.publicUrl })
}
