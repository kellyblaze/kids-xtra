import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { authorizeChildAccess } from "@/lib/kid-authorization"
import {
  CHORE_PHOTO_BUCKET,
  CHORE_PHOTO_MAX_BYTES,
  getChorePhotoExtension,
  hasValidImageSignature,
} from "@/lib/chore-photos"
import { isSameOriginRequest } from "@/lib/request-security"

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 })
  }

  const form = await request.formData()
  const childId = (form.get("childId") as string | null)?.trim() ?? ""
  const file = form.get("file")

  if (!childId || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing childId or file" }, { status: 400 })
  }

  const authorization = await authorizeChildAccess(childId)
  if (!authorization) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 })
  }

  if (file.size === 0 || file.size > CHORE_PHOTO_MAX_BYTES) {
    return NextResponse.json({ error: "Photo must be under 5MB" }, { status: 413 })
  }

  const extension = getChorePhotoExtension(file.type)
  if (!extension) {
    return NextResponse.json({ error: "Only JPEG, PNG, or WebP images are allowed" }, { status: 415 })
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!hasValidImageSignature(bytes, file.type)) {
    return NextResponse.json({ error: "The uploaded file is not a valid image" }, { status: 415 })
  }

  const filename = `${authorization.familyId}/${childId}/${crypto.randomUUID()}.${extension}`

  const admin = createAdminClient()
  const { error } = await admin.storage.from(CHORE_PHOTO_BUCKET).upload(filename, bytes, {
    contentType: file.type,
    upsert: false,
  })

  if (error) {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }

  return NextResponse.json({ path: filename })
}
