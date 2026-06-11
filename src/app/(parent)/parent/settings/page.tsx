export const dynamic = "force-dynamic"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { FamilySettingsForm } from "@/components/parent/FamilySettingsForm"

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("parent_profiles")
    .select("family_id, display_name")
    .eq("id", user.id)
    .single()
  if (!profile) redirect("/login")

  const { data: family } = await supabase
    .from("families")
    .select("id, name")
    .eq("id", profile.family_id)
    .single()

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your family account</p>
      </div>

      <FamilySettingsForm
        familyId={profile.family_id}
        familyName={family?.name ?? ""}
        displayName={profile.display_name ?? ""}
        email={user.email ?? ""}
      />
    </div>
  )
}
