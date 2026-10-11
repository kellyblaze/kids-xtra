import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { KID_SESSION_COOKIE } from "@/lib/kid-session-constants"
import { verifyKidSession } from "@/lib/kid-session"

export const dynamic = "force-dynamic"

export default async function ChildSelectPage() {
  const token = (await cookies()).get(KID_SESSION_COOKIE)?.value
  if (token) {
    const childId = await verifyKidSession(token)
    if (childId) redirect(`/kid/${childId}/dashboard`)
  }

  redirect("/kids")
}
